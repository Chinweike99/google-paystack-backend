import { IsNotEmpty, IsNumber, IsOptional, IsUUID, IsObject } from 'class-validator';

export class InitializePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
