import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectMembersService } from 'src/project-members/project-members.service';
import { UpdateProjectMembersDto } from 'src/project-members/dto/update-project-members.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Post()
  @Permissions(PermissionName.PROJECT_CREATE)
  create(@Body() dto: CreateProjectDto, @Req() req) {
    return this.projectsService.create(dto, req.user);
  }

  @Get()
  @Permissions(
    PermissionName.PROJECT_VIEW_ALL,
    PermissionName.PROJECT_VIEW_ASSIGNED,
  )
  findAll(@Req() req) {
    return this.projectsService.findAllForUser(req.user);
  }

  @Get(':id')
  @Permissions(
    PermissionName.PROJECT_VIEW_ALL,
    PermissionName.PROJECT_VIEW_ASSIGNED,
  )
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.projectsService.findOneForUser(id, req.user);
  }

  @Get(':id/members')
  @Permissions(
    PermissionName.PROJECT_MEMBER_VIEW,
    PermissionName.PROJECT_MEMBER_MANAGE,
    PermissionName.PROJECT_VIEW_ALL,
    PermissionName.PROJECT_VIEW_ASSIGNED,
  )
  findMembers(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.projectMembersService.getMembersForProject(id, req.user);
  }

  @Post(':id/members')
  @Permissions(PermissionName.PROJECT_MEMBER_MANAGE)
  syncMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectMembersDto,
    @Req() req,
  ) {
    return this.projectMembersService.syncProjectMembers(id, dto, req.user);
  }

  @Patch(':id')
  @Permissions(
    PermissionName.PROJECT_EDIT_ALL,
    PermissionName.PROJECT_EDIT_ASSIGNED,
  )
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req,
  ) {
    return this.projectsService.updateForUser(id, dto, req.user);
  }

  @Delete(':id')
  @Permissions(PermissionName.PROJECT_DELETE)
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.projectsService.removeForUser(id, req.user);
  }

  // @Post(':id/members')
  // @Permissions(
  //   PermissionName.PROJECT_MEMBER_ADD,
  //   PermissionName.PROJECT_MEMBER_ADD_BULK,
  // )
  // addMember(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  //   @Body() dto: CreateProjectMemberDto,
  //   @Req() req,
  // ) {
  //   return this.projectMembersService.addMemberToProject(id, dto, req.user);
  // }

  // @Delete(':id/members/:userId')
  // @Permissions(
  //   PermissionName.PROJECT_MEMBER_REMOVE,
  //   PermissionName.PROJECT_MEMBER_REMOVE_BULK,
  // )
  // removeMember(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  //   @Param('userId', new ParseUUIDPipe()) memberUserId: string,
  //   @Req() req,
  // ) {
  //   return this.projectMembersService.removeMemberFromProject(
  //     id,
  //     memberUserId,
  //     req.user,
  //   );
  // }
}
