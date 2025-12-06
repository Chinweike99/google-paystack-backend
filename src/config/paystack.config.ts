import { registerAs } from '@nestjs/config';

export default registerAs('paystack', () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  apiUrl: 'https://api.paystack.co',
}));