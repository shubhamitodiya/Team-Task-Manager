import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Project, Task, TaskPriority, TaskStatus, User } from "../types";

type ProjectDetails = Project & {
  tasks: Task[];
};

type TaskFormState = {
  title: string;
  description: string;
  assignedToId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
};

const defaultTaskForm: TaskFormState = {
  title: "",
  description: "",
  assignedToId: "",
  priority: "MEDIUM",
  status: "TODO",
  dueDate: ""
};

export function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { token, user } = useAuth();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [memberId, setMemberId] = useState("");
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [error, setError] = useState("");

  const unassignedUsers = useMemo(() => {
    if (!project) {
      return [];
    }

    const currentMemberIds = new Set(project.members.map((member) => member.user.id));
    return users.filter((candidate) => !currentMemberIds.has(candidate.id));
  }, [project, users]);

  async function loadProject() {
    if (!token || !projectId) {
      return;
    }

    try {
      const response = await api<ProjectDetails>(`/api/projects/${projectId}`, { token });
      setProject(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project.");
    }
  }

  async function loadUsers() {
    if (!token) {
      return;
    }

    try {
      const response = await api<User[]>("/api/users", { token });
      setUsers(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    }
  }

  useEffect(() => {
    void loadProject();
    void loadUsers();
  }, [token, projectId]);

  async function addMember(event: FormEvent) {
    event.preventDefault();

    if (!token || !projectId || !memberId) {
      return;
    }

    try {
      setError("");
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ userId: memberId })
      });
      setMemberId("");
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member.");
    }
  }

  async function createTask(event: FormEvent) {
    event.preventDefault();

    if (!token || !projectId) {
      return;
    }

    try {
      setError("");
      await api("/api/tasks", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...taskForm,
          projectId,
          assignedToId: taskForm.assignedToId || undefined,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : ""
        })
      });
      setTaskForm(defaultTaskForm);
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    if (!token) {
      return;
    }

    try {
      setError("");
      await api(`/api/tasks/${taskId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status })
      });
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Project workspace</p>
          <h2>{project?.name ?? "Loading project..."}</h2>
          <p className="muted">{project?.description}</p>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>Team members</h3>
          </div>
          <div className="member-list">
            {project?.members.map((member) => (
              <div key={member.id} className="member-row">
                <div>
                  <strong>{member.user.name}</strong>
                  <p>{member.user.email}</p>
                </div>
                <span className="badge neutral">{member.user.role}</span>
              </div>
            ))}
          </div>

          {user?.role === "ADMIN" ? (
            <form className="inline-form" onSubmit={addMember}>
              <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
                <option value="">Add a user to this project</option>
                {unassignedUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({candidate.role})
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="submit">
                Add member
              </button>
            </form>
          ) : null}
        </article>

        {user?.role === "ADMIN" ? (
          <article className="panel">
            <div className="panel-header">
              <h3>Create task</h3>
            </div>
            <form className="form-grid compact" onSubmit={createTask}>
              <label>
                Title
                <input
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, description: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Assign to
                <select
                  value={taskForm.assignedToId}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, assignedToId: event.target.value }))
                  }
                >
                  <option value="">Unassigned</option>
                  {project?.members.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Priority
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      priority: event.target.value as TaskPriority
                    }))
                  }
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      status: event.target.value as TaskStatus
                    }))
                  }
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                </select>
              </label>

              <label>
                Due date
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                />
              </label>

              <button className="primary-button" type="submit">
                Create task
              </button>
            </form>
          </article>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Tasks</h3>
        </div>
        <div className="task-list">
          {project?.tasks.length ? (
            project.tasks.map((task) => {
              const canUpdateStatus =
                user?.role === "ADMIN" || (user?.role === "MEMBER" && task.assignedToId === user.id);

              return (
                <div key={task.id} className="task-card rich">
                  <div className="task-card-top">
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                    </div>
                    <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>

                  <div className="task-meta">
                    <span>Assigned: {task.assignedTo?.name ?? "Unassigned"}</span>
                    <span>
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                    </span>
                  </div>

                  {canUpdateStatus ? (
                    <select
                      value={task.status}
                      onChange={(event) =>
                        void updateTaskStatus(task.id, event.target.value as TaskStatus)
                      }
                    >
                      <option value="TODO">To do</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  ) : (
                    <span className={`badge ${task.status.toLowerCase()}`}>{task.status}</span>
                  )}
                </div>
              );
            })
          ) : (
            <p className="muted">No tasks added yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
