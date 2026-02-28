import { IsUUID } from 'class-validator';

export class AddTaskTagDto {
  @IsUUID()
  tagId: string;
}
