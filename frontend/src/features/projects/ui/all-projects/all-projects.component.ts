import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import {
  ProjectsService,
  ProjectResponse,
  ProjectTask,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMember,
} from '@features/projects/data-access/projects.service';
import { AuthService } from '@core/services/auth.service';
import { ProjectFormComponent, ProjectFormModel } from '../project-form/project-form.component';

type ProjectStatus = 'completed' | 'in_progress' | 'on_hold';
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskScope = 'all' | 'assigned' | 'none';

interface ProgressSegment {
  label: string;
  value: number;
  color: string;
}

interface ProjectRow {
  id: string;
  clientName: string;
  clientEmail: string;
  clientId?: string | null;
  projectName: string;
  projectType: string;
  progressLabel: string;
  progress: number;
  progressSegments: ProgressSegment[];
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  startDateRaw?: string | null;
  endDateRaw?: string | null;
  priority: ProjectPriority;
  avatar?: string;
  budget: string;
  summary: string;
  owner: string;
  timeline: string;
  members?: ProjectMember[];
  createdBy?: string | null;
  tasks: ProjectTask[];
  totalTasks: number;
  visibleTaskCount: number;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: ProjectPriority;
  dueDate?: string;
  assignedTo?: string | null;
  projectId: string;
  projectName: string;
  progress: number;
}

