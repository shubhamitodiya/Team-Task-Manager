# Team Task Manager

A full-stack task management app where teams can create projects, assign tasks, and track delivery progress with Admin and Member roles.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma ORM
- Auth: JWT + bcrypt
- Deployment: Railway

## Features

- Signup and login with password validation
- Role-based access control
  - `ADMIN`: create projects, add members, assign tasks
  - `MEMBER`: view their projects and update the status of tasks assigned to them
- Project creation and team membership management
- Task creation, assignment, priority, due dates, and status tracking
- Dashboard with project count, task count, overdue tasks, and task status breakdown
- Input validation with Zod

## Project Structure

```text
.
├── client/   # React frontend
├── server/   # Express API + Prisma schema
└── railway.json
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `server/.env` from `server/.env.example`.

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/team_task_manager
JWT_SECRET=super-secret-key
```

### 3. Create the database schema

```bash
npm run prisma:migrate
```

### 4. Seed demo data (optional but recommended)

```bash
npm run prisma:seed
```

Demo accounts after seeding:

- Admin: `admin@teamtasker.com` / `Admin@123`
- Member: `member@teamtasker.com` / `Member@123`

### 5. Start the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

## Railway Deployment

### 1. Push the repo to GitHub

```bash
git init
git add .
git commit -m "Build team task manager"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Create Railway services

1. Create a new Railway project.
2. Add a PostgreSQL database service.
3. Add your GitHub repo as the app service.

### 3. Set Railway environment variables

- `DATABASE_URL`: use the Railway PostgreSQL connection string
- `JWT_SECRET`: any strong random secret
- `PORT`: Railway injects this automatically, but setting `4000` locally is fine

### 4. Deploy

This repo already includes:

- `railway.json`
- root `build` script that runs Prisma generate and compiles both apps
- root `start` script that runs `prisma migrate deploy` before starting Express

After the first deploy, open a Railway shell or run a one-off command to seed demo data if you want sample records:

```bash
npm run prisma:seed
```

## Core API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/users`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`

## Submission Checklist

- Live Railway URL
- GitHub repo URL
- Updated `README.md`
- 2 to 5 minute demo video

## Demo Video Outline

1. Show signup or login.
2. Show admin dashboard metrics.
3. Create a project.
4. Add a member to the project.
5. Create and assign a task.
6. Log in as a member and update task status.
7. Show the refreshed dashboard and overdue tracking.

## Validation Notes

- Passwords must be at least 8 characters and include letters and numbers.
- Duplicate emails are blocked.
- A task assignee must belong to the same project.
- Members can only update the status of tasks assigned to them.

## What I Verified

- Server TypeScript build passes
- Client TypeScript build passes
- Client production build passes

Full runtime testing still requires a live PostgreSQL `DATABASE_URL`.
