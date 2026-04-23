import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function ModelAdmin() {
  const { token, user } = useAuth();
  const [models, setModels] = useState([]);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);

  const refresh = () => api.listModels(token).then(setModels).catch((e) => setError(e.message));

  useEffect(() => {
    refresh();
  }, [token]);

  const isAdmin = user?.role === "admin";

  const handleTrain = async () => {
    if (!isAdmin) return;
    setError(null);
    setTraining(true);
    try {
      await api.trainModel(token);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (id) => {
    setError(null);
    try {
      await api.activateModel(token, id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await api.deactivateModel(token, id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-line pb-5">
        <div>
          <div className="eyebrow">03 / Registry</div>
          <h1 className="mt-1 font-mono text-3xl uppercase tracking-wider text-ink">
            Model Versions
          </h1>
          <p className="mt-2 max-w-xl font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Train XGBoost models on UCI HAR · switch active inference version.
          </p>
        </div>
        <button className="btn-primary" disabled={!isAdmin || training} onClick={handleTrain}>
          {training ? "Training…" : "+ Train new"}
        </button>
      </div>

      {!isAdmin && (
        <div className="border border-line bg-paper-sub p-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Signed in as user · only admins can train/activate.
        </div>
      )}

      {error && (
        <div className="border border-accent bg-accent-soft p-3 font-mono text-[11px] uppercase tracking-wider text-accent">
          {error}
        </div>
      )}

      <div className="card p-0">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              <th className="px-6 py-3">Version</th>
              <th className="px-6 py-3">Accuracy</th>
              <th className="px-6 py-3">F1</th>
              <th className="px-6 py-3">Trained</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-paper-sub">
                <td className="px-6 py-4 font-mono text-sm text-ink">{m.version_name}</td>
                <td className="px-6 py-4 font-mono text-[11px] text-ink-muted">
                  {(m.accuracy * 100).toFixed(2)}%
                </td>
                <td className="px-6 py-4 font-mono text-[11px] text-ink-muted">
                  {m.macro_f1.toFixed(3)}
                </td>
                <td className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {new Date(m.train_date).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {m.is_active ? (
                    <span className="inline-flex items-center gap-1.5 border border-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink">
                      <span className="dot bg-ink" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                      <span className="dot bg-line-strong" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    m.is_active ? (
                      <button
                        className="font-mono text-[11px] uppercase tracking-widest text-ink-faint underline decoration-dotted underline-offset-4 hover:text-accent"
                        onClick={() => handleDeactivate(m.id)}
                      >
                        Deactivate →
                      </button>
                    ) : (
                      <button
                        className="font-mono text-[11px] uppercase tracking-widest text-ink underline decoration-dotted underline-offset-4 hover:text-accent"
                        onClick={() => handleActivate(m.id)}
                      >
                        Activate →
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
