import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { User } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { EditProfileComponent } from '../edit-profile/edit-profile.component';

type ProfileUser = User & {
  country?: string;
  city?: string;
  state?: string;
  cityState?: string;
  location?: string;
  roleTitle?: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, ProfilePictureComponent, ChangePasswordComponent, EditProfileComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  profileUser = computed<ProfileUser | null>(() => this.authService.currentUser() as ProfileUser | null);

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.authService.refreshUserData().subscribe();
  }

  getFullName(): string {
    const user = this.profileUser();
    if (!user) return 'My Profile';
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || 'My Profile';
  }

  getInitials(): string {
    const user = this.profileUser();
    if (!user) return 'U';

    const initials = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.trim();
    if (initials) return initials.toUpperCase();

    return user.email ? user.email.charAt(0).toUpperCase() : 'U';
  }

  roleLabel(): string {
    const user = this.profileUser();
    if (!user) return 'Member';
    return user.roleTitle ?? user.roles?.[0]?.name ?? 'Member';
  }

  // locationLabel(): string {
  //   const user = this.profileUser();
  //   if (!user) return 'Add your location';

  //   const primaryLocation = user.cityState ?? user.city ?? user.state;
  //   const country = user.country;
  //   const manualLocation = user.location;

  //   const parts = [primaryLocation, country].filter(Boolean);
  //   if (parts.length) return parts.join(', ');
  //   if (manualLocation) return manualLocation;

  //   return 'Add your location';
  // }

  phoneLabel(): string {
    const phone = this.profileUser()?.phone?.trim();
    return phone && phone.length > 0 ? phone : 'Add a phone number';
  }
}
