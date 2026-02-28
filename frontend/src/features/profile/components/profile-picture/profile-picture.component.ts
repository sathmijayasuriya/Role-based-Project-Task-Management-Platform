import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { environment } from '../../../../environments/environment';

declare var cloudinary: any;

@Component({
  selector: 'app-profile-picture',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './profile-picture.component.html',
  styleUrl: './profile-picture.component.scss',
})
export class ProfilePictureComponent implements OnInit {
  isUploading = signal(false);
  isRemoving = signal(false);
  isHovering = signal(false);
  isPressing = signal(false);
  showRemovePrompt = signal(false);
  showSuccessGlow = signal(false);

  hasImage = computed(() => !!this.authService.currentUser()?.profilePictureUrl);

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCloudinaryWidget();
  }

  private loadCloudinaryWidget(): void {
    if (!document.querySelector('script[src*="cloudinary"]')) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  getInitials(): string {
    const u = this.authService.currentUser();
    return u?.firstName && u?.lastName
      ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
      : 'U';
  }

  openUploadWidget(): void {
    if (this.isUploading()) return;
    this.tapAvatar();

    const widget = cloudinary.createUploadWidget(
      {
        cloudName: environment.cloudinary.cloudName,
        uploadPreset: environment.cloudinary.uploadPreset,
        cropping: true,
        croppingAspectRatio: 1,
        multiple: false,
        maxFileSize: 5_000_000,
      },
      (_: any, result: any) => {
        if (result?.event === 'success') {
          this.uploadProfilePicture(result.info.secure_url);
        }
      }
    );

    widget.open();
  }

  private uploadProfilePicture(url: string): void {
    this.isUploading.set(true);
    this.profileService.updateProfilePicture({ profile_picture_url: url }).subscribe({
      next: () => {
        this.authService.refreshUserData().subscribe(() => {
          this.isUploading.set(false);
          this.triggerSuccessGlow();
          this.snackBar.open('Profile picture updated', 'Close', { duration: 3000 });
        });
      },
      error: () => this.isUploading.set(false),
    });
  }

  removePicture(): void {
    if (!this.showRemovePrompt()) {
      this.showRemovePrompt.set(true);
      return;
    }

    this.showRemovePrompt.set(false);
    this.isRemoving.set(true);

    this.profileService.removeProfilePicture().subscribe({
      next: () => {
        this.authService.refreshUserData().subscribe(() => {
          this.isRemoving.set(false);
          this.snackBar.open('Profile picture removed', 'Close', { duration: 3000 });
        });
      },
      error: () => this.isRemoving.set(false),
    });
  }

  onHover(state: boolean): void {
    this.isHovering.set(state && !this.isUploading());
  }

  tapAvatar(): void {
    this.isPressing.set(true);
    setTimeout(() => this.isPressing.set(false), 180);
  }

  dismissRemovePrompt(): void {
    this.showRemovePrompt.set(false);
  }

  private triggerSuccessGlow(): void {
    this.showSuccessGlow.set(true);
    setTimeout(() => this.showSuccessGlow.set(false), 700);
  }
}
