import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { UserStatus } from '@core/models';
import {
  AdminUserResponse,
  AdminUsersService,
} from '@features/team/data-access/admin-users.service';
import {
  ProjectResponse,
  ProjectTask,
  ProjectsService,
} from '@features/projects/data-access/projects.service';
import { TaskResponse, TasksService } from '@features/tasks/data-access/tasks.service';
import {
  ActivityLog,
  ActivityLogsService,
} from '@features/admin/data-access/activity-logs.service';

interface AdminStatCard {
  key: 'users' | 'projects' | 'tasks' | 'health';
  title: string;
  value: string | number;
  helper?: string;
  icon: string;
  color: string;
}

interface DashboardUserRow {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  roleKey: string;
  statusLabel: string;
  statusKey: string;
  joined: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  icon: string;
  color: string;
}

type DashboardTask = TaskResponse | ProjectTask;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private usersApi = inject(AdminUsersService);
  private projectsApi = inject(ProjectsService);
  private tasksApi = inject(TasksService);
  private activityLogsApi = inject(ActivityLogsService);
  private authService = inject(AuthService);

  adminStats = signal<AdminStatCard[]>([]);
  recentUsers = signal<DashboardUserRow[]>([]);
  activityFeed = signal<ActivityItem[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  canManageUsers = computed(() => this.authService.isAdmin?.() ?? false);

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async refresh(): Promise<void> {
    await this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [usersResult, projectsResult, tasksResult, activityResult] = await Promise.allSettled([
        firstValueFrom(this.usersApi.list()),
        firstValueFrom(this.projectsApi.getProjects()),
        firstValueFrom(this.tasksApi.getTasks()),
        firstValueFrom(this.activityLogsApi.getActivityLogs({ pageSize: 12 })),
      ]);

      const users =
        usersResult.status === 'fulfilled'
          ? usersResult.value
          : (this.handlePartialError(usersResult.reason), []);
      const projects =
        projectsResult.status === 'fulfilled'
          ? projectsResult.value
          : (this.handlePartialError(projectsResult.reason), []);

      const tasksFromApi =
        tasksResult.status === 'fulfilled'
          ? tasksResult.value
          : (this.handlePartialError(tasksResult.reason), []);

      const activityLogs =
        activityResult.status === 'fulfilled'
          ? activityResult.value.items ?? []
          : (this.handlePartialError(activityResult.reason), []);

      const tasks = tasksFromApi.length ? tasksFromApi : this.flattenProjectTasks(projects);

      this.recentUsers.set(this.mapRecentUsers(users));
      this.adminStats.set(this.buildStatCards(users, projects, tasks));
      this.activityFeed.set(this.mapActivityLogs(activityLogs));

      if (!users.length && !projects.length && !tasks.length && !activityLogs.length) {
        this.error.set('Unable to load admin overview right now.');
      }
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
      this.error.set('Unable to load admin overview right now.');
      this.adminStats.set([]);
      this.recentUsers.set([]);
      this.activityFeed.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapRecentUsers(users: AdminUserResponse[]): DashboardUserRow[] {
    return [...users]
      .filter((user) => !this.isSystemAdmin(user))
      .sort((a, b) => {
        const aDate = this.parseDate((a as any).created_at ?? (a as any).createdAt);
        const bDate = this.parseDate((b as any).created_at ?? (b as any).createdAt);
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      })
      .slice(0, 6)
      .map((user) => this.mapUser(user));
  }

  private isSystemAdmin(user: AdminUserResponse): boolean {
    // Check if user is system admin by email (typically admin@example.com)
    const systemAdminEmails = ['admin@example.com'];
    if (systemAdminEmails.includes(user.email.toLowerCase())) {
      return true;
    }
    // Check if user has admin role and email contains 'admin'
    const hasAdminRole = (user.roles || []).some(
      (role) => role.name?.toLowerCase() === 'admin',
    );
    if (hasAdminRole && user.email.toLowerCase().includes('admin')) {
      return true;
    }
    return false;
  }

  private mapUser(user: AdminUserResponse): DashboardUserRow {
    const firstName = (user.first_name || (user as any).firstName || '').trim();
    const lastName = (user.last_name || (user as any).lastName || '').trim();
    const name = `${firstName} ${lastName}`.trim() || user.email || 'User';
    const status = this.normalizeUserStatus(user.status as string | undefined);
    const joinedDate = this.parseDate((user as any).created_at ?? (user as any).createdAt);
    const primaryRole = this.primaryRole(user);
    const roleKey = this.normalizeRoleKey(primaryRole);

    return {
      id: user.id,
      name,
      email: user.email,
      roleLabel: this.titleCase(primaryRole),
      roleKey,
      statusLabel: this.statusLabel(status),
      statusKey: status,
      joined: joinedDate ? joinedDate.toLocaleDateString('en-GB') : 'N/A',
    };
  }

  private buildStatCards(
    users: AdminUserResponse[],
    projects: ProjectResponse[],
    tasks: DashboardTask[],
  ): AdminStatCard[] {
    const activeUsers = users.filter(
      (user) => this.normalizeUserStatus(user.status as string | undefined) === UserStatus.ACTIVE,
    ).length;
    const pendingUsers = users.filter(
      (user) => this.normalizeUserStatus(user.status as string | undefined) === UserStatus.PENDING,
    ).length;
    const adminUsers = users.filter((user) => this.hasRole(user, 'admin')).length;

    const normalizedProjects = projects.map((project) => this.normalizeProject(project));
    const activeProjects = normalizedProjects.filter((project) => project.status === 'active').length;
    const completedProjects = normalizedProjects.filter(
      (project) => project.status === 'completed',
    ).length;
    const onHoldProjects = normalizedProjects.filter((project) => project.status === 'on_hold').length;

    const normalizedTasks = tasks.map((task) => this.normalizeTask(task));
    const totalTasks = normalizedTasks.length;
    const completedTasks = normalizedTasks.filter((task) => task.status === 'completed').length;
    const openTasks = normalizedTasks.filter(
      (task) => task.status !== 'completed' && task.status !== 'cancelled',
    ).length;
    const overdueTasks = this.countOverdueTasks(normalizedTasks);
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const healthScore = this.calculateHealthScore(
      completionRate,
      overdueTasks,
      totalTasks,
      onHoldProjects,
      normalizedProjects.length,
    );

    return [
      {
        key: 'users',
        title: 'Team members',
        value: users.length,
        helper: `${activeUsers} active | ${pendingUsers} pending | ${adminUsers} admins`,
        icon: 'people',
        color: '#f16363ff',
      },
      {
        key: 'projects',
        title: 'Projects',
        value: normalizedProjects.length,
        helper: `${activeProjects} active | ${completedProjects} completed`,
        icon: 'folder',
        color: '#10B981',
      },
      {
        key: 'tasks',
        title: 'Open tasks',
        value: openTasks,
        helper: `${completedTasks} done | ${overdueTasks} overdue`,
        icon: 'task_alt',
        color: '#fbbc4dff',
      },
      {
        key: 'health',
        title: 'Delivery health',
        value: `${healthScore}%`,
        helper: `${completionRate}% completion rate`,
        icon: 'monitor_heart',
        color: '#f65ca9ff',
      },
    ];
  }

  private mapActivityLogs(logs: ActivityLog[]): ActivityItem[] {
    return logs.slice(0, 10).map((log) => {
      const actor = this.resolveActor(log);
      const subject = this.resolveSubject(log);
      const { icon, color, verb } = this.activityVisuals(log.action);
      const text = log.action.toUpperCase() === 'LOGIN' ? `${actor} logged in` : `${actor} ${verb} ${subject}`;

      return {
        id: log.id,
        text,
        time: this.relativeTime(this.parseDate(log.created_at)),
        icon,
        color,
      };
    });
  }

  private resolveActor(log: ActivityLog): string {
    if (log.user) {
      const first = (log.user.first_name || '').trim();
      const last = (log.user.last_name || '').trim();
      const name = `${first} ${last}`.trim();
      return name || log.user.email || 'User';
    }
    return 'System';
  }

  private resolveSubject(log: ActivityLog): string {
    const base = (log.entity_type || 'record').replace(/_/g, ' ');
    const after = log.after_data || {};
    const before = log.before_data || {};

    const get = (obj: Record<string, any>, key: string) =>
      obj && typeof obj === 'object' ? obj[key] : undefined;

    const name = get(after, 'name') ?? get(before, 'name');
    const title = get(after, 'title') ?? get(before, 'title');
    const email = get(after, 'email') ?? get(before, 'email');
    const firstName = get(after, 'first_name') ?? get(before, 'first_name');
    const lastName = get(after, 'last_name') ?? get(before, 'last_name');
    const display = name || title || email || firstName || lastName;

    if (display) {
      return `${base} "${display}"`.trim();
    }
    return `${base} ${log.entity_id ?? ''}`.trim();
  }

  private activityVisuals(action: string) {
    const normalized = (action || '').toUpperCase();
    if (normalized === 'CREATE') return { icon: 'add_circle', color: '#10B981', verb: 'created' };
    if (normalized === 'UPDATE') return { icon: 'edit', color: '#6366F1', verb: 'updated' };
    if (normalized === 'DELETE') return { icon: 'delete', color: '#EF4444', verb: 'deleted' };
    if (normalized === 'LOGIN') return { icon: 'login', color: '#3B82F6', verb: 'logged in' };
    return { icon: 'info', color: '#6B7280', verb: 'updated' };
  }

  private flattenProjectTasks(projects: ProjectResponse[]): DashboardTask[] {
    return projects.flatMap((project) => project.tasks ?? []);
  }

  private normalizeUserStatus(raw?: string): UserStatus {
    const normalized = (raw ?? '').toLowerCase();
    if (normalized === UserStatus.INACTIVE) return UserStatus.INACTIVE;
    if (normalized === UserStatus.PENDING) return UserStatus.PENDING;
    if (normalized === UserStatus.BANNED) return UserStatus.BANNED;
    return UserStatus.ACTIVE;
  }

  private normalizeProject(project: ProjectResponse) {
    const status = (project.status || '').toLowerCase();
    const createdAt = this.parseDate((project as any).created_at ?? (project as any).createdAt);
    return {
      ...project,
      status: ['active', 'completed', 'archived', 'on_hold'].includes(status) ? status : 'active',
      createdAt,
    };
  }

  private normalizeTask(task: DashboardTask) {
    const rawStatus = ((task as any).status || '').toLowerCase();
    const status = ['todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled'].includes(rawStatus)
      ? rawStatus
      : 'todo';

    return {
      id: (task as any).id as string,
      title: (task as any).title || 'Untitled task',
      status,
      dueDate: (task as any).due_date ?? (task as any).dueDate ?? null,
      createdAt: this.parseDate((task as any).created_at ?? (task as any).createdAt),
    };
  }

  private countOverdueTasks(tasks: { status: string; dueDate?: string | null }[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
      const due = this.parseDate(task.dueDate);
      if (!due) return false;
      due.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    }).length;
  }

  private calculateHealthScore(
    completionRate: number,
    overdueTasks: number,
    totalTasks: number,
    onHoldProjects: number,
    totalProjects: number,
  ): number {
    const overdueRate = totalTasks ? overdueTasks / totalTasks : 0;
    const onHoldRate = totalProjects ? onHoldProjects / totalProjects : 0;
    const penalty = Math.round(overdueRate * 40 + onHoldRate * 20);
    const base = 95;
    return Math.max(35, Math.min(99, base - penalty + Math.round(completionRate * 0.1)));
  }

  private relativeTime(date?: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) return 'Recently';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.round(days / 30);
    return `${months} mo${months === 1 ? '' : 's'} ago`;
  }

  private parseDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private statusLabel(status: UserStatus): string {
    if (status === UserStatus.INACTIVE) return 'Inactive';
    if (status === UserStatus.PENDING) return 'Pending';
    if (status === UserStatus.BANNED) return 'Banned';
    return 'Active';
  }

  private primaryRole(user: AdminUserResponse): string {
    const roles = (user.roles || []).map((role) => role?.name?.trim()).filter(Boolean) as string[];
    if (!roles.length) return 'Member';
    const adminRole = roles.find((role) => role.toLowerCase() === 'admin');
    if (adminRole) return adminRole;
    return roles[0] ?? 'Member';
  }

  private hasRole(user: AdminUserResponse, roleName: string): boolean {
    return (user.roles || []).some((role) => role.name?.toLowerCase() === roleName.toLowerCase());
  }

  private normalizeRoleKey(role: string): string {
    const normalized = role.trim().toLowerCase();
    const knownRoles = ['admin', 'user', 'manager', 'member'];
    if (knownRoles.includes(normalized)) return normalized;
    return 'default';
  }

  private titleCase(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private handlePartialError(reason: unknown): void {
    console.warn('Partial admin dashboard load', reason);
    this.error.set('Loaded partial data. Some sections may be incomplete.');
  }
}
