import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import { PaystackService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User]),
    ConfigModule,
  ],
  controllers: [PaymentsController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentsModule {}