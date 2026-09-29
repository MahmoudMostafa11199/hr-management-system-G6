import { TaskStatus } from 'src/generated/prisma/enums';

export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TO_DO: ['IN_PROGRESS'],
  IN_PROGRESS: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['DONE', 'IN_PROGRESS'],
  DONE: ['CLOSED'],
  CLOSED: [],
};
