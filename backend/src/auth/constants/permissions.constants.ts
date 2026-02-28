export enum PermissionName {
  //user management
  MANAGE_USERS = 'MANAGE_USERS', // create, edit, delete users
  MANAGE_ROLES = 'MANAGE_ROLES', // create, edit, delete roles
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS', // create, edit, delete permissions
  VIEW_USERS = 'VIEW_USERS', // view user list and details

  //reports
  VIEW_REPORTS = 'VIEW_REPORTS', // view various reports

  // Projects
  MANAGE_PROJECTS = 'MANAGE_PROJECTS', // create, edit, delete projects
  PROJECT_CREATE = 'PROJECT_CREATE', // create new projects
  PROJECT_VIEW_ALL = 'PROJECT_VIEW_ALL', // see all projects
  PROJECT_VIEW_ASSIGNED = 'PROJECT_VIEW_ASSIGNED', // see only assigned projects
  PROJECT_EDIT_ALL = 'PROJECT_EDIT_ALL', // edit any project
  PROJECT_EDIT_ASSIGNED = 'PROJECT_EDIT_ASSIGNED', // edit assigned projects only
  PROJECT_DELETE = 'PROJECT_DELETE', // delete any project

  PROJECT_MEMBER_ADD = 'PROJECT_MEMBER_ADD', // add a single member to project
  PROJECT_MEMBER_ADD_BULK = 'PROJECT_MEMBER_ADD_BULK', // add multiple members at once
  PROJECT_MEMBER_VIEW = 'PROJECT_MEMBER_VIEW', // view project members
  PROJECT_MEMBER_REMOVE = 'PROJECT_MEMBER_REMOVE', // remove a single member from project
  PROJECT_MEMBER_REMOVE_BULK = 'PROJECT_MEMBER_REMOVE_BULK', // remove multiple members at once
  PROJECT_MEMBER_MANAGE = 'PROJECT_MEMBER_MANAGE', // manage project membership (add/remove)

  // Tasks
  MANAGE_TASKS = 'MANAGE_TASKS', // create, edit, delete tasks
  TASK_CREATE = 'TASK_CREATE',
  TASK_VIEW_ALL = 'TASK_VIEW_ALL',
  TASK_VIEW_ASSIGNED = 'TASK_VIEW_ASSIGNED', // tasks where user is assignee / project member
  TASK_EDIT_ALL = 'TASK_EDIT_ALL',
  TASK_EDIT_ASSIGNED = 'TASK_EDIT_ASSIGNED',
  TASK_DELETE = 'TASK_DELETE',

  // Subtasks (same pattern as tasks)
  SUBTASK_CREATE = 'SUBTASK_CREATE',
  SUBTASK_VIEW_ALL = 'SUBTASK_VIEW_ALL',
  SUBTASK_VIEW_ASSIGNED = 'SUBTASK_VIEW_ASSIGNED',
  SUBTASK_EDIT_ALL = 'SUBTASK_EDIT_ALL',
  SUBTASK_EDIT_ASSIGNED = 'SUBTASK_EDIT_ASSIGNED',
  SUBTASK_DELETE = 'SUBTASK_DELETE',

  // Notifications
  MANAGE_NOTIFICATIONS = 'MANAGE_NOTIFICATIONS',
}
