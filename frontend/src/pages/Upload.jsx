import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Upload() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [labels, setLabels] = useState(null);
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
      const data = await api.uploadSession(token, file, modelId, labels);
      navigate(`/sessions/${data.session_id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-line pb-5">
        <div className="eyebrow">02 / Upload</div>
        <h1 className="mt-1 font-mono text-3xl uppercase tracking-wider text-ink">
          New Session
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase leading-relaxed tracking-wider text-ink-faint">
          CSV: one row per 2.56 s window of pre-extracted features. Optional
          <span className="kbd mx-1">activity</span> column kept as ground truth.
        </p>
      </div>

      <form className="card space-y-6" onSubmit={submit}>
        <div>
          <label className="label">Session file · CSV</label>
          <input
            className="input mt-2"
            type="file"
            accept=".csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          {file && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              · {file.name} · {(file.size / 1024).toFixed(1)} kb
            </p>
          )}
        </div>

        <div>
          <label className="label">Ground truth · labels file (optional)</label>
          <input
            className="input mt-2"
            type="file"
            accept=".csv,.txt"
            onChange={(e) => setLabels(e.target.files?.[0] || null)}
          />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            · one label per row · e.g. UCI <span className="kbd">y_test.txt</span> ·
            aligned with session rows
          </p>
          {labels && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              · {labels.name} · {(labels.size / 1024).toFixed(1)} kb
            </p>
          )}
        </div>

        <div>
          <label className="label">Model version</label>
          <select
            className="input mt-2"
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
          <div className="border border-accent bg-accent-soft p-3 font-mono text-[11px] uppercase tracking-wider text-accent">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-5">
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
