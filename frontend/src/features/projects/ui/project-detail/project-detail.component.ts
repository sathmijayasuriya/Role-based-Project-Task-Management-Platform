import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProjectResponse, ProjectsService, UpdateProjectRequest } from '@features/projects/data-access/projects.service';
import { TaskResponse, TasksService } from '@features/tasks/data-access/tasks.service';
import { AuthService } from '@core/services/auth.service';
import { ProjectMembersService, ProjectMember } from '@features/projects/data-access/project-members.service';
import { ProjectMembersDialogComponent } from '../project-members-dialog/project-members-dialog.component';

type ProjectEditForm = {
  name: string;
  description: string;
  status: string;
  priority: string;
  end_date: string;
};

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, RouterModule],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
})
export class ProjectDetailComponent implements OnInit {
  private projectsApi = inject(ProjectsService);
  private tasksApi = inject(TasksService);
  private projectMembersApi = inject(ProjectMembersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private readonly maxVisibleMembers = 3;
  private readonly tasksPageUrl = '/tasks';

  activeTab = signal<'overview' | 'tasks' | 'subtasks' | 'team' | 'notifications' | 'files' | 'integrations'>('overview');
  project = signal<ProjectResponse | null>(null);
  tasks = signal<TaskResponse[]>([]);
  isLoading = signal(false);
  tasksLoading = signal(false);
  error = signal<string | null>(null);
  tasksError = signal<string | null>(null);
  isEditing = signal(false);
  isSaving = signal(false);
  editError = signal<string | null>(null);
  memberError = signal<string | null>(null);
  membersLoading = signal(false);

  readonly statusOptions = ['active', 'in_progress', 'on_hold', 'blocked', 'completed'];
  readonly priorityOptions = ['low', 'medium', 'high', 'critical'];

  editForm: ProjectEditForm = {
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    end_date: '',
  };

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.error.set('Missing project id');
      return;
    }
    await this.loadProject(projectId);
    if (!this.project()) {
      return;
    }
    if (this.canViewTasks()) {
      await this.loadTasks(projectId);
    } else {
      this.tasksError.set('You do not have permission to view tasks.');
    }
  }

  private async loadProject(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.editError.set(null);
    this.memberError.set(null);
    try {
      const project = await firstValueFrom(this.projectsApi.getProject(id));
      this.project.set(project);
      this.syncEditForm(project);
      if (project && this.canViewMembers()) {
        await this.refreshMembers(project.id);
      }
    } catch (err) {
      this.error.set('Could not load project details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private canViewTasks(): boolean {
    return (
      this.authService.hasPermission('TASK_VIEW_ALL') ||
      this.authService.hasPermission('TASK_VIEW_ASSIGNED') ||
      this.authService.isAdmin()
    );
  }

  canCreateTask(): boolean {
    return (
      this.authService.isAdmin() ||
      this.authService.hasPermission('TASK_CREATE') ||
      this.authService.hasPermission('TASK_EDIT_ALL')
    );
  }

  openCreateTaskDialog(): void {
    // Reuse existing tasks page dialog logic via query param
    const projectId = this.project()?.id;
    const extras = projectId ? { queryParams: { create: 1, projectId } } : { queryParams: { create: 1 } };
    this.router.navigate([this.tasksPageUrl], extras).catch(() => {});
  }

  openTasksWorkspace(): void {
    this.router.navigate([this.tasksPageUrl]).catch(() => {});
  }

  private async loadTasks(projectId: string): Promise<void> {
    this.tasksLoading.set(true);
    this.tasksError.set(null);
    try {
      const tasks = await firstValueFrom(this.tasksApi.getTasksByProject(projectId));
      this.tasks.set(tasks);
    } catch (err) {
      this.tasksError.set('Could not load tasks.');
      this.tasks.set([]);
    } finally {
      this.tasksLoading.set(false);
    }
  }

  canEditProject(): boolean {
    return (
      this.authService.isAdmin() ||
      this.authService.hasPermission('PROJECT_EDIT_ALL') ||
      this.authService.hasPermission('PROJECT_EDIT_ASSIGNED')
    );
  }

  canManageMembers(): boolean {
    return (
      this.authService.isAdmin() ||
      this.authService.hasPermission('PROJECT_MEMBER_MANAGE')
    );
  }

  canViewMembers(): boolean {
    return this.canManageMembers() || this.authService.hasPermission('PROJECT_MEMBER_VIEW');
  }

  startEditing(): void {
    if (!this.canEditProject()) return;
    if (!this.project()) return;
    this.syncEditForm();
    this.editError.set(null);
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.editError.set(null);
    this.syncEditForm();
  }

  async saveProjectEdits(): Promise<void> {
    if (!this.canEditProject()) return;
    const project = this.project();
    if (!project) return;

    const trimmedName = this.editForm.name.trim();
    if (!trimmedName) {
      this.editError.set('Project name is required.');
      return;
    }

    const payload: UpdateProjectRequest = {
      name: trimmedName,
      description: this.editForm.description?.trim() || undefined,
      status: this.editForm.status || 'active',
      priority: this.editForm.priority || 'medium',
      end_date: this.editForm.end_date || undefined,
    };

    this.isSaving.set(true);
    this.editError.set(null);

    try {
      const updated = await firstValueFrom(this.projectsApi.updateProject(project.id, payload));
      this.project.set(updated);
      this.syncEditForm(updated);
      this.isEditing.set(false);
    } catch (err) {
      this.editError.set('Could not update project.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async refreshMembers(projectId: string): Promise<void> {
    if (!this.canViewMembers()) return;
    this.membersLoading.set(true);
    this.memberError.set(null);
    try {
      const members = await firstValueFrom(this.projectMembersApi.listMembers(projectId));
      const project = this.project();
      if (project) {
        this.project.set({ ...project, members });
      }
    } catch (err) {
      this.memberError.set('Could not load project members.');
    } finally {
      this.membersLoading.set(false);
    }
  }

  async openManageMembers(): Promise<void> {
    if (!this.canManageMembers()) return;
    const project = this.project();
    if (!project) return;

    const dialogRef = this.dialog.open(ProjectMembersDialogComponent, {
      width: '680px',
      data: {
        projectId: project.id,
        projectName: project.name,
        members: project.members ?? [],
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result?.members) {
      this.project.set({ ...project, members: result.members as ProjectMember[] });
    }
  }

  private syncEditForm(project?: ProjectResponse | null): void {
    const current = project ?? this.project();
    if (!current) return;

    this.editForm = {
      name: current.name || '',
      description: current.description || '',
      status: current.status || 'active',
      priority: current.priority || 'medium',
      end_date: this.toDateInput(current.end_date),
    };
  }

  private toDateInput(value?: string | Date | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  attachments(): { title: string; time: string; icon: string; variant: 'amber' | 'mint' }[] {
    const tasks = this.tasks();
    const list = tasks.slice(0, 2).map((task, index) => {
      const title = task.title || `Attachment ${index + 1}`;
      const time = this.formatDate(task.due_date) || 'No due date';
      const variant: 'amber' | 'mint' = index % 2 === 0 ? 'amber' : 'mint';
      return {
        title,
        time,
        icon: title.charAt(0).toUpperCase(),
        variant,
      };
    });

    if (list.length === 0) {
      return [
        { title: 'Project brief', time: 'No due date', icon: 'B', variant: 'amber' },
        { title: 'Wireframes', time: 'No due date', icon: 'W', variant: 'mint' },
      ];
    }

    return list;
  }

  goals(): { id: number; text: string }[] {
    const tasks = this.tasks();
    const description = this.project()?.description?.trim();
    const collected = [
      ...(description ? [description] : []),
      ...tasks.map((task) => task.description || task.title || '').filter((text) => text && text.trim()),
    ];

    const unique = collected
      .map((text) => text.trim())
      .filter((text, index, arr) => arr.indexOf(text) === index)
      .slice(0, 2);

    const fallback = [
      'Loving the task prioritization feature! It keeps the focus on what is critical and organized.',
      'Real-time updates remove the need for constant check-ins with the team for status.',
    ];

    const goals = unique.length ? unique : fallback;
    return goals.map((text, index) => ({ id: index + 1, text }));
  }

  statusLabel(status?: string | null): string {
    if (!status) return 'Active';
    const normalized = status.replace(/[_-]/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  statusClass(status?: string | null): string {
    if (!status) return 'active';
    const normalized = status.toLowerCase();
    if (['completed', 'done'].includes(normalized)) return 'completed';
    if (['in_progress', 'in-progress', 'active'].includes(normalized)) return 'in-progress';
    if (['on_hold', 'review'].includes(normalized)) return 'on-hold';
    if (['blocked', 'archived'].includes(normalized)) return 'archived';
    return normalized;
  }

  priorityClass(priority?: string | null): string {
    if (!priority) return 'medium';
    const normalized = priority.toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(normalized)) return normalized;
    return 'medium';
  }

  priorityLabel(priority: string): string {
    const normalized = priority?.toLowerCase() || 'medium';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  formatDate(value?: string | Date | null): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString('en-GB');
  }

  shortUser(userId?: string | null): string {
    if (!userId) return 'NA';
    if (userId.length <= 8) return userId;
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }

  assigneeName(userId?: string | null): string {
    if (!userId) return 'Unassigned';
    const target = String(userId);
    const members = this.project()?.members || [];
    const match = members.find(
      (member) => String(member.user_id) === target || String(member.user?.id ?? '') === target,
    );
    if (match) return this.memberDisplayName(match);
    return this.shortUser(target);
  }

  isCompleted(status?: string | null): boolean {
    return this.normalizeStatus(status) === 'completed';
  }

  totalTasks(): number {
    return this.tasks().length;
  }

  totalSubtasks(): number {
    const tasks = this.tasks();
    return tasks.reduce((sum, task) => sum + (task.subtasks?.length || 0), 0);
  }

  private normalizeStatus(status?: string | null): 'completed' | 'in_progress' | 'on_hold' | 'blocked' | 'todo' {
    if (!status) return 'todo';
    const normalized = status.toLowerCase();
    if (['completed', 'done'].includes(normalized)) return 'completed';
    if (['in_progress', 'in-progress', 'active'].includes(normalized)) return 'in_progress';
    if (['on_hold', 'review'].includes(normalized)) return 'on_hold';
    if (['blocked', 'archived'].includes(normalized)) return 'blocked';
    return 'todo';
  }

  private statusSegments() {
    const tasks = this.tasks();
    const counts: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      on_hold: 0,
      blocked: 0,
      todo: 0,
    };

    tasks.forEach((task) => {
      const key = this.normalizeStatus(task.status);
      counts[key] += 1;
    });

    const palette: Record<string, string> = {
      completed: '#2dd4bf',
      in_progress: '#8b5cf6',
      on_hold: '#f59e0b',
      blocked: '#f87171',
      todo: '#94a3b8',
    };

    const segments = Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => ({
        label: this.statusLabel(label),
        key: label,
        value,
        color: palette[label as keyof typeof palette] ?? '#94a3b8',
      }));

    if (segments.length === 0) {
      return [
        {
          label: 'Planned',
          key: 'planned',
          value: 1,
          color: '#94a3b8',
        },
      ];
    }

    return segments;
  }

  chartSegments() {
    const segments = this.statusSegments();
    const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
    const circumference = 2 * Math.PI * 52;
    let accumulator = 0;

    return segments.map((seg) => {
      const length = (seg.value / total) * circumference;
      const dasharray = `${length} ${circumference}`;
      const offset = -(accumulator);
      accumulator += length;
      return {
        ...seg,
        percent: Math.round((seg.value / total) * 100),
        dasharray,
        offset,
      };
    });
  }

  activityItems(): { title: string; description: string; time: string; initial: string }[] {
    const tasks = this.tasks();
    return tasks.slice(0, 5).map((task) => ({
      title: task.title || 'Task',
      description: `${this.statusLabel(task.status)} - ${task.progress_percent ?? 0}% complete`,
      time: this.formatDate(task.due_date) || 'No due date',
      initial: (task.title || 'T').charAt(0).toUpperCase(),
    }));
  }

  visibleMembers() {
    const members = this.project()?.members || [];
    return members.slice(0, this.maxVisibleMembers);
  }

  remainingMembersCount(): number {
    const total = this.project()?.members?.length || 0;
    return Math.max(total - this.maxVisibleMembers, 0);
  }

  memberAvatar(userId?: string | null): string {
    const seed = userId && userId.trim().length ? userId : 'guest';
    return `https://i.pravatar.cc/80?u=${encodeURIComponent(seed)}`;
  }

  memberDisplayName(member: ProjectMember): string {
    const first = member.user?.first_name?.trim() ?? '';
    const last = member.user?.last_name?.trim() ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || member.user?.email || this.shortUser(member.user_id);
  }

  memberEmail(member: ProjectMember): string {
    return member.user?.email || '';
  }

  memberRole(member: ProjectMember): string {
    return member.assigned_role || 'member';
  }

  memberStatus(member: ProjectMember): string {
    return member.user?.status || 'member';
  }

  selectTab(
    tab: 'overview' | 'tasks' | 'subtasks' | 'team' | 'notifications' | 'files' | 'integrations',
  ): void {
    this.activeTab.set(tab);
  }

  tabIs(
    tab: 'overview' | 'tasks' | 'subtasks' | 'team' | 'notifications' | 'files' | 'integrations',
  ): boolean {
    return this.activeTab() === tab;
  }
}
