import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  CreateTaskRequest,
  TaskResponse,
  TaskSubtask,
  TasksService,
} from '@features/tasks/data-access/tasks.service';
import { ProjectMember, ProjectResponse, ProjectsService } from '@features/projects/data-access/projects.service';
import {
  ProjectMemberUser,
  ProjectMembersService,
} from '@features/projects/data-access/project-members.service';
import { AdminUsersService, AdminUserResponse } from '@features/team/data-access/admin-users.service';
import { AuthService } from '@core/services/auth.service';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type DueFilter = 'all' | 'overdue' | 'upcoming' | 'no_due';

interface ViewTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  projectName: string;
  assignedTo?: string | null;
  assigneeRaw?: string | null;
  assigneeName: string;
  dueDate?: string | null;
  progress: number;
  subtasks?: TaskSubtask[];
  createdBy?: string | null;
}

interface StatCard {
  key: 'total' | TaskStatus | 'overdue';
  label: string;
  count: number;
  helper: string;
  color: string;
  progress?: number;
}

interface TaskFormModel {
  title: string;
  projectId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assigneeId: string;
  description: string;
}

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './tasks-page.component.html',
  styleUrls: ['./tasks-page.component.scss'],
})
export class TasksPageComponent implements OnInit {
  private tasksApi = inject(TasksService);
  private projectsApi = inject(ProjectsService);
  private projectMembersApi = inject(ProjectMembersService);
  private adminUsersApi = inject(AdminUsersService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected authService = inject(AuthService);
  @ViewChild('createTaskDialog') createTaskDialog?: TemplateRef<unknown>;

  readonly statusOptions: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled'];
  readonly priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

  tasks = signal<ViewTask[]>([]);
  projects = signal<{ id: string; name: string }[]>([]);
  projectLookup = signal<Record<string, string>>({});
  memberLookup = signal<Record<string, string>>({});
  assigneeOptions = computed(() =>
    Object.entries(this.memberLookup())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  isLoading = signal(false);
  projectLoading = signal(false);
  isSaving = signal(false);
  error = signal<string | null>(null);
  createError = signal<string | null>(null);
  updatingIds = signal<Set<string>>(new Set());
  createDialogRef?: MatDialogRef<unknown>;

  searchTerm = signal('');
  statusFilter = signal<TaskStatus | 'all'>('all');
  priorityFilter = signal<TaskPriority | 'all'>('all');
  dueFilter = signal<DueFilter>('all');

  createForm: TaskFormModel = {
    title: '',
    projectId: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    assigneeId: '',
    description: '',
  };

  filteredTasks = computed(() => this.applyFilters());
  completionRate = computed(() => this.calculateCompletion());
  overdueCount = computed(() => this.tasks().filter((task) => this.isOverdue(task)).length);
  statCards = computed(() => this.buildStatCards());
  upcomingTasks = computed(() => this.buildUpcomingTasks());

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProjects(), this.loadTasks(), this.loadUsersDirectory()]);
    const create = this.route.snapshot.queryParamMap.get('create');
    if (create === '1' || create === 'true') {
      this.openCreateDialog();
      // clean URL
      this.router
        .navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        })
        .catch(() => {});
    }
  }

  onProjectChange(projectId: string): void {
    this.createForm.projectId = projectId;
    // Refresh member list for the selected project so the assignee dropdown shows names
    if (projectId) {
      this.loadMembersForProjects([projectId]).catch(() => {});
    }
  }

  async refresh(): Promise<void> {
    await Promise.all([this.loadProjects(), this.loadTasks()]);
  }

  async loadTasks(): Promise<void> {
    if (!this.canViewTasks()) {
      this.error.set('You do not have permission to view tasks.');
      this.tasks.set([]);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const apiTasks = await firstValueFrom(this.tasksApi.getTasks());
      const mapped = apiTasks.map((task) => this.mapTask(task));
      this.tasks.set(mapped);
      const lookup = { ...this.memberLookup() };
      let lookupUpdated = false;
      mapped.forEach((task) => {
        if (task.assignedTo && task.assigneeRaw && !lookup[String(task.assignedTo)]) {
          lookup[String(task.assignedTo)] = task.assigneeRaw;
          lookupUpdated = true;
        }
      });
      const projectsNeedingMembers = Array.from(
        new Set(
          mapped
            .filter((task) => task.assignedTo && !lookup[String(task.assignedTo)])
            .map((task) => task.projectId),
        ),
      );
      if (lookupUpdated) {
        this.memberLookup.set(lookup);
      }
      if (projectsNeedingMembers.length) {
        await this.loadMembersForProjects(projectsNeedingMembers);
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
      const status = (err as any)?.status;
      const message =
        status === 403
          ? 'You do not have permission to view tasks.'
          : 'Unable to load tasks right now.';
      this.error.set(message);
      this.tasks.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProjects(): Promise<void> {
    this.projectLoading.set(true);
    try {
      const response = await firstValueFrom(this.projectsApi.getProjects());
      const lookup: Record<string, string> = {};
      const memberLookup: Record<string, string> = {};
      const options = response.map((project: ProjectResponse) => {
        const name = project.name || 'Untitled project';
        lookup[project.id] = name;
        project.members?.forEach((member) => {
          if (!member.user_id) return;
          const id = String(member.user_id);
          memberLookup[id] = this.memberDisplayName(member);
        });
        return { id: project.id, name };
      });
      this.projectLookup.set(lookup);
      this.memberLookup.set(memberLookup);
      if (this.tasks().length) {
        this.updateAssigneeNames();
      }
      this.projects.set(options);

      // Ensure we have up-to-date member names for each project (fills assignee dropdown)
      const projectIds = options.map((p) => p.id);
      if (projectIds.length) {
        await this.loadMembersForProjects(projectIds);
      }
    } catch (error) {
      console.warn('Unable to load projects for tasks page', error);
      this.projectLookup.set({});
      this.projects.set([]);
    } finally {
      this.projectLoading.set(false);
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.priorityFilter.set('all');
    this.dueFilter.set('all');
  }

  openCreateDialog(): void {
    if (!this.canCreate()) return;
    if (!this.createTaskDialog) return;
    this.resetCreateForm();
    this.createError.set(null);
    this.createDialogRef = this.dialog.open(this.createTaskDialog, {
      width: '640px',
      autoFocus: false,
      restoreFocus: true,
    });
  }

  closeCreateDialog(): void {
    this.createDialogRef?.close();
  }

  async submitCreate(): Promise<void> {
    if (!this.canCreate()) return;
    const trimmedTitle = this.createForm.title.trim();
    if (!trimmedTitle || !this.createForm.projectId) {
      this.createError.set('Please provide a task title and select a project.');
      return;
    }

    const payload: CreateTaskRequest = {
      title: trimmedTitle,
      projectId: this.createForm.projectId,
      description: this.createForm.description?.trim() || undefined,
      priority: this.createForm.priority,
      status: this.createForm.status,
      dueDate: this.createForm.dueDate || null,
      assigneeId: this.createForm.assigneeId?.trim() || undefined,
    };

    this.isSaving.set(true);
    this.createError.set(null);

    try {
      const created = await firstValueFrom(this.tasksApi.createTask(payload));
      const mapped = this.mapTask(created);
      this.tasks.set([mapped, ...this.tasks()]);
      this.resetCreateForm();
      this.closeCreateDialog();
    } catch (error) {
      console.error('Failed to create task', error);
      const status = (error as any)?.status;
      const message =
        status === 403
          ? 'You do not have permission to create tasks.'
          : 'Unable to create task right now.';
      this.createError.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  async updateTaskStatus(task: ViewTask, status: TaskStatus): Promise<void> {
    if (!this.canEditTask(task)) return;
    if (task.status === status) return;

    const updatedIds = new Set(this.updatingIds());
    updatedIds.add(task.id);
    this.updatingIds.set(updatedIds);

    try {
      const updated = await firstValueFrom(this.tasksApi.updateTask(task.id, { status }));
      this.replaceTask(updated);
    } catch (error) {
      console.error('Failed to update task status', error);
      this.error.set('Unable to update task status.');
    } finally {
      this.updatingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  private replaceTask(payload: TaskResponse): void {
    const mapped = this.mapTask(payload);
    const list = this.tasks().map((existing) => (existing.id === mapped.id ? mapped : existing));
    this.tasks.set(list);
  }

  private updateAssigneeNames(): void {
    this.tasks.update((list) =>
      list.map((task) => ({
        ...task,
        assigneeName: this.assigneeLabel(task.assignedTo, task.assigneeRaw),
      })),
    );
  }

  private async loadMembersForProjects(projectIds: string[]): Promise<void> {
    const unique = Array.from(new Set(projectIds.filter(Boolean)));
    if (!unique.length) return;
    const lookup = { ...this.memberLookup() };

    for (const projectId of unique) {
      try {
        const members = await firstValueFrom(this.projectMembersApi.listMembers(projectId));
        members.forEach((member) => {
          if (!member.user_id) return;
          const id = String(member.user_id);
          lookup[id] = this.memberDisplayName(member);
        });
      } catch (err) {
        console.warn('Unable to load members for project', projectId, err);
      }
    }

    this.memberLookup.set(lookup);
    this.updateAssigneeNames();
  }

  private async loadUsersDirectory(): Promise<void> {
    const lookup = { ...this.memberLookup() };

    const jobs: Promise<void>[] = [];

    // Admin: fetch full user list for richer names
    if (this.authService.isAdmin?.()) {
      jobs.push(
        firstValueFrom(this.adminUsersApi.list())
          .then((users: AdminUserResponse[]) => {
            users.forEach((user) => {
              const id = String(user.id);
              const name = this.adminUserDisplayName(user);
              if (id && name) lookup[id] = name;
            });
          })
          .catch((err) => {
            console.warn('Unable to load admin users directory', err);
          }),
      );
    }

    // Generic /users endpoint (may be restricted for non-admin)
    jobs.push(
      firstValueFrom(this.projectMembersApi.searchUsers({ page: 1, pageSize: 200 }))
        .then((response) => {
          (response.items || []).forEach((user: ProjectMemberUser) => {
            const id = String(user.id);
            const name = this.userDisplayName(user);
            if (id && name) lookup[id] = name;
          });
        })
        .catch((err) => {
          console.warn('Unable to load users directory for assignee names', err);
        }),
    );

    await Promise.allSettled(jobs);

    const me = this.authService.currentUser?.();
    if (me?.id) {
      const name = [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || me.email;
      if (name) lookup[String(me.id)] = name;
    }

    this.memberLookup.set(lookup);
    this.updateAssigneeNames();
  }

  private resetCreateForm(): void {
    this.createForm = {
      title: '',
      projectId: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
      assigneeId: '',
      description: '',
    };
  }

  private mapTask(task: TaskResponse): ViewTask {
    const status = this.normalizeStatus(task.status);
    const priority = this.normalizePriority(task.priority);
    const progress = this.normalizeProgress(task.progress_percent, status);
    const projectId = task.project_id;
    const projectName = this.projectLookup()[projectId] || 'Unassigned project';
    const assignedTo = task.assigned_to || null;
    const rawAssigneeName = this.extractAssigneeName(task);

    return {
      id: task.id,
      title: task.title || 'Untitled task',
      description: task.description || null,
      status,
      priority,
      projectId,
      projectName,
      assignedTo,
      assigneeRaw: rawAssigneeName,
      assigneeName: this.assigneeLabel(assignedTo, rawAssigneeName),
      dueDate: task.due_date || null,
      progress,
      subtasks: task.subtasks || [],
      createdBy: (task as any)?.created_by || null,
    };
  }

  private applyFilters(): ViewTask[] {
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const due = this.dueFilter();

    return this.tasks().filter((task) => {
      const matchesSearch =
        !search ||
        [task.title, task.description || '', task.projectName, task.assignedTo || '', task.assigneeName]
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesStatus = status === 'all' || task.status === status;
      const matchesPriority = priority === 'all' || task.priority === priority;
      const matchesDue =
        due === 'all'
          ? true
          : due === 'overdue'
            ? this.isOverdue(task)
            : due === 'no_due'
              ? !task.dueDate
              : this.isDueSoon(task);

      return matchesSearch && matchesStatus && matchesPriority && matchesDue;
    });
  }

  private buildUpcomingTasks(): ViewTask[] {
    return this.tasks()
      .filter((task) => this.isDueSoon(task) && !this.isOverdue(task))
      .sort((a, b) => {
        const aDate = this.parseDate(a.dueDate);
        const bDate = this.parseDate(b.dueDate);
        if (!aDate || !bDate) return 0;
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 5);
  }

  private buildStatCards(): StatCard[] {
    const total = this.tasks().length;
    const counts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
    };

    this.tasks().forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });

    const inFlight = counts.in_progress + counts.review;
    const completed = counts.completed;
    const overdue = this.overdueCount();

    return [
      {
        key: 'total',
        label: 'Tasks in workspace',
        count: total,
        helper: `${this.completionRate()}% completed`,
        color: 'var(--primary-color)',
        progress: this.completionRate(),
      },
      {
        key: 'in_progress',
        label: 'In progress',
        count: inFlight,
        helper: 'Moving right now',
        color: '#f59e0b',
        progress: total ? Math.round((inFlight / total) * 100) : 0,
      },
      {
        key: 'completed',
        label: 'Completed',
        count: completed,
        helper: 'Shipped to done',
        color: '#10b981',
        progress: total ? Math.round((completed / total) * 100) : 0,
      },
      {
        key: 'overdue',
        label: 'Overdue',
        count: overdue,
        helper: 'Need attention',
        color: '#ef4444',
        progress: total ? Math.round((overdue / total) * 100) : 0,
      },
    ];
  }

  private calculateCompletion(): number {
    const total = this.tasks().length;
    if (!total) return 0;
    const completed = this.tasks().filter((task) => task.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }

  statusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      todo: 'To do',
      in_progress: 'In progress',
      review: 'Review',
      completed: 'Completed',
      blocked: 'Blocked',
      cancelled: 'Cancelled',
    };
    return labels[status] || 'To do';
  }

  statusClass(status: TaskStatus): string {
    if (status === 'completed') return 'completed';
    if (status === 'in_progress') return 'in-progress';
    if (status === 'review') return 'review';
    if (status === 'blocked') return 'blocked';
    if (status === 'cancelled') return 'cancelled';
    return 'todo';
  }

  priorityLabel(priority: TaskPriority): string {
    const normalized = priority || 'medium';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  priorityClass(priority: TaskPriority): string {
    if (priority === 'critical') return 'critical';
    if (priority === 'high') return 'high';
    if (priority === 'low') return 'low';
    return 'medium';
  }

  progressLabel(task: ViewTask): string {
    if (task.status === 'completed') return 'Done';
    if (task.status === 'blocked') return 'Blocked';
    if (task.status === 'cancelled') return 'Cancelled';
    if (task.progress >= 90) return 'Almost done';
    if (task.progress >= 50) return 'On track';
    return 'Planning';
  }

  formatDate(value?: string | null): string | undefined {
    const date = this.parseDate(value);
    if (!date) return undefined;
    return date.toLocaleDateString('en-GB');
  }

  dueState(task: ViewTask): 'overdue' | 'soon' | 'nodate' | 'ok' {
    if (!task.dueDate) return 'nodate';
    if (this.isOverdue(task)) return 'overdue';
    if (this.isDueSoon(task)) return 'soon';
    return 'ok';
  }

  shortUser(userId?: string | null): string {
    if (!userId) return 'Unassigned';
    if (userId.length <= 8) return userId;
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }

  assigneeLabel(userId?: string | null, rawName?: string | null): string {
    if (rawName && rawName.trim()) return rawName.trim();
    if (!userId) return 'Unassigned';
    const target = String(userId);
    const lookup = this.memberLookup();
    return lookup[target] || this.shortUser(target);
  }

  memberDisplayName(member: ProjectMember): string {
    const first = member.user?.first_name?.trim() || '';
    const last = member.user?.last_name?.trim() || '';
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    if (member.user?.email) return member.user.email;
    return this.shortUser(member.user_id);
  }

  private userDisplayName(user: ProjectMemberUser): string {
    const first = (user.first_name || (user as any).firstName || '').trim();
    const last = (user.last_name || (user as any).lastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (user.email) return user.email;
    return this.shortUser(user.id);
  }

  private adminUserDisplayName(user: AdminUserResponse): string {
    const first = (user.first_name || (user as any).firstName || '').trim();
    const last = (user.last_name || (user as any).lastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (user.email) return user.email;
    return this.shortUser(user.id);
  }

  statusFilterLabel(): string {
    const value = this.statusFilter();
    return value === 'all' ? 'All' : this.statusLabel(value);
  }

  priorityFilterLabel(): string {
    const value = this.priorityFilter();
    return value === 'all' ? 'All' : this.priorityLabel(value as TaskPriority);
  }

  dueFilterLabel(): string {
    const value = this.dueFilter();
    if (value === 'all') return 'Any';
    if (value === 'upcoming') return 'Next 7 days';
    if (value === 'overdue') return 'Overdue';
    return 'No due date';
  }

  canViewTasks(): boolean {
    return (
      this.authService.isAdmin?.() ||
      this.authService.hasPermission('TASK_VIEW_ALL') ||
      this.authService.hasPermission('TASK_VIEW_ASSIGNED')
    );
  }

  canCreate(): boolean {
    return this.authService.isAdmin?.() || this.authService.hasPermission('TASK_CREATE');
  }

  canEditTask(task: ViewTask): boolean {
    if (this.authService.isAdmin?.() || this.authService.hasPermission('TASK_EDIT_ALL')) {
      return true;
    }
    if (!this.authService.hasPermission('TASK_EDIT_ASSIGNED')) return false;
    const userId = this.authService.currentUser()?.id;
    return !!userId && (task.assignedTo === userId || task.createdBy === userId);
  }

  private normalizeStatus(status?: string | null): TaskStatus {
    const normalized = (status || '').toLowerCase();
    if (['in_progress', 'in-progress', 'progress'].includes(normalized)) return 'in_progress';
    if (['review', 'in_review'].includes(normalized)) return 'review';
    if (['completed', 'done'].includes(normalized)) return 'completed';
    if (['blocked'].includes(normalized)) return 'blocked';
    if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
    return 'todo';
  }

  private normalizePriority(priority?: string | null): TaskPriority {
    const normalized = (priority || '').toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
      return normalized as TaskPriority;
    }
    return 'medium';
  }

  private normalizeProgress(value?: number | string | null, status?: TaskStatus): number {
    const numeric = Number(value ?? 0);
    if (!isNaN(numeric) && numeric >= 0) {
      return Math.min(100, Math.max(0, Math.round(numeric)));
    }

    if (status === 'completed') return 100;
    if (status === 'in_progress' || status === 'review') return 50;
    return 0;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  private isOverdue(task: ViewTask): boolean {
    if (!task.dueDate) return false;
    const date = this.parseDate(task.dueDate);
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    return due.getTime() < today.getTime() && task.status !== 'completed' && task.status !== 'cancelled';
  }

  private isDueSoon(task: ViewTask): boolean {
    if (!task.dueDate) return false;
    const date = this.parseDate(task.dueDate);
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const soon = new Date();
    soon.setDate(today.getDate() + 7);
    soon.setHours(0, 0, 0, 0);

    return date.getTime() >= today.getTime() && date.getTime() <= soon.getTime();
  }

  private extractAssigneeName(task: TaskResponse): string | null {
    const anyTask = task as any;
    const candidate =
      anyTask.assigned_user ||
      anyTask.assignee ||
      anyTask.assignedTo ||
      anyTask.user ||
      anyTask.user_details ||
      null;

    if (candidate) {
      const first = (candidate.first_name || candidate.firstName || '').trim();
      const last = (candidate.last_name || candidate.lastName || '').trim();
      const full = `${first} ${last}`.trim();
      if (full) return full;
      const email = (candidate.email || candidate.mail || '').trim();
      if (email) return email;
    }

    const explicitName =
      anyTask.assigned_user_name ||
      anyTask.assignee_name ||
      anyTask.assignedToName ||
      anyTask.assigned_name ||
      anyTask.assigned_to_name ||
      '';

    return explicitName?.trim() || null;
  }
}
