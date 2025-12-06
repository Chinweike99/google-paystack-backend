import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Headers, 
  Query, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  UsePipes,
  ValidationPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiHeader, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { PaystackService } from './payments.service';
import { InitializePaymentDto } from './dto/initializepay.dto';

class PaystackWebhookDto {
  event: string;
  data: any;
}

@ApiTags('Payments')
@Controller('payments')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class PaymentsController {
  constructor(private paystackService: PaystackService) {}

  @Post('paystack/initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize Paystack payment' })
  @ApiBody({
    schema: {
      example: {
        userId: 'user-uuid',
        amount: 5000,
        metadata: {
          productId: 'prod-123',
          orderId: 'order-456'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Payment initialized successfully',
    schema: {
      example: {
        reference: 'txn_123456789',
        authorization_url: 'https://checkout.paystack.com/...',
        message: 'Transaction initialized successfully'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user not found' })
  @ApiResponse({ status: 402, description: 'Payment initiation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async initiatePayment(@Body() body: InitializePaymentDto) {
    const { userId, amount, metadata } = body;
    
    if (!userId || !amount) {
      throw new BadRequestException('userId and amount are required');
    }

    return await this.paystackService.initializeTransaction(userId, amount, metadata);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature',
    required: true,
  })
  @ApiBody({ type: PaystackWebhookDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook processed successfully',
    schema: {
      example: {
        status: true
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    return await this.paystackService.handleWebhook(body, signature);
  }

  @Get(':reference/status')
  @ApiOperation({ summary: 'Check transaction status' })
  @ApiParam({ name: 'reference', description: 'Transaction reference', required: true })
  @ApiQuery({ 
    name: 'refresh', 
    description: 'Refresh status from Paystack', 
    required: false,
    type: Boolean 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction status retrieved',
    schema: {
      example: {
        reference: 'txn_123456789',
        status: 'success',
        amount: 5000,
        paid_at: '2024-01-15T10:30:00.000Z',
        currency: 'NGN',
        channel: 'card',
        user: {
          email: 'user@example.com',
          name: 'John Doe'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Transaction not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTransactionStatus(
    @Param('reference') reference: string,
    @Query('refresh') refresh: boolean = false,
  ) {
    if (!reference) {
      throw new BadRequestException('Transaction reference is required');
    }

    return await this.paystackService.getTransactionStatus(reference, refresh);
  }
}