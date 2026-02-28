import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class QueryJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { query?: Record<string, any> }>();

    if (!req.headers?.authorization) {
      const rawToken =
        (req.query?.token as string | undefined) ??
        (req.query?.access_token as string | undefined) ??
        (req.query?.auth as string | undefined);

      if (rawToken) {
        const bearer = rawToken.startsWith('Bearer ')
          ? rawToken
          : `Bearer ${rawToken}`;
        (req.headers as any).authorization = bearer;
      }
    }

    return super.canActivate(context);
  }
}
