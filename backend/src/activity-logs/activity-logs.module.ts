import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';
import { ActivityLogSubscriber } from './activity-log.subscriber';
import { RequestContextService } from '../common/context/request-context.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog]), NotificationsModule],
  controllers: [ActivityLogsController],
  providers: [
    ActivityLogsService,
    ActivityLogSubscriber,
    RequestContextService,
  ],
  exports: [ActivityLogsService, RequestContextService],
})
export class ActivityLogsModule {}
