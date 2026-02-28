import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, Optional, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { Permission, Role } from '@core/models';
import {
  RoleSavePayload,
  RolesPermissionsService,
} from '../../data-access/roles-permissions.service';

type PermissionForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  description: FormControl<string | null>;
  selected: FormControl<boolean>;
}>;

type PermissionGroupForm = FormGroup<{
  category: FormControl<string>;
  permissions: FormArray<PermissionForm>;
}>;

@Component({
  selector: 'app-role-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatExpansionModule,
  ],
  templateUrl: './role-editor.component.html',
  styleUrl: './role-editor.component.scss',
})
export class RoleEditorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'create' | 'edit'>('create');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly searchTerm = signal('');
  readonly permissionSource = signal<Permission[]>([]);

  roleId?: string;
  roleForm!: FormGroup;
  searchControl = new FormControl('');
  private initialPermissionIds = new Set<string>();

  constructor(
    private fb: FormBuilder,
    private rolesService: RolesPermissionsService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    @Optional() private dialogRef: MatDialogRef<RoleEditorComponent> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: { roleId?: string } | null
  ) {}

  ngOnInit(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]],
      permissions: this.fb.array([]),
    });

    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.searchTerm.set((value || '').toString().trim());
    });

    this.loadData();
  }

  get permissionsFormArray(): FormArray {
    return this.roleForm.get('permissions') as FormArray;
  }

  getPermissionArray(groupIndex: number): FormArray {
    return (this.permissionsFormArray.at(groupIndex) as FormGroup).get('permissions') as FormArray;
  }

  get filteredPermissionGroups(): {
    groupIndex: number;
    group: PermissionGroupForm;
    permissions: { control: PermissionForm; index: number }[];
  }[] {
    const term = this.searchTerm().toLowerCase();

    return this.permissionsFormArray.controls
      .map((groupControl, groupIndex) => {
        const group = groupControl as PermissionGroupForm;
        const permissionsArray = group.get('permissions') as FormArray;

        const filteredPermissions = (permissionsArray.controls as PermissionForm[])
          .map((control, index) => ({ control, index }))
          .filter(({ control }) => {
            if (!term) return true;
            const name = (control.get('name')?.value || '').toString().toLowerCase();
            const description = (control.get('description')?.value || '').toString().toLowerCase();
            return name.includes(term) || description.includes(term);
          });

        return { groupIndex, group, permissions: filteredPermissions };
      })
      .filter((entry) => entry.permissions.length > 0);
  }

  get selectedCount(): number {
    return this.permissionsFormArray.controls.reduce((acc, groupControl) => {
      const permissionsArray = (groupControl as FormGroup).get('permissions') as FormArray;
      const selectedInGroup = permissionsArray.controls.filter(
        (control) => !!control.get('selected')?.value
      ).length;
      return acc + selectedInGroup;
    }, 0);
  }

  toggleCategory(groupIndex: number, checked: boolean | null): void {
    const permissionsArray = this.getPermissionArray(groupIndex);
    permissionsArray.controls.forEach((control) => control.get('selected')?.setValue(!!checked));
  }

  isCategoryChecked(groupIndex: number): boolean {
    const permissionsArray = this.getPermissionArray(groupIndex);
    return permissionsArray.controls.every((control) => !!control.get('selected')?.value);
  }

  isCategoryIndeterminate(groupIndex: number): boolean {
    const permissionsArray = this.getPermissionArray(groupIndex);
    const selected = permissionsArray.controls.filter((control) => !!control.get('selected')?.value)
      .length;
    return selected > 0 && selected < permissionsArray.length;
  }

  getSelectedCountInCategory(groupIndex: number): number {
    const permissionsArray = this.getPermissionArray(groupIndex);
    return permissionsArray.controls.filter((control) => !!control.get('selected')?.value).length;
  }

  resetToOriginalSelection(): void {
    this.buildPermissionFormControls(this.permissionSource(), this.initialPermissionIds);
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    const { permissionIds, permissionNames } = this.collectSelectedPermissions();
    const name = (this.roleForm.get('name')?.value || '').toString().trim();
    const description = (this.roleForm.get('description')?.value || '').toString().trim();

    const payload: RoleSavePayload = {
      name,
      description,
      // Prefer names to avoid UUID validation issues from the API; ids are optional.
      permissionIds: undefined,
      permissionNames: permissionNames.length ? permissionNames : undefined,
    };

    this.isSaving.set(true);

    const save$ = this.roleId
      ? this.rolesService.updateRole(this.roleId, payload)
      : this.rolesService.createRole(payload);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (role) => {
          this.initialPermissionIds = new Set(permissionIds);
          this.snackBar.open(
            `Role ${this.roleId ? 'updated' : 'created'} successfully`,
            'Close',
            { duration: 3000 }
          );

          if (this.dialogRef) {
            this.dialogRef.close({ refreshed: true, roleId: role?.id ?? this.roleId });
          } else if (!this.roleId && role?.id) {
            this.router.navigate(['/admin/roles', role.id]);
          }
        },
        error: () => {
          this.snackBar.open('Failed to save role. Please try again.', 'Close', { duration: 4000 });
        },
      });
  }

  close(): void {
    this.dialogRef?.close();
  }

  private loadData(): void {
    const roleIdFromDialog = this.dialogData?.roleId;
    const roleIdFromRoute = this.route.snapshot.paramMap.get('id');
    this.roleId = roleIdFromDialog ?? roleIdFromRoute ?? undefined;
    this.mode.set(this.roleId ? 'edit' : 'create');

    const role$ = this.roleId ? this.rolesService.getRole(this.roleId) : of(null);

    forkJoin({
      permissions: this.rolesService.getPermissions(),
      role: role$,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: ({ permissions, role }) => {
          this.permissionSource.set(permissions);
          const selectedIds = new Set(role?.permissions?.map((p) => p.id) ?? []);
          this.initialPermissionIds = new Set(selectedIds);

          this.roleForm.patchValue({
            name: role?.name ?? '',
            description: role?.description ?? '',
          });

          this.buildPermissionFormControls(permissions, selectedIds);
        },
        error: () => {
          this.snackBar.open('Unable to load permissions.', 'Close', { duration: 3500 });
        },
      });
  }

  private buildPermissionFormControls(permissions: Permission[], selectedIds: Set<string>): void {
    this.permissionsFormArray.clear();
    const grouped = this.groupPermissions(permissions);

    Object.keys(grouped)
      .sort()
      .forEach((category) => {
        const groupPermissions = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
        const permissionControls = groupPermissions.map((permission) =>
          this.fb.group({
            id: [permission.id],
            name: [permission.name],
            description: [permission.description ?? ''],
            selected: [selectedIds.has(permission.id)],
          }) as PermissionForm
        );

        this.permissionsFormArray.push(
          this.fb.group({
            category: [category],
            permissions: this.fb.array(permissionControls),
          }) as PermissionGroupForm
        );
      });
  }

  private collectSelectedPermissions(): { permissionIds: string[]; permissionNames: string[] } {
    const permissionIds: string[] = [];
    const permissionNames: string[] = [];

    this.permissionsFormArray.controls.forEach((groupControl) => {
      const permissionsArray = (groupControl as FormGroup).get('permissions') as FormArray;
      permissionsArray.controls.forEach((control) => {
        if (control.get('selected')?.value) {
          permissionIds.push(String(control.get('id')?.value));
          permissionNames.push(String(control.get('name')?.value));
        }
      });
    });

    return { permissionIds, permissionNames };
  }

  formatPermissionName(name: string | null | undefined): string {
    if (!name) return '';
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
    const grouped: Record<string, Permission[]> = {};

    permissions.forEach((permission) => {
      const category = this.resolveCategory(permission.name);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });

    return grouped;
  }

  private resolveCategory(permissionName: string): string {
    const name = permissionName.toUpperCase();

    if (name.includes('NOTIFICATION')) return 'Notification Permissions';
    if (name.includes('SUBTASK')) return 'Subtask Permissions';
    if (name.includes('TASK')) return 'Task Permissions';
    if (name.includes('PROJECT')) return 'Project Permissions';
    if (name.includes('USER') || name.includes('ROLE') || name.includes('PERMISSION')) {
      return 'User & Role Management';
    }
    if (name.includes('REPORT')) return 'Reporting';
    return 'General';
  }
}
