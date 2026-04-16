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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Model versions</h1>
          <p className="text-sm text-slate-500">
            Train new XGBoost models on the UCI HAR dataset and switch which one serves
            inference.
          </p>
        </div>
        <button className="btn-primary" disabled={!isAdmin || training} onClick={handleTrain}>
          {training ? "Training…" : "Train new version"}
        </button>
      </div>

      {!isAdmin && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          You are signed in as a regular user. Only admins can train or activate models.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Version</th>
              <th className="px-6 py-3">Accuracy</th>
              <th className="px-6 py-3">Macro F1</th>
              <th className="px-6 py-3">Trained</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {models.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-3 font-medium text-slate-900">{m.version_name}</td>
                <td className="px-6 py-3 text-slate-700">{(m.accuracy * 100).toFixed(2)}%</td>
                <td className="px-6 py-3 text-slate-700">{m.macro_f1.toFixed(3)}</td>
                <td className="px-6 py-3 text-slate-500">
                  {new Date(m.train_date).toLocaleString()}
                </td>
                <td className="px-6 py-3">
                  {m.is_active ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  {!m.is_active && isAdmin && (
                    <button
                      className="text-brand-600 hover:underline"
                      onClick={() => handleActivate(m.id)}
                    >
                      Activate
                    </button>
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
