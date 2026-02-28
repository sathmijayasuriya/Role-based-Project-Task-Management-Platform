import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isSaving = signal(false);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private profileService: ProfileService,
    private snackBar: MatSnackBar
  ) {
    // Keep the reactive signal in sync with the form values.
    effect(() => {
      const user = this.authService.currentUser();
      if (user && this.profileForm) {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.ensureUserLoaded();
  }

  private initializeForm(): void {
    const user = this.authService.currentUser();
    this.profileForm = this.fb.group({
      firstName: [user?.firstName || '', [Validators.required]],
      lastName: [user?.lastName || '', [Validators.required]],
      phone: [user?.phone || ''],
    });
  }

  private ensureUserLoaded(): void {
    this.authService.refreshUserData().subscribe();
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.profileForm.value;

    const updateData = {
      first_name: formValue.firstName,
      last_name: formValue.lastName,
      phone: formValue.phone || undefined,
    };

    this.profileService.updateProfile(updateData).subscribe({
      next: () => this.handleSuccess(),
      error: (err) => this.handleError(err),
    });
  }

  private handleSuccess(): void {
    this.authService.refreshUserData().subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open('Profile updated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  private handleError(err: any): void {
    this.isSaving.set(false);
    this.snackBar.open(err.error?.message || 'Failed to update profile', 'Close', {
      duration: 5000,
    });
  }
}
