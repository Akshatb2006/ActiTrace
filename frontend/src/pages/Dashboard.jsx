import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const statusBadge = (status) => {
  const map = {
    completed: "border-ink text-ink",
    processing: "border-ink-faint text-ink-faint",
    failed: "border-accent text-accent",
    pending: "border-line text-ink-muted",
  };
  return `inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
    map[status] || map.pending
  }`;
};

const statusDot = (status) => {
  const map = {
    completed: "bg-ink",
    processing: "bg-ink-faint animate-pulse",
    failed: "bg-accent",
    pending: "bg-line-strong",
  };
  return `dot ${map[status] || map.pending}`;
};

export default function Dashboard() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSessions(token)
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-line pb-5">
        <div>
          <div className="eyebrow">01 / Sessions</div>
          <h1 className="mt-1 font-mono text-3xl uppercase tracking-wider text-ink">
            Activity Log
          </h1>
          <p className="mt-2 max-w-lg font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            All sensor sessions uploaded for activity recognition.
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          + Upload
        </Link>
      </div>

      {error && (
        <div className="border border-accent bg-accent-soft p-3 font-mono text-[11px] uppercase tracking-wider text-accent">
          {error}
        </div>
      )}

      <div className="card p-0">
        {loading ? (
          <div className="p-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-dots p-16 text-center">
            <div className="eyebrow">Empty</div>
            <p className="mt-2 font-mono text-sm uppercase tracking-wider text-ink">
              No sessions yet
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              Upload a sensor file to begin.
            </p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-line">
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Uploaded</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr key={s.id} className="transition hover:bg-paper-sub">
                  <td className="px-6 py-4 font-mono text-sm text-ink">{s.filename}</td>
                  <td className="px-6 py-4">
                    <span className={statusBadge(s.status)}>
                      <span className={statusDot(s.status)} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                    {new Date(s.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/sessions/${s.id}`}
                      className="font-mono text-[11px] uppercase tracking-widest text-ink underline decoration-dotted underline-offset-4 hover:text-accent"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
