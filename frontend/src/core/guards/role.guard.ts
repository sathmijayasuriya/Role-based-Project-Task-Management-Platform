import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const requiredPermissions = route.data['permissions'] as string[];

  if ((!requiredRoles || requiredRoles.length === 0) && (!requiredPermissions || requiredPermissions.length === 0)) {
    return true;
  }

  const hasRole = requiredRoles?.some((role) => authService.hasRole(role)) ?? false;
  const hasPermission =
    requiredPermissions?.some((perm) => authService.hasPermission(perm)) ?? false;

  if (!hasRole && !hasPermission) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