@Component({
  selector: 'app-all-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, RouterModule, ProjectFormComponent],
  templateUrl: './all-projects.component.html',
  styleUrls: ['./all-projects.component.scss'],
})
export class AllProjectsComponent implements OnInit {
  private projectsApi = inject(ProjectsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  projects = signal<ProjectRow[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  selectedProject = signal<ProjectRow | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  statusFilter = signal<ProjectStatus | 'all'>('all');
  priorityFilter = signal<ProjectPriority | 'all'>('all');
  searchTerm = signal('');

  showForm = signal(false);
  formMode = signal<'create' | 'edit'>('create');
  editingProjectForm = signal<ProjectFormModel | null>(null);

  projectScope = computed<'all' | 'assigned' | 'none'>(() => {
    const user = this.authService.currentUser();
    const permissions = user?.permissions?.map((permission) => permission.toUpperCase()) ?? [];
    if (permissions.includes('PROJECT_VIEW_ALL')) {
      return 'all';
    }
    if (permissions.includes('PROJECT_VIEW_ASSIGNED')) {
      return 'assigned';
    }
    return 'none';
  });

  taskScope = computed<TaskScope>(() => {
    if (
      this.authService.hasPermission('TASK_VIEW_ALL') ||
      this.authService.hasPermission('PROJECT_VIEW_ALL') ||
      this.authService.isAdmin()
    ) {
      return 'all';
    }

    if (
      this.authService.hasPermission('TASK_VIEW_ASSIGNED') ||
      this.authService.hasPermission('PROJECT_VIEW_ASSIGNED')
    ) {
      return 'assigned';
    }

    return 'none';
  });

  canViewProjects = computed(() => this.projectScope() !== 'none');
  viewingAssignedOnly = computed(() => this.projectScope() === 'assigned');
  canViewTasks = computed(() => this.taskScope() !== 'none');
  viewingAssignedTasksOnly = computed(() => this.taskScope() === 'assigned');
  canCreate = computed(() => this.authService.hasPermission('PROJECT_CREATE'));
  canDelete = computed(() => this.authService.hasPermission('PROJECT_DELETE'));
  filteredProjects = computed(() => this.applyFilters());
  visibleTasks = computed(() => this.buildVisibleTasks());
  allSelected = computed(
    () =>
      this.filteredProjects().length > 0 &&
      this.filteredProjects().every((p) => this.selectedIds().has(p.id)),
  );

  async ngOnInit(): Promise<void> {
    if (this.projects().length > 0) {
      this.selectedProject.set(this.projects()[0]);
    }
    this.listenForCreateParam();
    await this.loadProjects();
  }

  private async loadProjects(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      if (!this.canViewProjects()) {
        this.projects.set([]);
        this.selectedIds.set(new Set());
        this.selectedProject.set(null);
        this.error.set('You do not have permission to view projects.');
        return;
      }

      const apiProjects = await firstValueFrom(this.projectsApi.getProjects());
      const visibleProjects = this.filterProjectsForCurrentUser(apiProjects);
      const mapped = visibleProjects.map((project) => this.mapProject(project));
      this.projects.set(mapped);
      this.selectedIds.set(new Set());
      this.selectedProject.set(mapped[0] ?? null);
    } catch (error) {
      console.error('Failed to load projects', error);
      this.projects.set([]);
      this.selectedProject.set(null);
      const message =
        (error as any)?.status === 403
          ? 'You do not have permission to view projects.'
          : 'Unable to load projects right now.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private listenForCreateParam(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('create') === 'new') {
        this.openCreateForm();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  private filterProjectsForCurrentUser(projects: ProjectResponse[]): ProjectResponse[] {
    if (this.authService.hasPermission('PROJECT_VIEW_ALL')) {
      return projects;
    }
    if (!this.authService.hasPermission('PROJECT_VIEW_ASSIGNED')) {
      return [];
    }
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return [];
    }
    return projects.filter((project) => {
      const members = project.members ?? [];
      const isMember = members.some((member) => member.user_id === userId);
      const isCreator = project.created_by === userId;
      return isMember || isCreator;
    });
  }

  private filterTasksForCurrentUser(tasks: ProjectTask[]): ProjectTask[] {
    const scope = this.taskScope();
    if (scope === 'all') {
      return tasks;
    }
    if (scope === 'none') {
      return [];
    }
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return [];
    }

    return tasks.filter((task) => {
      const assigneeMatches = task.assigned_to === userId;
      const creatorMatches = task.created_by === userId;
      return assigneeMatches || creatorMatches;
    });
  }

  private mapProject(project: ProjectResponse): ProjectRow {
    const visibleTasks = this.filterTasksForCurrentUser(project.tasks ?? []);
    const { progress, segments, label } = this.calculateProgress(visibleTasks);
    const normalizedStatus: ProjectStatus =
      project.status === 'completed'
        ? 'completed'
        : project.status === 'on_hold' || project.status === 'archived'
          ? 'on_hold'
          : 'in_progress';

    const startDate = this.formatDate(project.start_date);
    const endDate = this.formatDate(project.end_date);

    return {
      id: project.id,
      clientName: project.client?.name || 'Unassigned Client',
      clientEmail: project.client?.email || 'Not set',
      clientId: project.client?.id || project.client_id || null,
      projectName: project.name,
      projectType: project.description || 'Project',
      progressLabel: label,
      progress,
      progressSegments: segments,
      status: normalizedStatus,
      startDate,
      endDate,
      startDateRaw: project.start_date ?? null,
      endDateRaw: project.end_date ?? null,
      priority: (project.priority as ProjectPriority) || 'medium',
      avatar: project.client?.logo_url || undefined,
      budget: 'N/A',
      summary: project.description || 'No description provided yet.',
      owner: project.client?.contact_person_name || 'Owner pending',
      timeline:
        startDate && endDate
          ? `${startDate} - ${endDate}`
          : startDate || endDate || 'Timeline pending',
      members: project.members ?? [],
      createdBy: project.created_by ?? null,
      tasks: visibleTasks,
      totalTasks: project.tasks?.length ?? 0,
      visibleTaskCount: visibleTasks.length,
    };
  }

  private calculateProgress(tasks: ProjectTask[]): {
    progress: number;
    segments: ProgressSegment[];
    label: string;
  } {
    if (!tasks || tasks.length === 0) {
      return {
        progress: 0,
        segments: [{ label: 'Planning', value: 100, color: '#3b82f6' }],
        label: 'Planning',
      };
    }

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const remaining = Math.max(total - completed - inProgress, 0);

    const progressSum = tasks.reduce(
      (sum, task) => sum + Number((task.progress_percent as number | string | undefined) ?? 0),
      0,
    );
    const progress = Math.round(progressSum / total);

    const segments: ProgressSegment[] = [];
    if (completed > 0) {
      segments.push({
        label: 'Done',
        value: Math.round((completed / total) * 100),
        color: '#10b981',
      });
    }
    if (inProgress > 0) {
      segments.push({
        label: 'Doing',
        value: Math.round((inProgress / total) * 100),
        color: '#6366f1',
      });
    }
    if (remaining > 0) {
      const used = segments.reduce((s, seg) => s + seg.value, 0);
      segments.push({
        label: 'Todo',
        value: Math.max(100 - used, 0),
        color: '#818cf8',
      });
    }

    const label = `${completed}/${total} tasks done`;
    return {
      progress,
      segments: segments.length > 0 ? segments : [{ label: 'Progress', value: progress, color: '#6366f1' }],
      label,
    };
  }

  private normalizeTaskProgress(value?: number | string | null): number {
    const numeric = Number(value ?? 0);
    if (isNaN(numeric)) return 0;
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }

  private formatDate(value?: string | null): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString('en-GB');
  }

