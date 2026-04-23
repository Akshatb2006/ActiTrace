import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Signup() {
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
      const data = await api.signup(email, password);
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
            <span className="h-2 w-2 rounded-full bg-accent" />
          </span>
          <div>
            <div className="eyebrow">Create account</div>
            <div className="font-mono text-base uppercase tracking-widest text-ink">
              Actitrace
            </div>
          </div>
        </div>
        <p className="mb-5 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          First account becomes admin — trains & activates models.
        </p>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Email</label>
            <input
              className="input mt-2"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input mt-2"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="border border-accent bg-accent-soft p-3 font-mono text-[11px] uppercase tracking-wider text-accent">
              {error}
            </div>
          )}
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          Already registered?{" "}
          <Link to="/login" className="text-ink underline decoration-dotted underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
