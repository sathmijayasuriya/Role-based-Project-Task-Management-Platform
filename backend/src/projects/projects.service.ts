import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { In } from 'typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { Subtask } from 'src/subtasks/entities/subtask.entity';
import type { Client } from 'src/clients/entities/client.entity';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Subtask)
    private readonly subtaskRepo: Repository<Subtask>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -------- helpers --------

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return user.permissions?.includes(perm);
  }

  private async isUserAssignedToProject(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const memberCount = await this.projectMemberRepo.count({
      where: { project_id: projectId, user_id: userId },
    });

    if (memberCount > 0) return true;

    // also treat creator as "assigned"
    const project = await this.projectRepo.findOne({
      where: { id: projectId, is_deleted: false },
      select: ['id', 'created_by'],
    });

    return project ? project.created_by === userId : false;
  }

  private async attachTasksAndMembers(projects: Project[]) {
    if (projects.length === 0) return projects;

    const projectIds = projects.map((p) => p.id);

    const [tasks, members] = await Promise.all([
      this.taskRepo.find({
        where: { project_id: In(projectIds), is_deleted: false },
        relations: ['subtasks'],
        order: { created_at: 'DESC' },
      }),
      this.projectMemberRepo.find({
        where: { project_id: In(projectIds) },
        order: { joined_at: 'ASC' },
      }),
    ]);

    const filteredTasks = tasks.map((task) => {
      const activeSubs = task.subtasks?.filter((st) => !st.is_deleted) ?? [];
      return { ...task, subtasks: activeSubs };
    });

    const shapeClient = (client?: Client | null) =>
      client
        ? {
            id: client.id,
            name: client.name,
            email: client.email ?? null,
            contact_person_name: client.contact_person_name ?? null,
            logo_url: client.logo_url ?? null,
          }
        : null;

    return projects.map((project) => {
      const projectTasks = filteredTasks.filter(
        (t) => t.project_id === project.id,
      );
      const projectMembers = members.filter((m) => m.project_id === project.id);

      return {
        ...project,
        client: shapeClient(project.client),
        tasks: projectTasks,
        members: projectMembers,
      };
    });
  }

  // -------- CRUD operations --------

  async create(dto: CreateProjectDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.PROJECT_CREATE)) {
      throw new ForbiddenException('You cannot create projects');
    }

    const project = this.projectRepo.create({
      name: dto.name,
      description: dto.description,
      priority: dto.priority,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
      status: 'active',
      created_by: currentUser.userId,
      updated_by: currentUser.userId,
      client_id: dto.client_id ?? null,
    });

    const saved = await this.projectRepo.save(project);

    // auto-add creator as member with role 'owner' (optional)
    await this.projectMemberRepo.save({
      project_id: saved.id,
      user_id: currentUser.userId,
      assigned_role: 'owner',
    });

    return saved;
  }

  async findAllForUser(currentUser: JwtUser) {
    const canViewAll = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ALL,
    );
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view projects');
    }

    if (canViewAll) {
      const projects = await this.projectRepo.find({
        where: { is_deleted: false },
        relations: ['client'],
        order: { created_at: 'DESC' },
      });

      return this.attachTasksAndMembers(projects);
    }

    // VIEW_ASSIGNED: projects where user is member or creator
    const memberRows = await this.projectMemberRepo.find({
      where: { user_id: currentUser.userId },
    });

    const memberProjectIds = memberRows.map((m) => m.project_id);

    if (memberProjectIds.length === 0) {
      return [];
    }

    const projects = await this.projectRepo.find({
      where: {
        is_deleted: false,
        id: In(memberProjectIds),
      },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });

    return this.attachTasksAndMembers(projects);
  }

  async findOneForUser(id: string, currentUser: JwtUser) {
    const canViewAll = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ALL,
    );
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_VIEW_ASSIGNED,
    );

    const project = await this.projectRepo.findOne({
      where: { id, is_deleted: false },
      relations: ['client'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (canViewAll) {
      return this.attachTasksAndMembers([project]).then((res) => res[0]);
    }

    if (canViewAssigned) {
      const isAssigned = await this.isUserAssignedToProject(
        id,
        currentUser.userId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('You cannot view this project');
      }
      return this.attachTasksAndMembers([project]).then((res) => res[0]);
    }

    throw new ForbiddenException('You cannot view projects');
  }

  async updateForUser(id: string, dto: UpdateProjectDto, currentUser: JwtUser) {
    const canEditAll = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_EDIT_ALL,
    );
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.PROJECT_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot edit projects');
    }

    const project = await this.projectRepo.findOne({
      where: { id, is_deleted: false },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!canEditAll) {
      const isAssigned = await this.isUserAssignedToProject(
        id,
        currentUser.userId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('You cannot edit this project');
      }
    }

    const before = { ...project };

    await this.projectRepo.update(id, {
      ...dto,
      updated_by: currentUser.userId,
      updated_at: new Date(),
    });

    const updated = await this.findOneForUser(id, currentUser);

    await this.activityLogs.logEntityChange({
      entityType: 'project',
      entityId: id,
      action: 'UPDATE',
      before,
      after: updated,
      meta: {
        updatedFields: Object.keys(dto),
      },
    });

    return updated;
  }

  async removeForUser(id: string, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.PROJECT_DELETE)) {
      throw new ForbiddenException('You cannot delete projects');
    }

    const project = await this.projectRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const deletePayload = {
      is_deleted: true,
      deleted_at: new Date(),
      updated_by: currentUser.userId,
      updated_at: new Date(),
    };

    await this.projectRepo.update(id, deletePayload);

    await this.activityLogs.logEntityChange({
      entityType: 'project',
      entityId: id,
      action: 'DELETE',
      before: project,
      after: { ...project, ...deletePayload },
    });

    return { success: true };
  }
}
