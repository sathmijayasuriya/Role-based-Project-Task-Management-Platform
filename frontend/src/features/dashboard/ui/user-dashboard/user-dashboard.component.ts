import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { firstValueFrom } from 'rxjs';
import { ProjectsService, ProjectResponse } from '@features/projects/data-access/projects.service';
import { TasksService, TaskResponse } from '@features/tasks/data-access/tasks.service';
import { TaskPriority, TaskStatus } from '@core/models';

interface StatCard {
  title: string;
  value: number;
  helper: string;
  icon: string;
  color: string;
}

interface DashboardTaskRow {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss',
})
export class UserDashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private tasksApi = inject(TasksService);
  private projectsApi = inject(ProjectsService);

  isLoading = signal(false);
  error = signal<string | null>(null);

  private tasks = signal<TaskResponse[]>([]);
  private projects = signal<ProjectResponse[]>([]);

  private projectNameById = computed<Record<string, string>>(() => {
    const lookup: Record<string, string> = {};
    this.projects().forEach((p) => {
      if (p?.id) lookup[p.id] = p.name || 'Untitled project';
    });
    return lookup;
  });

  private myTaskSource = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    const all = this.tasks();
    if (!currentUserId) return all;

    const assigned = all.filter((t) => (t.assigned_to || '') === currentUserId);
    if (assigned.length) return assigned;

    const created = all.filter((t) => (t.created_by || '') === currentUserId);
    if (created.length) return created;

    // If the user can view everything, show the full list instead of an empty view
    if (this.authService.hasPermission?.('TASK_VIEW_ALL') || this.authService.isAdmin?.()) {
      return all;
    }

    return all;
  });

  stats = computed<StatCard[]>(() => {
    const tasks = this.myTaskSource().map((t) => this.normalizeTask(t));
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const inProgress = tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.REVIEW,
    ).length;
    const overdue = tasks.filter((t) => this.isOverdue(t)).length;

    return [
      {
        title: 'My Tasks',
        value: total,
        helper: `${completed} completed`,
        icon: 'task_alt',
        color: '#6366F1',
      },
      {
        title: 'In Progress',
        value: inProgress,
        helper: 'In progress + review',
        icon: 'pending_actions',
        color: '#F59E0B',
      },
      {
        title: 'Completed',
        value: completed,
        helper: total ? `${Math.round((completed / total) * 100)}% done` : '0% done',
        icon: 'check_circle',
        color: '#10B981',
      },
      {
        title: 'Overdue',
        value: overdue,
        helper: overdue ? 'Needs attention' : 'All clear',
        icon: 'warning',
        color: '#EF4444',
      },
    ];
  });

  myTasks = computed<DashboardTaskRow[]>(() => {
    const lookup = this.projectNameById();
    return this.myTaskSource()
      .map((task) => {
        const normalized = this.normalizeTask(task);
        return {
          id: task.id,
          title: task.title || 'Untitled task',
          project: this.projectLabel(task, lookup),
          status: normalized.status,
          priority: normalized.priority,
          dueDate: normalized.due_date,
        };
      })
      .sort((a, b) => {
        // Put overdue/soon due tasks first
        const aDue = this.parseDate(a.dueDate);
        const bDue = this.parseDate(b.dueDate);
        if (!aDue && !bDue) return 0;
        if (!aDue) return 1;
        if (!bDue) return -1;
        return aDue.getTime() - bDue.getTime();
      })
      .slice(0, 8);
  });

  recentActivities = computed(() => {
    const tasks = this.myTaskSource()
      .slice()
      .sort((a, b) => (this.parseDate(b.updated_at)?.getTime() ?? 0) - (this.parseDate(a.updated_at)?.getTime() ?? 0))
      .slice(0, 5);

    return tasks.map((t) => {
      const status = this.normalizeTask(t).status;
      return {
        id: t.id,
        title: `Task "${t.title || 'Untitled'}" is ${this.statusLabel(status)}`,
        time: this.relativeTime(this.parseDate(t.updated_at) ?? this.parseDate(t.created_at)),
        icon: status === TaskStatus.COMPLETED ? 'task_alt' : 'history',
        color: status === TaskStatus.COMPLETED ? '#10B981' : '#6366F1',
      };
    });
  });

  async ngOnInit(): Promise<void> {
    // Admins expect the admin dashboard
    if (this.authService.isAdmin?.()) {
      await this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      return;
    }

    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [tasksResult, projectsResult] = await Promise.allSettled([
        firstValueFrom(this.tasksApi.getTasks()),
        firstValueFrom(this.projectsApi.getProjects()),
      ]);

      const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value ?? [] : [];
      const projects = projectsResult.status === 'fulfilled' ? projectsResult.value ?? [] : [];

      this.tasks.set(tasks);
      this.projects.set(projects);

      if (tasksResult.status === 'rejected' && projectsResult.status === 'rejected') {
        this.error.set('Unable to load your dashboard right now.');
      } else if (tasksResult.status === 'rejected') {
        this.error.set('Tasks are unavailable right now. Other data may be partial.');
      } else if (projectsResult.status === 'rejected') {
        this.error.set('Projects are unavailable. Task data is shown without project names.');
      }
    } catch (err) {
      console.error('Failed to load user dashboard', err);
      this.error.set('Unable to load your dashboard right now.');
      this.tasks.set([]);
      this.projects.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToTasksCreate(): void {
    this.router.navigate(['/tasks'], { queryParams: { create: 1 } }).catch(() => {});
  }

  statusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      [TaskStatus.TODO]: 'To do',
      [TaskStatus.IN_PROGRESS]: 'In progress',
      [TaskStatus.REVIEW]: 'Review',
      [TaskStatus.COMPLETED]: 'Completed',
      [TaskStatus.BLOCKED]: 'Blocked',
      [TaskStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status] ?? 'To do';
  }

  priorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      [TaskPriority.LOW]: 'Low',
      [TaskPriority.MEDIUM]: 'Medium',
      [TaskPriority.HIGH]: 'High',
      [TaskPriority.CRITICAL]: 'Critical',
    };
    return labels[priority] ?? 'Medium';
  }

  formatDate(value?: string | null): string {
    const date = this.parseDate(value);
    if (!date) return '\u2014';
    return date.toLocaleDateString('en-GB');
  }

  getStatusClass(status: TaskStatus): string {
    if (status === TaskStatus.COMPLETED) return 'status-completed';
    if (status === TaskStatus.IN_PROGRESS) return 'status-in-progress';
    if (status === TaskStatus.REVIEW) return 'status-review';
    if (status === TaskStatus.BLOCKED) return 'status-blocked';
    if (status === TaskStatus.CANCELLED) return 'status-cancelled';
    return 'status-todo';
  }

  getPriorityClass(priority: TaskPriority): string {
    if (priority === TaskPriority.CRITICAL) return 'priority-critical';
    if (priority === TaskPriority.HIGH) return 'priority-high';
    if (priority === TaskPriority.LOW) return 'priority-low';
    return 'priority-medium';
  }

  private normalizeTask(task: TaskResponse): TaskResponse & { status: TaskStatus; priority: TaskPriority } {
    const statusRaw = (task.status || '').toLowerCase();
    const status: TaskStatus = [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVIEW,
      TaskStatus.COMPLETED,
      TaskStatus.BLOCKED,
      TaskStatus.CANCELLED,
    ].includes(statusRaw as TaskStatus)
      ? (statusRaw as TaskStatus)
      : TaskStatus.TODO;

    const priorityRaw = (task.priority || '').toLowerCase();
    const priority: TaskPriority = [
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.CRITICAL,
    ].includes(priorityRaw as TaskPriority)
      ? (priorityRaw as TaskPriority)
      : TaskPriority.MEDIUM;

    return { ...(task as any), status, priority };
  }

  private projectLabel(task: TaskResponse, lookup: Record<string, string>): string {
    const inline =
      (task as any)?.project?.name ||
      (task as any)?.project_name ||
      (task as any)?.projectTitle ||
      '';
    if (inline) return inline;
    if (task.project_id && lookup[task.project_id]) return lookup[task.project_id];
    if (task.project_id) return `Project ${task.project_id.slice(0, 6)}`;
    return 'Unassigned project';
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private isOverdue(task: { status: TaskStatus; due_date?: string | null }): boolean {
    if (!task.due_date) return false;
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) return false;

    const due = this.parseDate(task.due_date);
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    return dueDay.getTime() < today.getTime();
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
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

