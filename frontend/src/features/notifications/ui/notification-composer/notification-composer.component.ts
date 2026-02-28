import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { NotificationType, Role } from '@core/models';
import { RolesPermissionsService } from '@features/admin/data-access/roles-permissions.service';
import {
  AdminNotificationPayload,
  AdminNotificationsService,
} from '../../data-access/admin-notifications.service';

type NotificationTypeOption = {
  value: NotificationType;
  label: string;
  helper: string;
};

@Component({
  selector: 'app-notification-composer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './notification-composer.component.html',
  styleUrl: './notification-composer.component.scss',
})
export class NotificationComposerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesApi = inject(RolesPermissionsService);
  private adminNotificationsApi = inject(AdminNotificationsService);
  private snackBar = inject(MatSnackBar);

  roles = signal<Role[]>([]);
  loadingRoles = signal(false);
  submitting = signal(false);

  readonly typeOptions: NotificationTypeOption[] = [
    { value: 'info', label: 'Info', helper: 'General updates and announcements' },
    { value: 'success', label: 'Success', helper: 'Wins, achievements, completions' },
    { value: 'warning', label: 'Warning', helper: 'Potential issues to watch' },
    { value: 'error', label: 'Error', helper: 'Incidents and urgent attention' },
  ];

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
    type: this.fb.nonNullable.control<NotificationType>('info'),
    roleIds: this.fb.nonNullable.control<string[]>([], [Validators.required]),
  });

  selectedCount = computed(() => this.form.controls.roleIds.value.length);
  selectedRoleNames = computed(() => {
    const selected = new Set(this.form.controls.roleIds.value);
    return this.roles()
      .filter((role) => selected.has(role.id))
      .map((role) => role.name);
  });
  currentType = computed(
    () =>
      this.typeOptions.find((opt) => opt.value === this.form.controls.type.value) ??
      this.typeOptions[0],
  );

  ngOnInit(): void {
    this.loadRoles();
  }

  submit(): void {
    if (this.submitting()) return;

    if (this.form.controls.roleIds.value.length === 0) {
      this.snackBar.open('Select at least one role to send this notification.', 'Close', {
        duration: 3500,
        panelClass: ['snackbar-error'],
      });
      return;
    }

    if (this.form.invalid) return;

    const payload: AdminNotificationPayload = {
      title: this.form.controls.title.value.trim(),
      message: this.form.controls.message.value.trim(),
      type: this.form.controls.type.value,
      audience: 'user',
      roleIds: this.form.controls.roleIds.value,
    };

    this.submitting.set(true);

    this.adminNotificationsApi.create(payload).subscribe({
      next: (res) => {
        this.snackBar.open(`Sent to ${res.created} user(s)`, 'Close', {
          duration: 3500,
          panelClass: ['snackbar-success'],
        });
        this.form.reset({
          title: '',
          message: '',
          type: 'info',
          roleIds: [],
        });
      },
      error: (error) => {
        console.error('Failed to send notification', error);
        const msg =
          error?.error?.message ??
          error?.message ??
          'Unable to send notification right now.';
        this.snackBar.open(msg, 'Close', {
          duration: 4000,
          panelClass: ['snackbar-error'],
        });
      },
      complete: () => this.submitting.set(false),
    });
  }

  private loadRoles(): void {
    this.loadingRoles.set(true);
    this.rolesApi.listRoles().subscribe({
      next: (roles) => this.roles.set(roles ?? []),
      error: () => this.roles.set([]),
      complete: () => this.loadingRoles.set(false),
    });
  }

  toggleRole(roleId: string, checked: boolean): void {
    const current = new Set(this.form.controls.roleIds.value);
    if (checked) {
      current.add(roleId);
    } else {
      current.delete(roleId);
    }
    this.form.controls.roleIds.setValue(Array.from(current));
  }
}
