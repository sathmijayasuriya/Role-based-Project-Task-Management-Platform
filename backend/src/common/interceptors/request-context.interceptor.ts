import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';
import { Request } from 'express';

type RequestUser = {
  userId?: string;
  email?: string;
  roles?: string[];
};

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: RequestUser }>();

    return this.requestContext.run(() => {
      const user = req.user;
      if (user) {
        this.requestContext.set('userId', user.userId);
        this.requestContext.set('userEmail', user.email);
        this.requestContext.set('roles', user.roles);
      }

      return next.handle();
    });
  }
}
