import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department, Prisma } from 'src/generated/prisma/client';
import { GetDepartmentsQueryDto } from './dtos/department-query.dto';
import { buildPaginationMeta, getPaginationParams, PaginationMeta } from 'src/common/pagination-helper';

type DepartmentWithEmployees = Prisma.DepartmentGetPayload<{
  include: { employees: true; manager: true };
}>;

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  //
  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    if (dto.managerId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: dto.managerId } });
      if (!employee) throw new BadRequestException('Invalid managerId: employee not found');
    }

    const existing = await this.prisma.department.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Department already exists');

    return this.prisma.department.create({ data: { ...dto } });
  }

  //
  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    await this.getDepartment(id);

    if (!dto || Object.keys(dto).length === 0) throw new BadRequestException('No data provided to update');

    if (dto.managerId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: dto.managerId } });
      if (!employee) throw new BadRequestException('Invalid managerId: employee not found');
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        managerId: dto.managerId,
      },
    });
  }

  //
  async getDepartments(query: GetDepartmentsQueryDto): Promise<{ data: Department[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20, name } = query;

    const where: Prisma.DepartmentWhereInput = { ...(name && { name }) };
    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        skip,
        take,

        include: {
          manager: {
            select: {
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
          employees: {
            select: {
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    const meta = buildPaginationMeta(count, page, limit);

    return { data, meta };
  }

  //
  async getDepartment(id: string): Promise<DepartmentWithEmployees> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        employees: true,
        manager: true,
      },
    });
    if (!department) throw new NotFoundException('Department not found');

    return department;
  }

  //
  async removeDepartment(id: string): Promise<{ message: string }> {
    const department = await this.getDepartment(id);

    if (department.employees.length > 0)
      throw new ConflictException('Cannot delete department with assigned employees');

    await this.prisma.department.delete({ where: { id } });

    return { message: 'Department deleted successfully' };
  }
}
