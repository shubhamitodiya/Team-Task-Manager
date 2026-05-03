import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">Assignment-ready full stack app</p>
        <h1>Coordinate teams, not spreadsheets.</h1>
        <p>
          Sign in to manage projects, assign work, and track overdue tasks in one live Railway-ready
          application.
        </p>
      </section>

      <section className="auth-card">
        <h2>Welcome back</h2>
        <p className="muted">Use the seeded demo accounts or create a new user.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="admin@teamtasker.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Admin@123"
              required
            />
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="demo-box">
          <strong>Demo accounts</strong>
          <p>`admin@teamtasker.com` / `Admin@123`</p>
          <p>`member@teamtasker.com` / `Member@123`</p>
        </div>

        <p className="switch-link">
          No account yet? <Link to="/signup">Create one</Link>
        </p>
      </section>
    </div>
  );
}
