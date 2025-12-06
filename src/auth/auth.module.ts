import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { GoogleAuthService } from './auth.service';
import databaseConfig from 'src/config/database.config';
import googleConfig from 'src/config/google.config';
import paystackConfig from 'src/config/paystack.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, googleConfig, paystackConfig],
    }),

    TypeOrmModule.forFeature([User]),
    // ConfigModule,
  ],
  controllers: [AuthController],
  providers: [GoogleAuthService],
  exports: [GoogleAuthService],
})
export class AuthModule {}