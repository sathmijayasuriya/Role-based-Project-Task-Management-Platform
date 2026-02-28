import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ProjectClient {
  id: string;
  name: string;
  email?: string | null;
  contact_person_name?: string | null;
  logo_url?: string | null;
}

export interface ProjectTask {
  id: string;
  title?: string;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  project_id?: string | null;
  status: string;
  progress_percent?: number | string;
  subtasks?: ProjectSubtask[];
}

export interface ProjectSubtask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  client_id?: string | null;
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  client?: ProjectClient | null;
  tasks?: ProjectTask[];
  members?: ProjectMember[];
  created_by?: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  assigned_role?: string | null;
  joined_at?: string | Date;
  user?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  priority?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: string;
}

export interface AddProjectMemberRequest {
  userId: string;
  assignedRole?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly API_URL = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(this.API_URL);
  }

  getProject(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.API_URL}/${id}`);
  }

  createProject(dto: CreateProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.API_URL, dto);
  }

  updateProject(id: string, dto: UpdateProjectRequest): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${this.API_URL}/${id}`, dto);
  }

  addProjectMember(id: string, dto: AddProjectMemberRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/members`, dto);
  }

  removeProjectMember(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${projectId}/members/${userId}`);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
