import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(250)
  @ApiProperty()
  email!: string;

  @MinLength(6)
  @IsNotEmpty()
  @ApiProperty()
  password!: string;
}
