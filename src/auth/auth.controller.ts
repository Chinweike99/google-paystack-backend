import { Controller, Get, Query, Res, HttpStatus, Redirect, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleAuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private googleAuthService: GoogleAuthService) {}

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google Sign-In flow' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns Google authentication URL',
    schema: {
      example: {
        google_auth_url: 'https://accounts.google.com/o/oauth2/auth?response_type=code&...'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  initiateGoogleAuth(@Res({ passthrough: true }) res: Response) {
    try {
      const authUrl = this.googleAuthService.getAuthUrl();
      
      // Return as JSON (alternative to redirect)
      return {
        google_auth_url: authUrl,
        message: 'Use this URL to authenticate with Google',
      };
    } catch (error) {
      throw new BadRequestException('Failed to generate authentication URL');
    }
  }

//   @Get('google/redirect')
//   @ApiOperation({ summary: 'Redirect to Google OAuth (Alternative to JSON response)' })
//   @Redirect()
//   redirectToGoogle() {
//     const authUrl = this.googleAuthService.getAuthUrl();
//     return { url: authUrl, statusCode: HttpStatus.FOUND };
//   }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'User authenticated successfully',
    schema: {
      example: {
        user_id: 'uuid',
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://profile_picture_url'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Missing authorization code' })
  @ApiResponse({ status: 401, description: 'Invalid authorization code' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async googleCallback(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const user = await this.googleAuthService.handleCallback(code);
      
      return {
        user_id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        message: 'Authentication successful',
      };
    } catch (error) {
      // Errors are handled in the service
      throw error;
    }
  }
}