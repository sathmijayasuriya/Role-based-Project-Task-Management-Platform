import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PermissionName } from '../auth/constants/permissions.constants';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Permissions(PermissionName.MANAGE_NOTIFICATIONS)
  async createForRoles(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createForRoles(dto);
  }
}
