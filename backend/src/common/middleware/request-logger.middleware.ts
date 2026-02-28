import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.warn(`${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      this.logger.warn(`Body: ${JSON.stringify(req.body)}`);
    } else {
      this.logger.warn('Body: <empty>');
    }
    next();
  }
}
