import {
  IsDateString,
  IsIn,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from '../constants/task.constants';
import type { TaskPriority, TaskStatus } from '../constants/task.constants';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  @IsNumber()
  position?: number;
}
