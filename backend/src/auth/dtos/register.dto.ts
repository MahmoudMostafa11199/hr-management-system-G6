import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from 'src/generated/prisma/enums';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty()
  password!: string;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role!: Role;
}
