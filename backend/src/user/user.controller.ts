import type { JwtPayloadType } from 'src/utils/types';
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiCookieAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiTags('User')
@ApiCookieAuth('token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() payload: JwtPayloadType) {
    return { user: { ...payload } };
  }
}
