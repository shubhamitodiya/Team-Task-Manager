import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { DashboardResponse } from "../types";

const statusLabels = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done"
};

export function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    api<DashboardResponse>("/api/dashboard", { token })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."));
  }, [token]);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>{user?.role === "ADMIN" ? "Team delivery snapshot" : "Your assigned workload"}</h2>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Projects</span>
          <strong>{data?.totalProjects ?? "--"}</strong>
        </article>
        <article className="stat-card">
          <span>Total tasks</span>
          <strong>{data?.totalTasks ?? "--"}</strong>
        </article>
        <article className="stat-card">
          <span>My tasks</span>
          <strong>{data?.myTasks ?? "--"}</strong>
        </article>
        <article className="stat-card alert">
          <span>Overdue</span>
          <strong>{data?.overdueTasks ?? "--"}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>Status breakdown</h3>
          </div>
          <div className="status-list">
            {data?.statusCounts.length ? (
              data.statusCounts.map((item) => (
                <div key={item.status} className="status-row">
                  <span>{statusLabels[item.status]}</span>
                  <strong>{item._count.status}</strong>
                </div>
              ))
            ) : (
              <p className="muted">No task metrics yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Recent task activity</h3>
          </div>
          <div className="task-list">
            {data?.recentTasks.length ? (
              data.recentTasks.map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-card-top">
                    <strong>{task.title}</strong>
                    <span className={`badge ${task.status.toLowerCase()}`}>{statusLabels[task.status]}</span>
                  </div>
                  <p>{task.project?.name}</p>
                  <small>
                    {task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : "Unassigned"}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No recent tasks yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