  private applyFilters(): ProjectRow[] {
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const search = this.searchTerm().toLowerCase().trim();

    return this.projects().filter((project) => {
      const matchesStatus = status === 'all' || project.status === status;
      const matchesPriority =
        priority === 'all' || this.getPriorityClass(project.priority) === priority;
      const matchesSearch =
        search.length === 0 ||
        project.projectName.toLowerCase().includes(search) ||
        project.clientName.toLowerCase().includes(search);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }

  private buildVisibleTasks(): TaskRow[] {
    if (!this.canViewTasks()) {
      return [];
    }

    return this.filteredProjects().flatMap((project) =>
      (project.tasks || []).map((task) => ({
        id: task.id,
        title: task.title || 'Untitled task',
        status: task.status,
        priority: this.getPriorityClass(task.priority),
        dueDate: this.formatDate(task.due_date),
        assignedTo: task.assigned_to || null,
        projectId: project.id,
        projectName: project.projectName,
        progress: this.normalizeTaskProgress(task.progress_percent),
      })),
    );
  }

  clearFilters(): void {
    this.statusFilter.set('all');
    this.priorityFilter.set('all');
    this.searchTerm.set('');
  }

  requestCreateProject(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { create: 'new' },
      queryParamsHandling: 'merge',
    });
  }

  openCreateForm(): void {
    if (!this.canCreate()) return;
    this.formMode.set('create');
    this.editingProjectForm.set({
      id: null,
      name: '',
      description: '',
      priority: 'medium',
      client_id: '',
      start_date: '',
      end_date: '',
    });
    this.showForm.set(true);
  }

