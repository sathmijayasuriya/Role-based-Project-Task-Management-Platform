import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, Optional, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  tap,
  startWith,
  firstValueFrom,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ProjectMember,
  ProjectMemberUser,
  ProjectMembersService,
  SyncProjectMembersRequest,
} from '@features/projects/data-access/project-members.service';

type DialogData = {
  projectId: string;
  projectName?: string | null;
  members: ProjectMember[];
};

type MemberOption = ProjectMemberUser & {
  role?: string | null;
  onTeam: boolean;
};

@Component({
  selector: 'app-project-members-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './project-members-dialog.component.html',
  styleUrls: ['./project-members-dialog.component.scss'],
})
export class ProjectMembersDialogComponent implements OnInit {
  private readonly membersApi = inject(ProjectMembersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  readonly members = signal<ProjectMember[]>([]);
  readonly users = signal<ProjectMemberUser[]>([]);
  readonly searchTerm = signal('');
  readonly userOptions = computed<MemberOption[]>(() => {
    const map = new Map<string, MemberOption>();

    this.members().forEach((member) => {
      const user = member.user;
      map.set(member.user_id, {
        id: member.user_id,
        first_name: user?.first_name ?? undefined,
        last_name: user?.last_name ?? undefined,
        email: user?.email ?? undefined,
        status: user?.status ?? undefined,
        profile_picture_path: user?.profile_picture_path,
        role: member.assigned_role ?? null,
        onTeam: true,
      });
    });

    this.users().forEach((user) => {
      const existing = map.get(user.id);
      map.set(user.id, {
        ...existing,
        ...user,
        onTeam: existing?.onTeam ?? this.initialIds.has(user.id),
        role: existing?.role ?? null,
      });
    });

    const term = this.searchTerm().trim().toLowerCase();
    const combined = Array.from(map.values());
    const filtered = term
      ? combined.filter((user) => this.matchesTerm(user, term))
      : combined;

    return filtered.sort((a, b) => Number(b.onTeam) - Number(a.onTeam));
  });

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly userLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  private initialIds = new Set<string>();
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly hasChanges = computed(() => {
    const selected = this.selectedIds();
    if (selected.size !== this.initialIds.size) return true;
    for (const id of selected) {
      if (!this.initialIds.has(id)) {
        return true;
      }
    }
    return false;
  });

  constructor(
    @Optional() private dialogRef: MatDialogRef<ProjectMembersDialogComponent> | null,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

  ngOnInit(): void {
    this.members.set(this.data.members || []);
    this.resetSelectionFromMembers(this.data.members || []);
    this.loadMembersFromApi();
    this.setupUserSearch();
  }

  close(): void {
    this.dialogRef?.close();
  }

  toggleUser(user: ProjectMemberUser): void {
    const selected = new Set(this.selectedIds());
    const isSelected = selected.has(user.id);
    if (isSelected) {
      if (this.initialIds.has(user.id)) {
        const confirmed = window.confirm(
          `Remove ${this.resolveUserLabel(user.id, user)} from this project?`,
        );
        if (!confirmed) return;
      }
      selected.delete(user.id);
    } else {
      selected.add(user.id);
    }
    this.selectedIds.set(selected);
    this.success.set(null);
  }

  removeChip(userId: string): void {
    const user = this.findUser(userId);
    this.toggleUser({
      id: userId,
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      status: user?.status,
      profile_picture_path: user?.profile_picture_path,
    });
  }

  isSelected(userId: string): boolean {
    return this.selectedIds().has(userId);
  }

  selectedList(): string[] {
    return Array.from(this.selectedIds());
  }

  selectedLabel(userId: string): string {
    return this.resolveUserLabel(userId, this.findUser(userId));
  }

  userDisplayName(user: ProjectMemberUser): string {
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return fullName || user.email || user.id;
  }

  async save(): Promise<void> {
    if (!this.hasChanges()) {
      this.success.set('No changes to save.');
      return;
    }
    const projectId = this.data.projectId;
    const selected = this.selectedIds();
    const additions = Array.from(selected).filter((id) => !this.initialIds.has(id));
    const removals = Array.from(this.initialIds).filter((id) => !selected.has(id));

    const payload: SyncProjectMembersRequest = {
      add: additions,
      remove: removals,
    };

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const response = await firstValueFrom(this.membersApi.syncMembers(projectId, payload));
      const members = response?.members ?? [];
      this.members.set(members);
      this.resetSelectionFromMembers(members);
      this.success.set('Members updated');
      this.dialogRef?.close({ members });
    } catch (err) {
      this.error.set('Could not save member changes.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private setupUserSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(200),
        distinctUntilChanged(),
        tap((term) => {
          this.searchTerm.set((term || '').trim());
          this.userLoading.set(true);
          this.error.set(null);
        }),
        switchMap((term) => {
          const normalized = (term || '').trim();
          return this.membersApi
            .searchUsers({ search: normalized, page: 1, pageSize: 10 })
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.userLoading.set(false);
        if (!response) {
          this.users.set([]);
          return;
        }
        this.users.set(response.items || []);
      });
  }

  private async loadMembersFromApi(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const members = await firstValueFrom(this.membersApi.listMembers(this.data.projectId));
      this.members.set(members || []);
      this.resetSelectionFromMembers(members || []);
    } catch (err) {
      this.error.set('Could not load members.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetSelectionFromMembers(members: ProjectMember[]): void {
    this.initialIds = new Set(members.map((m) => m.user_id));
    this.selectedIds.set(new Set(this.initialIds));
  }

  private resolveUserLabel(userId: string, user?: ProjectMemberUser | null): string {
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    if (fullName) return fullName;
    if (user?.email) return user.email;
    const existing = this.members()
      .map((m) => m.user)
      .find((u) => u?.id === userId);
    const existingName = `${existing?.first_name ?? ''} ${existing?.last_name ?? ''}`.trim();
    if (existingName) return existingName;
    if (existing?.email) return existing.email;
    return userId;
  }

  private findUser(userId: string): ProjectMemberUser | null {
    const fromUsers = this.users().find((u) => u.id === userId);
    if (fromUsers) return fromUsers;
    const fromMembers = this.members().find((m) => m.user_id === userId);
    return fromMembers?.user ?? null;
  }

  private matchesTerm(user: ProjectMemberUser, term: string): boolean {
    if (!term) return true;
    const email = user.email?.toLowerCase() ?? '';
    const first = user.first_name?.toLowerCase() ?? '';
    const last = user.last_name?.toLowerCase() ?? '';
    const fullName = `${first} ${last}`.trim();
    if (email.includes(term) || fullName.includes(term)) {
      return true;
    }
    return false;
  }
}
