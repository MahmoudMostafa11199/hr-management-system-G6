import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContractType, Role } from 'src/generated/prisma/enums';

export class CreateEmployeeDto {
  // Employee
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  nationalId!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  photo?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  jobTitle!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  hireDate!: string;

  @IsEnum(ContractType)
  @IsOptional()
  @ApiProperty({ enum: ContractType, required: false })
  contractType?: ContractType;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  baseSalary!: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  departmentId?: string;

  // User
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(250)
  @ApiProperty()
  email!: string;

  @MinLength(6)
  @IsNotEmpty()
  @ApiProperty()
  password!: string;

  @IsEnum(Role)
  @ApiProperty()
  role!: Role;
}
