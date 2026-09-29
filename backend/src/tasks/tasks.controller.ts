import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import { multerOptions } from 'src/uploads/multer.config';
import { UploadsService } from 'src/uploads/uploads.service';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { CreateTaskDto } from './dtos/create-task.dto';
import { TaskQueryDto } from './dtos/task-query.dto';
import { TasksService } from './tasks.service';
import { MyTaskQueryDto } from './dtos/my-task-query.dto';
import { UpdateTaskStatusDto } from './dtos/update-task-status.dto';
import { CreateTaskCommentDto } from './dtos/create-task-comment.dto';
import { ReportQueryDto } from './dtos/report-query.dto';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Task')
@ApiCookieAuth('token')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll(@Query() query: TaskQueryDto) {
    return this.tasksService.getTasks(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FilesInterceptor('attachments', 6, multerOptions('tasks')))
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayloadType,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const attachments = files?.length
      ? files.map((f) => ({
          fileName: f.filename,
          originalName: f.originalname,
          fileUrl: this.uploadsService.getFileUrl(f),
        }))
      : [];

    return this.tasksService.createTask(dto, user, attachments);
  }

  @Get('my')
  @Roles(Role.EMPLOYEE)
  getMyTasks(@CurrentUser() user: JwtPayloadType, @Query() query: MyTaskQueryDto) {
    return this.tasksService.getMyTasks(user, query);
  }

  @Patch(':id/status')
  @Roles(Role.EMPLOYEE)
  updateStatus(@Param('id') id: string, @CurrentUser() user: JwtPayloadType, @Body() dto: UpdateTaskStatusDto) {
    return this.tasksService.changeStatus(id, user, dto);
  }

  @Post(':id/comments')
  addComments(@Param('id') id: string, @CurrentUser() user: JwtPayloadType, @Body() dto: CreateTaskCommentDto) {
    return this.tasksService.addComments(id, user.sub, dto);
  }

  @Get('report')
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  gerReport(@CurrentUser() user: JwtPayloadType, @Query() query: ReportQueryDto) {
    return this.tasksService.getReport(user, query);
  }

  @Get('performance/my')
  @Roles(Role.EMPLOYEE)
  getMyPerformance(@CurrentUser() user: JwtPayloadType, @Query() query: ReportQueryDto) {
    return this.tasksService.getPerformanceScore(user, query);
  }

  @Get('performance/:employeeId')
  @Roles(Role.MANAGER, Role.ADMIN, Role.HR)
  getEmployeePerformance(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtPayloadType,
    @Query() query: ReportQueryDto,
  ) {
    return this.tasksService.getPerformanceScore(user, query, employeeId);
  }
}