  openEditForm(project?: ProjectRow): void {
    if (!this.canCreate()) return;
    const current = project || this.selectedProject();
    if (!current) return;
    const startDateISO = current.startDateRaw || this.toISODate(current.startDate);
    const endDateISO = current.endDateRaw || this.toISODate(current.endDate);
    this.formMode.set('edit');
    this.editingProjectForm.set({
      id: current.id,
      name: current.projectName,
      description: current.summary,
      priority: this.getPriorityClass(current.priority),
      client_id: current.clientId || '',
      start_date: startDateISO,
      end_date: endDateISO,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  private toISODate(date?: string): string {
    if (!date) return '';
    const parts = date.includes('/') ? date.split('/') : [date];
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return date;
  }

  async handleFormSubmit(form: ProjectFormModel): Promise<void> {
    if (!form.name.trim()) return;
    const payload: CreateProjectRequest | UpdateProjectRequest = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      priority: form.priority,
      client_id: form.client_id?.trim() || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    };

    if (this.formMode() === 'create') {
      await this.createProject(payload as CreateProjectRequest);
    } else if (form.id) {
      await this.updateProject(form.id, payload as UpdateProjectRequest);
    }

    this.showForm.set(false);
  }

  private async createProject(payload: CreateProjectRequest): Promise<void> {
    let saved: ProjectResponse | null = null;
    try {
      saved = await firstValueFrom(this.projectsApi.createProject(payload));
    } catch (error) {
      // keep fallback below
    }

    const mapped = saved ? this.mapProject(saved) : this.createLocalProject(payload);
    this.projects.set([mapped, ...this.projects()]);
    this.selectedProject.set(mapped);
  }

  private async updateProject(id: string, payload: UpdateProjectRequest): Promise<void> {
    let updated: ProjectResponse | null = null;
    try {
      updated = await firstValueFrom(this.projectsApi.updateProject(id, payload));
    } catch (error) {
      // fallback: update local only
    }

    const mapped = updated
      ? this.mapProject(updated)
      : this.mergeLocalProject(id, payload as ProjectFormModel);

    const list = this.projects().map((p) => (p.id === id ? mapped : p));
    this.projects.set(list);
    this.selectedProject.set(mapped);
  }

  private createLocalProject(payload: CreateProjectRequest): ProjectRow {
    const startDate = this.formatDate(payload.start_date);
    const endDate = this.formatDate(payload.end_date);
    const currentUserId = this.authService.currentUser()?.id || null;
    const tempId = `temp-${Date.now()}`;
    return {
      id: tempId,
      clientName: 'Unassigned Client',
      clientEmail: 'Not set',
      clientId: payload.client_id || null,
      projectName: payload.name,
      projectType: payload.description || 'Project',
      progressLabel: 'Planning',
      progress: 0,
      progressSegments: [{ label: 'Planning', value: 100, color: '#3b82f6' }],
      status: 'in_progress',
      startDate,
      endDate,
      startDateRaw: payload.start_date || null,
      endDateRaw: payload.end_date || null,
      priority: this.getPriorityClass(payload.priority || 'medium'),
      avatar: undefined,
      budget: 'N/A',
      summary: payload.description || 'No description provided yet.',
      owner: 'Owner pending',
      timeline: startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || 'TBD',
      members: currentUserId
        ? [
            {
              project_id: tempId,
              user_id: currentUserId,
            },
          ]
        : [],
      createdBy: currentUserId,
      tasks: [],
      totalTasks: 0,
      visibleTaskCount: 0,
    };
  }

  private mergeLocalProject(id: string, payload: ProjectFormModel): ProjectRow {
    const existing = this.projects().find((p) => p.id === id);
    if (!existing) return this.createLocalProject(payload);

    const startDate = payload.start_date ? this.formatDate(payload.start_date) : existing.startDate;
    const endDate = payload.end_date ? this.formatDate(payload.end_date) : existing.endDate;

    return {
      ...existing,
      projectName: payload.name || existing.projectName,
      summary: payload.description || existing.summary,
      projectType: payload.description || existing.projectType,
      priority: this.getPriorityClass(payload.priority || existing.priority),
      clientId: payload.client_id ?? existing.clientId,
      startDate,
      endDate,
      startDateRaw: payload.start_date ?? existing.startDateRaw,
      endDateRaw: payload.end_date ?? existing.endDateRaw,
      timeline:
        startDate && endDate
          ? `${startDate} - ${endDate}`
          : startDate || endDate || existing.timeline,
    };
  }

  emptyStateTitle(): string {
    if (!this.canViewProjects()) {
      return 'You cannot view projects yet';
    }
    if (this.viewingAssignedOnly()) {
      return 'No projects assigned to you';
    }
    return 'No projects available';
  }

  emptyStateDescription(): string {
    if (!this.canViewProjects()) {
      return 'Ask your administrator to grant you access to projects.';
    }
    if (this.viewingAssignedOnly()) {
      return 'When a project is assigned to you it will appear in this list.';
    }
    return 'Create or import a project to get started.';
  }

  toggleSelection(projectId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const updated = new Set(this.selectedIds());
    if (input.checked) {
      updated.add(projectId);
    } else {
      updated.delete(projectId);
    }
    this.selectedIds.set(updated);
  }

  toggleSelectAll(event: Event): void {
    const input = event.target as HTMLInputElement;
    const visibleIds = this.filteredProjects().map((project) => project.id);
    if (input.checked) {
      const merged = new Set(this.selectedIds());
      visibleIds.forEach((id) => merged.add(id));
      this.selectedIds.set(merged);
    } else {
      const remaining = new Set(
        Array.from(this.selectedIds()).filter((id) => !visibleIds.includes(id)),
      );
      this.selectedIds.set(remaining);
    }
  }

  selectProject(project: ProjectRow): void {
    this.selectedProject.set(project);
    this.router.navigate(['/projects', project.id]);
  }

  async deleteProject(project: ProjectRow): Promise<void> {
    if (!this.canDelete()) return;

    try {
      await firstValueFrom(this.projectsApi.deleteProject(project.id));
    } catch (error) {
      // fall back to local removal if API fails
    }

    const remaining = this.projects().filter((p) => p.id !== project.id);
    this.projects.set(remaining);

    const updatedSelections = new Set(this.selectedIds());
    updatedSelections.delete(project.id);
    this.selectedIds.set(updatedSelections);

    if (this.selectedProject()?.id === project.id) {
      this.selectedProject.set(remaining[0] ?? null);
    }
  }

  getStatusClass(status: ProjectStatus): string {
    if (status === 'completed') return 'completed';
    if (status === 'on_hold') return 'on-hold';
    return 'in-progress';
  }

  statusLabel(status?: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      completed: 'Completed',
      in_progress: 'In Progress',
      on_hold: 'On Hold',
    };
    return labels[status || 'in_progress'];
  }

  getPriorityClass(priority?: ProjectPriority | string | null): ProjectPriority {
    if (!priority) return 'medium';
    const normalized = (priority as string).toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
      return normalized as ProjectPriority;
    }
    return 'medium';
  }

  priorityLabel(priority: ProjectPriority): string {
    if (!priority) return 'Medium';
    const normalized = priority.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  taskStatusLabel(status?: string | null): string {
    const normalized = (status || 'todo').replace(/[_-]/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  taskStatusClass(status?: string | null): string {
    const normalized = (status || 'todo').toLowerCase();
    if (['completed', 'done'].includes(normalized)) return 'completed';
    if (['in_progress', 'in-progress', 'active'].includes(normalized)) return 'in-progress';
    if (['review'].includes(normalized)) return 'review';
    if (['blocked', 'cancelled'].includes(normalized)) return 'blocked';
    return 'todo';
  }

  taskScopeLabel(): string {
    if (!this.canViewTasks()) return 'No access';
    if (this.viewingAssignedTasksOnly()) return 'Assigned to you';
    return 'All tasks';
  }

  shortUser(userId?: string | null): string {
    if (!userId) return 'Unassigned';
    if (userId.length <= 8) return userId;
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }

  hiddenTaskCount(): number {
    return this.filteredProjects().reduce((sum, project) => {
      const hidden = Math.max(project.totalTasks - project.visibleTaskCount, 0);
      return sum + hidden;
    }, 0);
  }
}
