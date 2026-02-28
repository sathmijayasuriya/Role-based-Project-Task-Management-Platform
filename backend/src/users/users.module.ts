import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './controllers/users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AdminUsersController } from './controllers/admin-users.controller';
import { Role } from '../roles/entities/role.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { MailModule } from '../mail/mail.module';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, EmailVerificationToken]),
    MailModule,
    ActivityLogsModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
