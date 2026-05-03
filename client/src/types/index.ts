export type UserRole = "ADMIN" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ProjectMember {
  id: string;
  userId?: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  members: ProjectMember[];
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  createdBy?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface DashboardResponse {
  totalProjects: number;
  totalTasks: number;
  overdueTasks: number;
  myTasks: number;
  statusCounts: Array<{
    status: TaskStatus;
    _count: {
      status: number;
    };
  }>;
  recentTasks: Task[];
}
