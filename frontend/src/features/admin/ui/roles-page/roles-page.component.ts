import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router, ActivatedRoute } from '@angular/router';
import { Permission, Role } from '@core/models';
import { RolesPermissionsService } from '../../data-access/roles-permissions.service';
import { RoleEditorComponent } from '../role-editor/role-editor.component';
import { MatChip } from '@angular/material/chips';
@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatTabsModule,
    MatExpansionModule,
    MatChip,
  ],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.scss',
})
export class RolesPageComponent implements OnInit {
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  searchControl = new FormControl('');
  isLoading = signal(false);
  activeTab = signal<'roles' | 'permissions'>('roles');
  roleCount = computed(() => this.roles().length);
  permissionCount = computed(() => this.permissions().length);
  filteredPermissions = computed(() => {
    const term = (this.searchControl.value || '').toString().toLowerCase().trim();
    if (!term) return this.permissions();
    return this.permissions().filter((p) => {
      const name = p.name?.toLowerCase() || '';
      const desc = p.description?.toLowerCase() || '';
      return name.includes(term) || desc.includes(term);
    });
  });
  groupedPermissions = computed(() => this.groupPermissions(this.filteredPermissions()));

  constructor(
    private rolesService: RolesPermissionsService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();

    const roleId = this.route.snapshot.paramMap.get('id');
    if (roleId) {
      // open dialog in edit mode if navigated directly with id
      setTimeout(() => this.openRoleDialog(roleId), 0);
    }
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.rolesService.listRoles().subscribe({
      next: (data) => this.roles.set(data || []),
      error: () => this.roles.set([]),
      complete: () => this.isLoading.set(false),
    });
  }

  loadPermissions(): void {
    this.rolesService.getPermissions().subscribe({
      next: (data) => this.permissions.set(data || []),
      error: () => this.permissions.set([]),
    });
  }

  openRoleDialog(roleId?: string): void {
    const dialogRef = this.dialog.open(RoleEditorComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { roleId },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.refreshed) {
        this.loadRoles();
      }
      if (roleId) {
        this.router.navigate(['/admin/roles']);
      }
    });
  }

  private groupPermissions(perms: Permission[]): { category: string; items: Permission[] }[] {
    const grouped: Record<string, Permission[]> = {};
    perms.forEach((perm) => {
      const category = this.resolveCategory(perm.name);
      grouped[category] = grouped[category] || [];
      grouped[category].push(perm);
    });

    return Object.keys(grouped)
      .sort()
      .map((key) => ({
        category: key,
        items: grouped[key].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }

  private resolveCategory(permissionName: string): string {
    const name = permissionName.toUpperCase();
    if (name.includes('NOTIFICATION')) return 'Notifications';
    if (name.includes('SUBTASK')) return 'Subtasks';
    if (name.includes('TASK')) return 'Tasks';
    if (name.includes('PROJECT')) return 'Projects';
    if (name.includes('USER') || name.includes('ROLE') || name.includes('PERMISSION')) {
      return 'Users & Roles';
    }
    if (name.includes('REPORT')) return 'Reporting';
    return 'General';
  }

  formatPermissionName(name: string): string {
    if (!name) return '';
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
