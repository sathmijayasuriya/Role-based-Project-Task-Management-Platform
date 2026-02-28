import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { Role, UserStatus } from '@core/models';
import { RolesPermissionsService } from '@features/admin/data-access/roles-permissions.service';
import {
  AdminUserResponse,
  AdminUsersService,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../../data-access/admin-users.service';
import {
  TeamMemberFormComponent,
  TeamMemberFormValue,
} from '../team-member-form/team-member-form.component';

interface TeamUser {
  id: string;
  firstName: string; 
  lastName: string;  
  email: string;
  phone?: string;
  status: UserStatus;
  profilePictureUrl?: string;
  lastLoginAt?: string;
  createdAt?: string;
  roles: Role[];
  isEmailVerified: boolean;
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    TeamMemberFormComponent,
  ],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.scss'],
})
export class TeamListComponent implements OnInit {
  private usersApi = inject(AdminUsersService);
  private rolesApi = inject(RolesPermissionsService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly UserStatus = UserStatus;

  users = signal<TeamUser[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal<string | null>(null);

  searchTerm = signal('');
  statusFilter = signal<UserStatus | 'all'>('all');
  roleFilter = signal<string>('all');
  expandedUserId = signal<string | null>(null);
  selectedIds = signal<Set<string>>(new Set());
  filtersOpen = signal(false);
  canManageUsers = computed(() => this.authService.isAdmin?.() ?? false);

  showForm = signal(false);
  formMode = signal<'create' | 'edit'>('create');
  editingUser = signal<TeamMemberFormValue | null>(null);

  filteredUsers = computed(() => this.applyFilters());
  selectedCount = computed(() => this.selectedIds().size);
  allSelected = computed(
    () =>
      this.filteredUsers().length > 0 &&
      this.filteredUsers().every((user) => this.selectedIds().has(user.id)),
  );
  deactivatingIds = signal<Set<string>>(new Set());

  isSystemAdmin(user: TeamUser): boolean {
    // Check if user is system admin by email (typically admin@example.com)
    const systemAdminEmails = ['admin@example.com'];
    if (systemAdminEmails.includes(user.email.toLowerCase())) {
      return true;
    }
    // Check if user has admin role and is likely the first/primary admin
    const hasAdminRole = (user.roles || []).some(
      (role) => role.name?.toLowerCase() === 'admin',
    );
    // Additional check: if email contains 'admin' and has admin role
    if (hasAdminRole && user.email.toLowerCase().includes('admin')) {
      return true;
    }
    return false;
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadUsers(), this.loadRoles()]);
    
    // Check if we should auto-open create form (e.g., from /admin/users/create)
    const url = this.router.url;
    if (url.includes('/create')) {
      this.openCreate();
      // Clean up URL by removing /create
      const cleanUrl = url.replace('/create', '');
      if (cleanUrl !== url) {
        this.router.navigate([cleanUrl], { replaceUrl: true }).catch(() => {});
      }
    }
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.usersApi.list());
      const mapped = response.map((user) => this.mapUser(user));
      this.users.set(mapped);
      this.selectedIds.set(new Set());
      if (mapped.length === 0 && this.authService.isAdmin?.()) {
        this.expandedUserId.set(null);
      }
    } catch (error) {
      console.error('Failed to load team', error);
      this.error.set(this.errorMessage(error));
      this.users.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const roles = await firstValueFrom(this.rolesApi.listRoles());
      this.roles.set(roles ?? []);
    } catch (error) {
      console.warn('Unable to load roles for team page', error);
      this.roles.set([]);
    }
  }

  private mapUser(user: AdminUserResponse): TeamUser {
    const firstName = (user.first_name || (user as any).firstName || '').trim();
    const lastName = (user.last_name || (user as any).lastName || '').trim();
    const normalizedStatus = this.normalizeStatus(user.status as string | undefined);

    return {
      id: user.id,
      firstName: firstName || 'Unnamed',
      lastName,
      email: user.email,
      phone: user.phone || undefined,
      status: normalizedStatus,
      profilePictureUrl:
        (user as any).profile_picture_path ||
        (user as any).profile_picture_url ||
        (user as any).profilePictureUrl,
      lastLoginAt: (user.last_login_at as string | undefined) || (user as any).lastLoginAt,
      createdAt: (user.created_at as string | undefined) || (user as any).createdAt,
      roles: user.roles || [],
      isEmailVerified: Boolean(user.is_email_verified ?? (user as any).isEmailVerified ?? false),
    };
  }

  private applyFilters(): TeamUser[] {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const role = this.roleFilter().trim().toLowerCase();

    return this.users().filter((user) => {
      // Filter out system admin from the list
      if (this.isSystemAdmin(user)) {
        return false;
      }

      const matchesStatus = status === 'all' || user.status === status;

      const roleNames = (user.roles || [])
        .map((roleItem) => roleItem?.name?.toLowerCase() || '')
        .filter(Boolean);

      const matchesRole = role === 'all' || roleNames.includes(role);

      const fullName = `${user.firstName} ${user.lastName}`.trim().toLowerCase();
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone ?? '').toLowerCase().includes(query);

      return matchesStatus && matchesRole && matchesSearch;
    });
  }

  private normalizeStatus(raw?: string): UserStatus {
    const normalized = (raw || '').toLowerCase() as UserStatus;
    const valid: UserStatus[] = [
      UserStatus.ACTIVE,
      UserStatus.INACTIVE,
      UserStatus.PENDING,
      UserStatus.BANNED,
    ];
    return valid.includes(normalized) ? normalized : UserStatus.ACTIVE;
  }

  toggleExpand(userId: string, event?: Event): void {
    event?.stopPropagation();
    this.expandedUserId.update((current) => (current === userId ? null : userId));
  }

  toggleSelection(userId: string, event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    const updated = new Set(this.selectedIds());
    if (checked) {
      updated.add(userId);
    } else {
      updated.delete(userId);
    }
    this.selectedIds.set(updated);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(new Set(this.filteredUsers().map((user) => user.id)));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  openCreate(): void {
    this.formMode.set('create');
    this.editingUser.set(null);
    this.showForm.set(true);
    this.filtersOpen.set(false);
  }

  openEdit(user: TeamUser, event?: Event): void {
    event?.stopPropagation();
    this.formMode.set('edit');

    this.editingUser.set({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roleNames: (user.roles || [])
        .map((role) => role.name)
        .filter((name): name is string => !!name),
    });

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
  }

  async handleSave(form: TeamMemberFormValue): Promise<void> {
    this.isSaving.set(true);
    this.error.set(null);

    try {
      const basePayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        status: form.status,
        roleNames: form.roleNames,
      };

      let saved: AdminUserResponse | null = null;

      if (this.formMode() === 'create') {
        const payload: CreateAdminUserRequest = {
          ...basePayload,
        } as CreateAdminUserRequest;

        saved = await firstValueFrom(this.usersApi.create(payload));
      } else if (form.id) {
        const payload: UpdateAdminUserRequest = {
          ...basePayload,
        };

        saved = await firstValueFrom(this.usersApi.update(form.id, payload));
      }

      if (saved) {
        const mapped = this.mapUser(saved);
        if (this.formMode() === 'create') {
          this.users.set([mapped, ...this.users()]);
        } else {
          this.users.set(this.users().map((u) => (u.id === mapped.id ? mapped : u)));
        }
      }

      this.closeForm();
    } catch (error) {
      console.error('Failed to save user', error);
      this.error.set('Unable to save user. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deactivateUser(user: TeamUser, event?: Event): Promise<void> {
    event?.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to deactivate this user?');
    if (!confirmed) return;

    if (this.deactivatingIds().has(user.id)) return;

    this.error.set(null);
    this.deactivatingIds.update((current) => new Set(current).add(user.id));

    try {
      const response = await firstValueFrom(this.usersApi.deactivate(user.id));
      const mapped = this.mapUser(response);
      this.users.set(this.users().map((u) => (u.id === mapped.id ? mapped : u)));
      await this.loadUsers();
      this.snackBar.open('User deactivated', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Failed to deactivate user', error);
      this.error.set('Unable to deactivate user. Please try again.');
      this.snackBar.open('Failed to deactivate user', 'Close', { duration: 4000 });
    } finally {
      this.deactivatingIds.update((current) => {
        const next = new Set(current);
        next.delete(user.id);
        return next;
      });
    }
  }

  statusLabel(status: UserStatus): string {
    const labels: Record<UserStatus, string> = {
      [UserStatus.ACTIVE]: 'Active',
      [UserStatus.INACTIVE]: 'Inactive',
      [UserStatus.PENDING]: 'Pending',
      [UserStatus.BANNED]: 'Banned',
    };
    return labels[status] ?? 'Active';
  }

  statusClass(status: UserStatus): string {
    if (status === UserStatus.ACTIVE) return 'active';
    if (status === UserStatus.PENDING) return 'pending';
    if (status === UserStatus.BANNED) return 'banned';
    return 'inactive';
  }

  roleLabel(user: TeamUser): string {
    const roleNames = (user.roles || []).map((role) => role.name).filter(Boolean);
    if (!roleNames.length) return 'Unassigned';
    if (roleNames.length === 1) return roleNames[0] as string;
    return `${roleNames[0]} +${roleNames.length - 1}`;
  }

  fullName(user: TeamUser): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  initials(user: TeamUser): string {
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    return (first + last || 'U').toUpperCase();
  }

  formattedDate(value?: string): string {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString('en-GB');
  }

  private errorMessage(error: any): string {
    if (error?.status === 403 || error?.status === 401) {
      return 'You do not have permission to view team members.';
    }
    return 'Unable to load team members right now.';
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }
}
