import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const ACTIVITY_COLORS = {
  WALKING: "#2563eb",
  WALKING_UPSTAIRS: "#16a34a",
  WALKING_DOWNSTAIRS: "#f59e0b",
  SITTING: "#9333ea",
  STANDING: "#0ea5e9",
  LAYING: "#ef4444",
};

const colorFor = (label) => ACTIVITY_COLORS[label] || "#64748b";

function Timeline({ entries }) {
  if (entries.length === 0) return null;
  const total = entries[entries.length - 1].end_time;

  return (
    <div className="space-y-2">
      <div className="relative h-10 w-full overflow-hidden rounded-md bg-slate-100">
        {entries.map((e) => {
          const left = (e.start_time / total) * 100;
          const width = ((e.end_time - e.start_time) / total) * 100;
          return (
            <div
              key={e.window_index}
              title={`${e.activity} · ${e.start_time.toFixed(2)}–${e.end_time.toFixed(2)}s · ${(e.confidence * 100).toFixed(1)}%`}
              className="absolute top-0 h-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: colorFor(e.activity),
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>0s</span>
        <span>{total.toFixed(1)}s</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        {Object.entries(ACTIVITY_COLORS).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-3 w-3 rounded" style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Report() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSession(token, id).then(setData).catch((e) => setError(e.message));
  }, [token, id]);

  const summaryRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary).map(([activity, seconds]) => ({
      activity,
      seconds,
    }));
  }, [data]);

  const accuracy = useMemo(() => {
    if (!data) return null;
    const withGt = data.timeline.filter((t) => t.ground_truth);
    if (withGt.length === 0) return null;
    const hits = withGt.filter((t) => t.ground_truth === t.activity).length;
    return { hits, total: withGt.length, pct: hits / withGt.length };
  }, [data]);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error} · <Link to="/" className="underline">Back to dashboard</Link>
      </div>
    );
  }
  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.filename}</h1>
          <p className="text-sm text-slate-500">
            Model {data.model_version} · {data.timeline.length} windows ·{" "}
            {new Date(data.uploaded_at).toLocaleString()}
          </p>
        </div>
        <Link to="/" className="btn-ghost">← All sessions</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase text-slate-500">Total windows</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">{data.timeline.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-slate-500">Activities detected</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">{summaryRows.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-slate-500">
            {accuracy ? "Match vs ground truth" : "Status"}
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {accuracy ? `${(accuracy.pct * 100).toFixed(1)}%` : data.status}
          </div>
          {accuracy && (
            <div className="mt-1 text-xs text-slate-500">
              {accuracy.hits}/{accuracy.total} correct
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">Activity timeline</h2>
        <p className="text-sm text-slate-500">
          Each segment is one 2.56 s window. Hover for details.
        </p>
        <div className="mt-4">
          <Timeline entries={data.timeline} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Time per activity</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={summaryRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="activity" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis unit="s" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="seconds">
                  {summaryRows.map((r) => (
                    <Cell key={r.activity} fill={colorFor(r.activity)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900">Distribution</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={summaryRows}
                  dataKey="seconds"
                  nameKey="activity"
                  outerRadius={90}
                  label={(e) => e.activity}
                >
                  {summaryRows.map((r) => (
                    <Cell key={r.activity} fill={colorFor(r.activity)} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Predictions</h2>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Confidence</th>
                <th className="px-6 py-3">Ground truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.timeline.map((e) => {
                const correct = e.ground_truth && e.ground_truth === e.activity;
                const wrong = e.ground_truth && e.ground_truth !== e.activity;
                return (
                  <tr key={e.window_index} className={wrong ? "bg-red-50/50" : ""}>
                    <td className="px-6 py-2 text-slate-500">{e.window_index}</td>
                    <td className="px-6 py-2 text-slate-500">
                      {e.start_time.toFixed(2)}–{e.end_time.toFixed(2)}s
                    </td>
                    <td className="px-6 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                        style={{
                          background: `${colorFor(e.activity)}20`,
                          color: colorFor(e.activity),
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorFor(e.activity) }} />
                        {e.activity}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-slate-700">{(e.confidence * 100).toFixed(1)}%</td>
                    <td className="px-6 py-2">
                      {e.ground_truth ? (
                        <span className={correct ? "text-emerald-700" : "text-red-700"}>
                          {e.ground_truth}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
