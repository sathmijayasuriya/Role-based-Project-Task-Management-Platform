import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // no permissions required
    }

    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    const userRoles: string[] = (user?.roles ?? []).map((role: any) => {
      if (typeof role === 'string') return role.toLowerCase();
      if (role?.name) return String(role.name).toLowerCase();
      return String(role ?? '').toLowerCase();
    });

    // Allow admins to bypass granular permission checks
    if (userRoles.includes('admin')) {
      return true;
    }

    const normalizedUserPerms = (user?.permissions ?? []).map((perm: any) => {
      if (typeof perm === 'string') return perm.toUpperCase();
      if (perm?.name) return String(perm.name).toUpperCase();
      return String(perm ?? '').toUpperCase();
    });

    return requiredPermissions.some((perm) =>
      normalizedUserPerms.includes(String(perm).toUpperCase()),
    );
  }
}
