import bcrypt from "bcryptjs";
import { PrismaClient, TaskPriority, TaskStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const memberPasswordHash = await bcrypt.hash("Member@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@teamtasker.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@teamtasker.com",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN
    }
  });

  const member = await prisma.user.upsert({
    where: { email: "member@teamtasker.com" },
    update: {},
    create: {
      name: "Team Member",
      email: "member@teamtasker.com",
      passwordHash: memberPasswordHash,
      role: UserRole.MEMBER
    }
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-team-launch" },
    update: {},
    create: {
      id: "seed-project-team-launch",
      name: "Launch Website Refresh",
      description: "Coordinate the marketing site refresh, QA, and go-live tasks.",
      createdById: admin.id
    }
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: admin.id
      }
    },
    update: {},
    create: {
      projectId: project.id,
      userId: admin.id
    }
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: member.id
      }
    },
    update: {},
    create: {
      projectId: project.id,
      userId: member.id
    }
  });

  const existingTask = await prisma.task.findFirst({
    where: {
      title: "Prepare homepage QA checklist",
      projectId: project.id
    }
  });

  if (!existingTask) {
    await prisma.task.create({
      data: {
        title: "Prepare homepage QA checklist",
        description: "Cover responsive states, analytics, and form validation before release.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        projectId: project.id,
        assignedToId: member.id,
        createdById: admin.id
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
