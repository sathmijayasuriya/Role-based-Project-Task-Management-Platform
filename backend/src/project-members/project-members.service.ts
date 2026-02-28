import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMembersDto } from './dto/update-project-members.dto';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from 'src/projects/entities/project.entity';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { User } from 'src/users/entities/user.entity';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

interface JwtUser {
  userId: string;
  permissions: string[];
}

type ProjectMemberWithUser = ProjectMember & {
  user?: Pick<
    User,
    'id' | 'first_name' | 'last_name' | 'email' | 'status'
  > | null;
};

@Injectable()
export class ProjectMembersService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -------- project member management --------
  async getMembersForProject(projectId: string, currentUser: JwtUser) {
    const canManageMembers = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_MEMBER_MANAGE,
    );
    const canViewMembers =
      this.hasPerm(currentUser, PermissionName.PROJECT_MEMBER_VIEW) ||
      canManageMembers;
    const canViewAllProjects = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ALL,
    );
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ASSIGNED,
    );

    if (!canViewMembers && !canViewAllProjects && !canViewAssigned) {
      throw new ForbiddenException('You cannot view project members');
    }

    await this.ensureProjectExists(projectId);

    if (!canViewAllProjects && !canManageMembers) {
      const isAssigned = await this.isUserAssignedToProject(
        projectId,
        currentUser.userId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('You cannot view members of this project');
      }
    }

    return this.loadMembersWithUsers(projectId);
  }

  async addMemberToProject(
    projectId: string,
    dto: CreateProjectMemberDto,
    currentUser: JwtUser,
  ) {
    return this.syncProjectMembers(
      projectId,
      { add: [dto.userId].filter(Boolean) },
      currentUser,
    );
  }

  async removeMemberFromProject(
    projectId: string,
    memberUserId: string,
    currentUser: JwtUser,
  ) {
    return this.syncProjectMembers(
      projectId,
      { remove: [memberUserId].filter(Boolean) },
      currentUser,
    );
  }

  async syncProjectMembers(
    projectId: string,
    dto: UpdateProjectMembersDto,
    currentUser: JwtUser,
  ) {
    const canManageMembers = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_MEMBER_MANAGE,
    );
    if (!canManageMembers) {
      throw new ForbiddenException('You cannot manage project members');
    }

    await this.ensureProjectExists(projectId);

    const canManageAcrossProjects = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ALL,
    );

    if (!canManageAcrossProjects) {
      const isAssigned = await this.isUserAssignedToProject(
        projectId,
        currentUser.userId,
      );
      if (!isAssigned) {
        throw new ForbiddenException(
          'You must be a member of this project to manage members',
        );
      }
    }

    const removalIds = new Set(dto.remove ?? []);
    const additions = Array.from(new Set(dto.add ?? [])).filter(
      (id) => id && !removalIds.has(id),
    );
    const removals = Array.from(removalIds).filter(Boolean);

    if (additions.length) {
      const userMap = await this.loadUsersMap(additions);
      const existing = await this.projectMemberRepo.find({
        where: { project_id: projectId, user_id: In(additions) },
      });
      const existingIds = new Set(existing.map((m) => m.user_id));
      const newMembers = additions
        .filter((id) => !existingIds.has(id))
        .map((userId) =>
          this.projectMemberRepo.create({
            project_id: projectId,
            user_id: userId,
            assigned_role: 'member',
          }),
        );

      if (newMembers.length) {
        await this.projectMemberRepo.save(newMembers);
        // Log additions for notifications
        await Promise.all(
          newMembers.map((member) =>
            this.activityLogs.logActivity({
              entityType: 'project_member',
              entityId: projectId,
              action: 'CREATE',
              beforeData: null,
              afterData: {
                project_id: projectId,
                user_id: member.user_id,
                assigned_role: member.assigned_role,
                first_name: userMap.get(member.user_id)?.first_name,
                last_name: userMap.get(member.user_id)?.last_name,
                email: userMap.get(member.user_id)?.email,
              },
            }),
          ),
        );
      }
    }

    if (removals.length) {
      const userMap = await this.loadUsersMap(removals);
      await this.projectMemberRepo.delete({
        project_id: projectId,
        user_id: In(removals),
      });
      await Promise.all(
        removals.map((userId) =>
          this.activityLogs.logActivity({
            entityType: 'project_member',
            entityId: projectId,
            action: 'DELETE',
            beforeData: {
              project_id: projectId,
              user_id: userId,
              first_name: userMap.get(userId)?.first_name,
              last_name: userMap.get(userId)?.last_name,
              email: userMap.get(userId)?.email,
            },
            afterData: null,
          }),
        ),
      );
    }

    const members = await this.loadMembersWithUsers(projectId);

    return { members };
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, is_deleted: false },
      select: ['id', 'created_by'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async loadMembersWithUsers(
    projectId: string,
  ): Promise<ProjectMemberWithUser[]> {
    const members = await this.projectMemberRepo.find({
      where: { project_id: projectId },
      order: { joined_at: 'ASC' },
    });

    if (!members.length) return [];

    const userIds = members.map((member) => member.user_id);
    const users = await this.userRepo.find({
      where: { id: In(userIds), is_deleted: false },
      select: ['id', 'first_name', 'last_name', 'email', 'status'],
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return members.map((member) => ({
      ...member,
      user: userMap.get(member.user_id) ?? null,
    }));
  }

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return !!user.permissions?.includes(perm);
  }

  private async isUserAssignedToProject(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const memberCount = await this.projectMemberRepo.count({
      where: { project_id: projectId, user_id: userId },
    });

    if (memberCount > 0) return true;

    const project = await this.projectRepo.findOne({
      where: { id: projectId, is_deleted: false },
      select: ['id', 'created_by'],
    });

    return project ? project.created_by === userId : false;
  }

  private async loadUsersMap(userIds: string[]): Promise<Map<string, User>> {
    if (!userIds.length) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'first_name', 'last_name', 'email'],
    });
    return new Map(users.map((u) => [u.id, u]));
  }
}
