import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { CreateEmployeeDto } from 'src/employee/dtos/create-employee.dto';
import { UpdateEmployeeDto } from 'src/employee/dtos/update-employee.dto';
import { Employee, Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import type { JwtPayloadType } from 'src/utils/types';
import { GetEmployeesQueryDto } from './dtos/employees-query.dto';
import { buildPaginationMeta, getPaginationParams, PaginationMeta } from 'src/common/pagination-helper';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authProvider: AuthService,
    private readonly uploadsService: UploadsService,
  ) {}

  //
  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const existingNationalId = await this.prisma.employee.findUnique({ where: { nationalId: dto.nationalId } });
    if (existingNationalId) throw new ConflictException('National ID already exists');

    const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!department) throw new NotFoundException('Department not found');

    const hashedPassword = await this.authProvider.hashPassword(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
        },
      });

      const employee = await tx.employee.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          nationalId: dto.nationalId,
          phone: dto.phone,
          photo: dto.photo,
          jobTitle: dto.jobTitle,
          hireDate: new Date(dto.hireDate),
          contractType: dto.contractType,
          baseSalary: dto.baseSalary,
          bankAccount: dto.bankAccount,
          emergencyContact: dto.emergencyContact,
          departmentId: dto.departmentId,
          userId: user.id,
        },
      });

      return employee;
    });
  }

  //
  async updateEmployee(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (!dto || Object.keys(dto).length === 0) throw new BadRequestException('No data provided to update');

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!department) throw new BadRequestException('Department not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          nationalId: dto.nationalId,
          phone: dto.phone,
          photo: dto.photo,
          jobTitle: dto.jobTitle,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          contractType: dto.contractType,
          baseSalary: dto.baseSalary,
          bankAccount: dto.bankAccount,
          emergencyContact: dto.emergencyContact,
          departmentId: dto.departmentId,
        },
      });

      if (dto.email || dto.role) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            email: dto.email,
            role: dto.role,
          },
        });
      }

      return employee;
    });
  }

  //
  async getEmployees(query: GetEmployeesQueryDto): Promise<{ data: Employee[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20, departmentId, status } = query;

    const where: Prisma.EmployeeWhereInput = {
      status: status ?? { not: 'TERMINATED' },
      ...(departmentId && { departmentId }),
    };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take,

        include: {
          user: {
            select: {
              email: true,
              role: true,
              isActive: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
      }),

      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(count, page, limit),
    };
  }

  //
  async getEmployee(id: string, currentUser: JwtPayloadType): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            isActive: true,
          },
        },

        department: {
          select: {
            name: true,
            managerId: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    if (currentUser.role === 'MANAGER') {
      const managerEmployee = await this.prisma.employee.findUnique({ where: { userId: currentUser.sub } });

      if (!managerEmployee || managerEmployee.id !== employee.department?.managerId)
        throw new ForbiddenException('You are not authorized to view this employee');
    }

    return employee;
  }

  //
  async removeEmployee(id: string): Promise<{ message: string }> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          status: 'TERMINATED',
        },
      });

      await tx.user.update({
        where: { id: employee.userId },
        data: {
          isActive: false,
        },
      });

      return { message: 'Employee terminated successfully' };
    });
  }

  //
  async updateEmployeePhoto(id: string, photoUrl: string, currentUser: JwtPayloadType) {
    const employee = await this.getEmployee(id, currentUser);

    // self check if role is EMPLOYEE
    if (currentUser.role === 'EMPLOYEE') {
      const selfEmployee = await this.prisma.employee.findUnique({ where: { userId: currentUser.sub } });
      if (!selfEmployee || selfEmployee.id !== id) {
        throw new ForbiddenException('You can only update your own photo');
      }
    }

    if (employee.photo) {
      await this.uploadsService.deleteFile(employee.photo);
    }

    return this.prisma.employee.update({
      where: { id },
      data: { photo: photoUrl },
    });
  }

  async getEmployeeByUser(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');

    return employee;
  }
}
