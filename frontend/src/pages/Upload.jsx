import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Upload() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listModels(token).then(setModels).catch((e) => setError(e.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.uploadSession(token, file, modelId);
      navigate(`/sessions/${data.session_id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload sensor session</h1>
        <p className="text-sm text-slate-500">
          CSV with one row per 2.56 s window of pre-extracted features. An optional{" "}
          <code className="rounded bg-slate-100 px-1">activity</code> column is captured as
          ground truth for comparison.
        </p>
      </div>

      <form className="card space-y-5" onSubmit={submit}>
        <div>
          <label className="label">Session file (CSV)</label>
          <input
            className="input mt-1"
            type="file"
            accept=".csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          {file && (
            <p className="mt-2 text-xs text-slate-500">
              Selected: {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        <div>
          <label className="label">Model version</label>
          <select
            className="input mt-1"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          >
            <option value="">Active model (default)</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.version_name} · F1 {m.macro_f1.toFixed(3)}
                {m.is_active ? " · active" : ""}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={!file || busy}>
            {busy ? "Processing…" : "Upload & analyze"}
          </button>
        </div>
      </form>
    </div>
  );
}
