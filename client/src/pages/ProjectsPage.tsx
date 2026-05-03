import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Project } from "../types";

export function ProjectsPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProjects() {
    if (!token) {
      return;
    }

    try {
      const response = await api<Project[]>("/api/projects", { token });
      setProjects(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api("/api/projects", {
        method: "POST",
        token,
        body: JSON.stringify(form)
      });
      setForm({ name: "", description: "" });
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>{user?.role === "ADMIN" ? "Create and manage project spaces" : "Projects you belong to"}</h2>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      {user?.role === "ADMIN" ? (
        <section className="panel">
          <div className="panel-header">
            <h3>New project</h3>
          </div>
          <form className="form-grid compact" onSubmit={onSubmit}>
            <label>
              Project name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create project"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="project-grid">
        {projects.map((project) => (
          <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
            <div className="project-card-top">
              <h3>{project.name}</h3>
              <span>{project._count?.tasks ?? 0} tasks</span>
            </div>
            <p>{project.description}</p>
            <small>{project.members.length} team members</small>
          </Link>
        ))}
      </section>
    </div>
  );
}
