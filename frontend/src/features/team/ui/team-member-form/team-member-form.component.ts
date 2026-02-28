import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Role, UserStatus } from '@core/models';

export interface TeamMemberFormValue {
  id?: string | null;

  // backend-style fields
  first_name: string;
  last_name: string;

  email: string;
  phone?: string;

  status: UserStatus;
  roleNames: string[];
}

@Component({
  selector: 'app-team-member-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './team-member-form.component.html',
  styleUrls: ['./team-member-form.component.scss'],
})
export class TeamMemberFormComponent implements OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: TeamMemberFormValue | null = null;
  @Input() availableRoles: Role[] = [];
  @Input() loading = false;

  @Output() save = new EventEmitter<TeamMemberFormValue>();
  @Output() cancel = new EventEmitter<void>();

  form: TeamMemberFormValue = {
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: UserStatus.ACTIVE,
    roleNames: [],
  };

  statusOptions = [
    { label: 'Active', value: UserStatus.ACTIVE },
    { label: 'Inactive', value: UserStatus.INACTIVE },
    { label: 'Pending', value: UserStatus.PENDING },
    { label: 'Banned', value: UserStatus.BANNED },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.form = {
        id: this.user.id ?? null,
        first_name: this.user.first_name || '',
        last_name: this.user.last_name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        status: this.user.status || UserStatus.ACTIVE,
        roleNames: [...(this.user.roleNames || [])],
      };
      return;
    }

    if (changes['mode'] && this.mode === 'create') {
      this.resetForm();
    }
  }

  onSubmit(): void {
    if (
      !this.form.first_name.trim() ||
      !this.form.last_name.trim() ||
      !this.form.email.trim()
    ) {
      return;
    }

    const payload: TeamMemberFormValue = {
      ...this.form,
      first_name: this.form.first_name.trim(),
      last_name: this.form.last_name.trim(),
      email: this.form.email.trim(),
      phone: this.form.phone?.trim(),
      roleNames: Array.from(new Set(this.form.roleNames.map((r) => r.trim()).filter(Boolean))),
    };

    this.save.emit(payload);
  }

  toggleRole(roleName: string, checked: boolean): void {
    const normalized = roleName.trim();
    if (!normalized) return;

    const current = new Set(this.form.roleNames);
    if (checked) {
      current.add(normalized);
    } else {
      current.delete(normalized);
    }
    this.form.roleNames = Array.from(current);
  }

  isRoleSelected(roleName: string): boolean {
    return this.form.roleNames.includes(roleName);
  }

  private resetForm(): void {
    this.form = {
      id: null,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: UserStatus.ACTIVE,
      roleNames: [],
    };
  }
}
