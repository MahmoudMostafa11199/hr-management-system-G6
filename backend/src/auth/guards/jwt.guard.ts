import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = User>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Access denied, invalid or missing token');
    }

    return user;
  }
}
