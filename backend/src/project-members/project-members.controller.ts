import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ProjectMembersService } from './project-members.service';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Controller('project-members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}
  @Post(':id/members')
  @Permissions(PermissionName.PROJECT_MEMBER_MANAGE)
  addMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateProjectMemberDto,
    @Req() req,
  ) {
    return this.projectMembersService.addMemberToProject(id, dto, req.user);
  }

  @Delete(':id/members/:userId')
  @Permissions(PermissionName.PROJECT_MEMBER_MANAGE)
  removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) memberUserId: string,
    @Req() req,
  ) {
    return this.projectMembersService.removeMemberFromProject(
      id,
      memberUserId,
      req.user,
    );
  }

  @Get(':id/members')
  @Permissions(
    PermissionName.PROJECT_MEMBER_VIEW,
    PermissionName.PROJECT_MEMBER_MANAGE,
    PermissionName.PROJECT_VIEW_ALL,
    PermissionName.PROJECT_VIEW_ASSIGNED,
  )
  listMembers(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.projectMembersService.getMembersForProject(id, req.user);
  }
}
