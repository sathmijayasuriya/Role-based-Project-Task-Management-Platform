import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface TaskSubtask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface TaskResponse {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  priority?: string | null;
  status: string;
  progress_percent?: number | string;
  due_date?: string | null;
  start_date?: string | null;
  assigned_to?: string | null;
  subtasks?: TaskSubtask[];
}

export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  startDate?: string;
  assigneeId?: string;
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  position?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly API_URL = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(this.API_URL);
  }

  getTasksByProject(projectId: string): Observable<TaskResponse[]> {
    return this.getTasks().pipe(map((tasks) => tasks.filter((task) => task.project_id === projectId)));
  }

  createTask(dto: CreateTaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(this.API_URL, dto);
  }

  updateTask(id: string, dto: UpdateTaskRequest): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.API_URL}/${id}`, dto);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
