import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';
import { JwtPayloadType } from 'src/utils/types';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.getByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.validateUser(email, password);

    const accessToken = await this.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private generateToken(payload: JwtPayloadType): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
