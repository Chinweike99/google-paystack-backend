import { Injectable, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';

interface InitializeTransactionDto {
  email: string;
  amount: number;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface TransactionVerificationResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    metadata?: Record<string, any>;
  };
}

@Injectable()
export class PaystackService {
  private axiosInstance: AxiosInstance;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.configService.get<string>('paystack.apiUrl'),
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('paystack.secretKey')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initializeTransaction(
    userId: string,
    amount: number,
    metadata?: Record<string, any>,
  ) {
    // Validate user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate amount (minimum 100 kobo = ₦1)
    if (amount < 100) {
      throw new BadRequestException('Amount must be at least 100 kobo (₦1)');
    }

    // Check for existing pending transaction for idempotency
    const existingTransaction = await this.transactionRepository.findOne({
      where: {
        userId,
        amount,
        status: TransactionStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingTransaction) {
      return {
        reference: existingTransaction.reference,
        authorization_url: `${this.configService.get<string>('paystack.callbackUrl')}?reference=${existingTransaction.reference}`,
        message: 'Transaction already initialized',
      };
    }

    try {
      const payload: InitializeTransactionDto = {
        email: user.email,
        amount,
        callback_url: this.configService.get<string>('paystack.callbackUrl'),
        metadata: {
          userId,
          ...metadata,
        },
      };

      const response = await this.axiosInstance.post('/transaction/initialize', payload);
      
      if (response.data.status && response.data.data) {
        const { reference, authorization_url } = response.data.data;

        // Save transaction record
        const transaction = this.transactionRepository.create({
          reference,
          amount: amount / 100, // Convert kobo to Naira for storage
          status: TransactionStatus.PENDING,
          userId,
          metadata: payload.metadata,
        });

        await this.transactionRepository.save(transaction);

        return {
          reference,
          authorization_url,
          message: 'Transaction initialized successfully',
        };
      } else {
        throw new InternalServerErrorException('Failed to initialize transaction');
      }
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(error.response.data.message || 'Invalid transaction data');
      }
      
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await this.axiosInstance.get<TransactionVerificationResponse>(
        `/transaction/verify/${reference}`,
      );

      if (response.data.status && response.data.data) {
        const transactionData = response.data.data;
        
        // Update transaction status
        const transaction = await this.transactionRepository.findOne({
          where: { reference },
        });

        if (transaction) {
          transaction.status = this.mapPaystackStatus(transactionData.status);
          transaction.channel = transactionData.channel;
          transaction.currency = transactionData.currency;
          transaction.paidAt = transactionData.paid_at ? new Date(transactionData.paid_at) : null;
          transaction.gatewayResponse = response.data.message;
          
          await this.transactionRepository.save(transaction);
        }

        return transactionData;
      }
      
      throw new InternalServerErrorException('Transaction verification failed');
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new BadRequestException('Transaction not found');
      }
      
      throw new InternalServerErrorException('Failed to verify transaction');
    }
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const webhookSecret = this.configService.get<string>('paystack.webhookSecret');
    const crypto = require('crypto');
    
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      await this.updateTransactionStatus(
        data.reference,
        TransactionStatus.SUCCESS,
        data,
      );
    } else if (event === 'charge.failed') {
      await this.updateTransactionStatus(
        data.reference,
        TransactionStatus.FAILED,
        data,
      );
    }

    return { status: true };
  }

  private async updateTransactionStatus(
    reference: string,
    status: TransactionStatus,
    data: any,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (transaction) {
      transaction.status = status;
      transaction.channel = data.channel;
      transaction.currency = data.currency;
      transaction.paidAt = data.paid_at ? new Date(data.paid_at) : null;
      transaction.gatewayResponse = data.gateway_response;
      transaction.metadata = data.metadata;
      
      await this.transactionRepository.save(transaction);
    }
  }

  private mapPaystackStatus(paystackStatus: string): TransactionStatus {
    switch (paystackStatus) {
      case 'success':
        return TransactionStatus.SUCCESS;
      case 'failed':
        return TransactionStatus.FAILED;
      case 'abandoned':
        return TransactionStatus.ABANDONED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  async getTransactionStatus(reference: string, refresh: boolean = false) {
    let transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['user'],
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    // Refresh status from Paystack if requested
    if (refresh || transaction.status === TransactionStatus.PENDING) {
      try {
        const paystackData = await this.verifyTransaction(reference);
        
        // Update transaction with latest data
        transaction.status = this.mapPaystackStatus(paystackData.status);
        transaction.paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : null;
        await this.transactionRepository.save(transaction);
      } catch (error) {
        // If verification fails, continue with stored status
        console.warn('Failed to refresh transaction status:', error.message);
      }
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100, // Convert back to kobo
      paid_at: transaction.paidAt,
      currency: transaction.currency,
      channel: transaction.channel,
      user: {
        email: transaction.user?.email,
        name: transaction.user?.name,
      },
      metadata: transaction.metadata,
    };
  }
}