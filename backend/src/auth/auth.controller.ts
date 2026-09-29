import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.login(dto);

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { message: 'Login successful' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    return { message: 'Logout successful' };
  }
}
/*
{
  "email": "admin@hr.com",
  "password": "M7moud_111"
}
{
    "email": "ahmed.mostafa@hr.com",
    "password": "Ahmed@123"
}
{
    "email": "akram.gaber@manager.com",
    "password": "Akram@123"
}
{
    "email": "mahmoud.hr@hr.com",
    "password": "Password123!"
}
{
    "email": "omar.nabil@hr.com",
    "password": "Password123!"
}
{
    "email": "yasmin.manager@manager.com",
    "password": "Password123!"
}
*/
