import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class GoogleAuthService {
  private oauthClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.oauthClient = new OAuth2Client({
      clientId: this.configService.get<string>('google.clientId'),
      clientSecret: this.configService.get<string>('google.clientSecret'),
      redirectUri: this.configService.get<string>('google.callbackUrl'),
    });
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

      const redirectUri = this.configService.get<string>('google.callbackUrl');

      console.log('Google redirect URI:', this.configService.get<string>('google.callbackUrl'));

    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: redirectUri,
    });
  }

  async handleCallback(code: string): Promise<User> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      // Exchange code for tokens
      const { tokens } = await this.oauthClient.getToken(code);
      
      if (!tokens.access_token) {
        throw new UnauthorizedException('Failed to get access token from Google');
      }

      // Set credentials and get user info
      this.oauthClient.setCredentials(tokens);
      const userInfoResponse = await this.oauthClient.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });

      const userInfo = userInfoResponse.data as any;

      // Create or update user in database
      let user = await this.userRepository.findOne({
        where: { googleId: userInfo.sub },
      });

      if (user) {
        // Update existing user
        user.name = userInfo.name;
        user.picture = userInfo.picture;
        user.accessToken = tokens.access_token;
        user.refreshToken = tokens.refresh_token || user.refreshToken;
        user.emailVerified = userInfo.email_verified;
        
        user = await this.userRepository.save(user);
      } else {
        // Create new user
        user = this.userRepository.create({
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          emailVerified: userInfo.email_verified,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? undefined,
        }) ;

        user = await this.userRepository.save(user);
      }

      return user;
    } catch (error) {
      console.error('Google authentication error:', error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException('Invalid authorization code');
      }
      
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid Google credentials');
      }
      
      throw new InternalServerErrorException('Authentication failed');
    }
  }
}