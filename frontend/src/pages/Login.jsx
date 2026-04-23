import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setAuth(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 border-b border-line pb-5">
          <span className="flex h-8 w-8 items-center justify-center border border-ink">
            <span className="h-2 w-2 rounded-full bg-ink" />
          </span>
          <div>
            <div className="eyebrow">Sign in</div>
            <div className="font-mono text-base uppercase tracking-widest text-ink">
              Actitrace
            </div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Email</label>
            <input
              className="input mt-2"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input mt-2"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="border border-accent bg-accent-soft p-3 font-mono text-[11px] uppercase tracking-wider text-accent">
              {error}
            </div>
          )}
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          No account?{" "}
          <Link to="/signup" className="text-ink underline decoration-dotted underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
