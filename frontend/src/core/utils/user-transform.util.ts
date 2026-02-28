import { Permission, Role, User } from '@core/models';

function normalizePermission(input: any): Permission | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return {
      id: input,
      name: input,
      description: undefined,
    };
  }

  const id = input.id ?? input.name;
  const name = input.name ?? input.id;

  if (!id && !name) {
    return null;
  }

  return {
    id: String(id ?? name),
    name: String(name ?? id),
    description: input.description ?? undefined,
  };
}

function normalizeRole(input: any): Role | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return {
      id: input,
      name: input,
      permissions: [],
    };
  }

  const id = input.id ?? input.name;
  const name = input.name ?? input.id;
  if (!id && !name) {
    return null;
  }

  const permissions = Array.isArray(input.permissions)
    ? input.permissions
        .map((permission: any) => normalizePermission(permission))
        .filter((permission:Permission): permission is Permission => Boolean(permission))
    : [];

  return {
    id: String(id ?? name),
    name: String(name ?? id),
    description: input.description ?? undefined,
    permissions,
  };
}

export function transformUserResponse(user: any): (User & { permissions?: string[] }) | null {
  if (!user) {
    return user;
  }

  const normalizedRoles = Array.isArray(user.roles)
    ? user.roles
        .map((role: any) => normalizeRole(role))
        .filter((role:Role): role is Role => Boolean(role))
    : [];

  const payloadPermissions = Array.isArray(user.permissions)
    ? user.permissions.filter((permission: any) => typeof permission === 'string' && permission.trim())
    : [];

  const rolePermissions = normalizedRoles.flatMap((role: Role) =>
    (role.permissions ?? [])
      .map((permission: Permission) => permission.name)
      .filter((permission: string | undefined): permission is string => Boolean(permission)),
  );

  const permissionsMap = new Map<string, string>();
  [...payloadPermissions, ...rolePermissions].forEach((permission) => {
    const normalized = permission.toUpperCase();
    if (!permissionsMap.has(normalized)) {
      permissionsMap.set(normalized, normalized);
    }
  });

  return {
    ...user,
    firstName: user.first_name || user.firstName,
    lastName: user.last_name || user.lastName,
    profilePictureUrl:
      user.profile_picture_path || user.profile_picture_url || user.profilePictureUrl,
    phone: user.phone,
    isEmailVerified: user.is_email_verified || user.isEmailVerified,
    lastLoginAt: user.last_login_at || user.lastLoginAt,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
    roles: normalizedRoles,
    permissions: Array.from(permissionsMap.values()),
  };
}
