import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    this.logger.debug(
      `requiredRoles=${JSON.stringify(requiredRoles)} user=${JSON.stringify(
        user,
      )}`,
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRoles: string[] = (user?.roles ?? []).map((r: string) =>
      String(r).toLowerCase(),
    );
    const normalizedRequired = requiredRoles.map((r) =>
      String(r).toLowerCase(),
    );
    const allowed = normalizedRequired.some((role) => userRoles.includes(role));

    this.logger.debug(
      `userRoles=${JSON.stringify(userRoles)} allowed=${allowed}`,
    );

    return allowed;
  }
}
