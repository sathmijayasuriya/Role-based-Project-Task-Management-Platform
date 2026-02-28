import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ProjectMemberUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  status?: string | null;
  profile_picture_path?: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  assigned_role?: string | null;
  joined_at?: string | Date;
  user?: ProjectMemberUser | null;
}

export interface AddProjectMemberRequest {
  userId: string;
  assignedRole?: string | null;
}

export interface SyncProjectMembersRequest {
  add?: string[];
  remove?: string[];
}

export interface SyncProjectMembersResponse {
  members: ProjectMember[];
}

export interface UsersSearchResponse {
  items: ProjectMemberUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectMembersService {
  private readonly PROJECTS_URL = `${environment.apiUrl}/projects`;
  private readonly USERS_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  listMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.PROJECTS_URL}/${projectId}/members`);
  }

  syncMembers(
    projectId: string,
    dto: SyncProjectMembersRequest,
  ): Observable<SyncProjectMembersResponse> {
    return this.http.post<SyncProjectMembersResponse>(
      `${this.PROJECTS_URL}/${projectId}/members`,
      dto,
    );
  }

  addMember(projectId: string, dto: AddProjectMemberRequest): Observable<void> {
    return this.http.post<void>(`${this.PROJECTS_URL}/${projectId}/members`, {
      add: [dto.userId],
    });
  }

  removeMember(projectId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.PROJECTS_URL}/${projectId}/members`, {
      remove: [userId],
    });
  }

  searchUsers(params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<UsersSearchResponse> {
    let httpParams = new HttpParams();
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize);
    }

    return this.http.get<UsersSearchResponse>(this.USERS_URL, { params: httpParams });
  }
}
