import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Permission, Role } from '@core/models';

export interface RoleSavePayload {
  name: string;
  description?: string;
  permissionIds?: string[];
  permissionNames?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class RolesPermissionsService {
  private readonly rolesUrl = `${environment.apiUrl}/admin/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/permissions`;

  constructor(private http: HttpClient) {}

  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.permissionsUrl);
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.rolesUrl);
  }

  getRole(roleId: string): Observable<Role> {
    return this.http.get<Role>(`${this.rolesUrl}/${roleId}`);
  }

  createRole(payload: RoleSavePayload): Observable<Role> {
    return this.http.post<Role>(this.rolesUrl, payload);
  }

  updateRole(roleId: string, payload: Partial<RoleSavePayload>): Observable<Role> {
    return this.http.patch<Role>(`${this.rolesUrl}/${roleId}`, payload);
  }
}
