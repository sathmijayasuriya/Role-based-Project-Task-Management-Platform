export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export const TASK_STATUS_VALUES: TaskStatus[] = [
  'todo',
  'in_progress',
  'review',
  'completed',
  'blocked',
  'cancelled',
];

export const TASK_PRIORITY_VALUES: TaskPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];
