import path from "node:path";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { Prisma, TaskStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

type AuthedRequest = Request & {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
  };
};

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json());

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain letters and numbers."),
  role: z.nativeEnum(UserRole).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const projectSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(500)
});

const addMemberSchema = z.object({
  userId: z.string().min(1)
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(5).max(500),
  projectId: z.string().min(1),
  assignedToId: z.string().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  dueDate: z.string().datetime().optional().or(z.literal(""))
});

const taskUpdateSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().min(5).max(500).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().nullable().optional()
});

function signToken(user: { id: string; email: string; role: UserRole; name: string }) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

async function ensureProjectAccess(userId: string, role: UserRole, projectId: string) {
  if (role === UserRole.ADMIN) {
    return prisma.project.findUnique({
      where: { id: projectId }
    });
  }

  return prisma.project.findFirst({
    where: {
      id: projectId,
      members: {
        some: {
          userId
        }
      }
    }
  });
}

function sanitizeUser(user: { id: string; name: string; email: string; role: UserRole }) {
  return user;
}

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = jwt.verify(token, config.jwtSecret) as AuthedRequest["user"];

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Admin access required." });
  }

  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role ?? UserRole.MEMBER
      }
    });

    const authUser = sanitizeUser(user);
    return res.status(201).json({
      token: signToken(authUser),
      user: authUser
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const authUser = sanitizeUser(user);
    return res.json({
      token: signToken(authUser),
      user: authUser
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(user);
});

app.get("/api/users", requireAuth, async (req: AuthedRequest, res) => {
  const users = await prisma.user.findMany({
    where: req.user?.role === UserRole.ADMIN ? {} : { role: UserRole.MEMBER },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    },
    orderBy: { createdAt: "asc" }
  });

  return res.json(users);
});

app.get("/api/projects", requireAuth, async (req: AuthedRequest, res) => {
  const projects = await prisma.project.findMany({
    where:
      req.user?.role === UserRole.ADMIN
        ? {}
        : {
            members: {
              some: {
                userId: req.user!.id
              }
            }
          },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      },
      _count: {
        select: {
          tasks: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return res.json(projects);
});

app.post("/api/projects", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        createdById: req.user!.id,
        members: {
          create: {
            userId: req.user!.id
          }
        }
      }
    });

    return res.status(201).json(project);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/projects/:projectId", requireAuth, async (req: AuthedRequest, res) => {
  const projectId = getRouteParam(req.params.projectId);
  const project = await ensureProjectAccess(req.user!.id, req.user!.role, projectId);

  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const fullProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      },
      tasks: {
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { dueDate: "asc" },
          { createdAt: "desc" }
        ]
      }
    }
  });

  return res.json(fullProject);
});

app.post("/api/projects/:projectId/members", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const projectId = getRouteParam(req.params.projectId);
    const data = addMemberSchema.parse(req.body);
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user.id
        }
      },
      update: {},
      create: {
        projectId: project.id,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.status(201).json(member);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/tasks", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const data = taskCreateSchema.parse(req.body);
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      include: { members: true }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (data.assignedToId && !project.members.some((member) => member.userId === data.assignedToId)) {
      return res.status(400).json({ message: "Assignee must be a member of the selected project." });
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: req.user!.id
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/tasks/:taskId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const taskId = getRouteParam(req.params.taskId);
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const hasProjectAccess =
      req.user!.role === UserRole.ADMIN ||
      task.project.members.some((member) => member.userId === req.user!.id);

    if (!hasProjectAccess) {
      return res.status(403).json({ message: "You do not have access to this task." });
    }

    const data = taskUpdateSchema.parse(req.body);

    if (req.user!.role === UserRole.MEMBER) {
      const allowedStatusOnly = Object.keys(data).every((key) => key === "status");
      const isOwnTask = task.assignedToId === req.user!.id;

      if (!isOwnTask || !allowedStatusOnly) {
        return res
          .status(403)
          .json({ message: "Members can only update the status of tasks assigned to them." });
      }
    }

    if (
      data.assignedToId &&
      !task.project.members.some((member) => member.userId === data.assignedToId)
    ) {
      return res.status(400).json({ message: "Assignee must belong to the same project." });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId ?? undefined,
        priority: data.priority,
        status: data.status,
        dueDate:
          data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.json(updatedTask);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/dashboard", requireAuth, async (req: AuthedRequest, res) => {
  const projectFilter =
    req.user!.role === UserRole.ADMIN
      ? {}
      : {
          project: {
            members: {
              some: {
                userId: req.user!.id
              }
            }
          }
        };

  const myTaskFilter =
    req.user!.role === UserRole.ADMIN
      ? {}
      : {
          assignedToId: req.user!.id
        };

  const now = new Date();
  const [totalProjects, totalTasks, overdueTasks, myTasks, statusCounts, recentTasks] =
    await Promise.all([
      prisma.project.count({
        where:
          req.user!.role === UserRole.ADMIN
            ? {}
            : {
                members: {
                  some: {
                    userId: req.user!.id
                  }
                }
              }
      }),
      prisma.task.count({
        where: projectFilter
      }),
      prisma.task.count({
        where: {
          ...projectFilter,
          dueDate: {
            lt: now
          },
          status: {
            not: TaskStatus.DONE
          }
        }
      }),
      prisma.task.count({
        where: {
          ...projectFilter,
          ...myTaskFilter
        }
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: projectFilter,
        _count: {
          status: true
        }
      }),
      prisma.task.findMany({
        where: projectFilter,
        take: 6,
        orderBy: [
          { updatedAt: "desc" }
        ],
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

  return res.json({
    totalProjects,
    totalTasks,
    overdueTasks,
    myTasks,
    statusCounts,
    recentTasks
  });
});

// app.use(express.static(config.clientBuildPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(
    path.join(config.clientBuildPath, "index.html")
  );
});
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Validation failed.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      message: "Database request failed.",
      code: error.code
    });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error." });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
