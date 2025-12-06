import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  const config = new DocumentBuilder()
    .setTitle('Google Sign-In & Paystack API')
    .setDescription('API documentation for Google authentication and Paystack payments')
    .setVersion('1.0')
    .addTag('Authentication')
    .addTag('Payments')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Enable CORS for development
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT || 4000}`);
  console.log(`Swagger documentation: http://localhost:${process.env.PORT || 4000}/api`);
}
bootstrap();