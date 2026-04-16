import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const statusBadge = (status) => {
  const map = {
    completed: "bg-emerald-50 text-emerald-700",
    processing: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
    pending: "bg-slate-100 text-slate-600",
  };
  return `inline-flex rounded-full px-2 py-0.5 text-xs ${map[status] || map.pending}`;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500">
            All sensor sessions you've uploaded for activity recognition.
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          Upload session
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No sessions yet — upload your first sensor file to get started.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Uploaded</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{s.filename}</td>
                  <td className="px-6 py-3">
                    <span className={statusBadge(s.status)}>{s.status}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(s.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link to={`/sessions/${s.id}`} className="text-brand-600 hover:underline">
                      View report →
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
