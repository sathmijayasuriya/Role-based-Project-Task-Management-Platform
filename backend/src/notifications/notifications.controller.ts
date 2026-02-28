import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import type { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryJwtAuthGuard } from '../auth/guards/query-jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Query() query: GetNotificationsDto, @Req() req) {
    return this.notificationsService.listForUser(req.user, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@Req() req) {
    return this.notificationsService.unreadCount(req.user);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req,
  ) {
    return this.notificationsService.markAsRead(id, req.user);
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  markAllRead(@Req() req) {
    return this.notificationsService.markAllAsRead(req.user);
  }

  @Sse('stream')
  @UseGuards(QueryJwtAuthGuard)
  stream(@Req() req) {
    return this.notificationsService.streamForUser(req.user).pipe(
      map(
        (data): MessageEvent => ({
          data,
        }),
      ),
    );
  }
}
