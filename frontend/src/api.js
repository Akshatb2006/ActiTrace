const BASE = "/api";

function authHeaders(token, extra = {}) {
  const h = { ...extra };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  signup: (email, password) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  me: (token) => fetch(`${BASE}/auth/me`, { headers: authHeaders(token) }).then(handle),

  listSessions: (token) =>
    fetch(`${BASE}/sessions`, { headers: authHeaders(token) }).then(handle),

  getSession: (token, id) =>
    fetch(`${BASE}/sessions/${id}`, { headers: authHeaders(token) }).then(handle),

  uploadSession: (token, file, modelVersionId) => {
    const fd = new FormData();
    fd.append("file", file);
    if (modelVersionId) fd.append("model_version_id", modelVersionId);
    return fetch(`${BASE}/sessions/upload`, {
      method: "POST",
      headers: authHeaders(token),
      body: fd,
    }).then(handle);
  },

  listModels: (token) =>
    fetch(`${BASE}/model/versions`, { headers: authHeaders(token) }).then(handle),

  trainModel: (token, versionName) =>
    fetch(`${BASE}/model/train`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(versionName ? { version_name: versionName } : {}),
    }).then(handle),

  activateModel: (token, id) =>
    fetch(`${BASE}/model/${id}/activate`, {
      method: "PATCH",
      headers: authHeaders(token),
    }).then(handle),
};
