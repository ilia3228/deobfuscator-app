// Thin client for the mock-api backend. All paths are same-origin and proxied
// by Vite (see vite.config.js) to http://127.0.0.1:8090 in development.
//
// Bearer tokens live in localStorage under TOKEN_KEY. Every fetch and SSE
// subscription pulls the token from there; EventSource can't set headers,
// so the token is also appended to the stream URL as `?token=…`.

const BASE = '/api';
const TOKEN_KEY = 'jsdeobf.token';

// ─── token helpers ───────────────────────────────────────────────────────────
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* noop */ }
}
export function clearToken() { setToken(null); }

function authHeaders(extra) {
  const t = getToken();
  const h = { ...(extra || {}) };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail || ''; } catch { /* noop */ }
    const err = new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ─── auth ────────────────────────────────────────────────────────────────────
export async function signup({ email, password, name }) {
  const data = await jsonOrThrow(await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: name || '' }),
  }));
  if (data?.token) setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await jsonOrThrow(await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  if (data?.token) setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: authHeaders() });
  } catch { /* noop */ }
  clearToken();
}

export async function me() {
  return jsonOrThrow(await fetch(`${BASE}/auth/me`, { headers: authHeaders() }));
}

// ─── public ──────────────────────────────────────────────────────────────────
export async function getHealth() {
  return jsonOrThrow(await fetch(`${BASE}/health`));
}

// ─── sessions / jobs ─────────────────────────────────────────────────────────
export async function getSessions() {
  return jsonOrThrow(await fetch(`${BASE}/sessions`, { headers: authHeaders() }));
}

/**
 * Upload a sample for analysis.
 * @param {File|Blob} file
 * @param {{useLlm?: boolean, dynamicEval?: boolean, autoIoc?: boolean, langHint?: 'js'|'py', speed?: 'normal'|'fast', filename?: string}} opts
 * @returns {Promise<{job_id: string, lang: 'js'|'py', filename: string, size: number}>}
 */
export async function analyze(file, opts = {}) {
  const fd = new FormData();
  const name = opts.filename || (file && file.name) || 'pasted.txt';
  fd.append('file', file, name);
  fd.append('use_llm', opts.useLlm === true ? 'true' : 'false');
  fd.append('dynamic_eval', opts.dynamicEval === false ? 'false' : 'true');
  fd.append('auto_ioc', opts.autoIoc === false ? 'false' : 'true');
  if (opts.langHint) fd.append('lang_hint', opts.langHint);
  fd.append('speed', opts.speed || 'normal');
  return jsonOrThrow(await fetch(`${BASE}/analyze`, {
    method: 'POST', body: fd, headers: authHeaders(),
  }));
}

export async function getJob(jobId) {
  return jsonOrThrow(await fetch(`${BASE}/jobs/${jobId}`, { headers: authHeaders() }));
}

export async function cancelJob(jobId) {
  return jsonOrThrow(await fetch(`${BASE}/jobs/${jobId}/cancel`, {
    method: 'POST', headers: authHeaders(),
  }));
}

export async function deleteJob(jobId) {
  return jsonOrThrow(await fetch(`${BASE}/jobs/${jobId}`, {
    method: 'DELETE', headers: authHeaders(),
  }));
}

/**
 * Subscribe to the live event stream for a job.
 * @param {string} jobId
 * @param {{onSnapshot?: Function, onLog?: Function, onPhase?: Function, onEnd?: Function, onError?: Function}} handlers
 * @returns {() => void} unsubscribe
 */
export function streamJob(jobId, handlers = {}) {
  const t = getToken();
  const url = `${BASE}/jobs/${jobId}/stream${t ? `?token=${encodeURIComponent(t)}` : ''}`;
  const es = new EventSource(url);
  const wrap = (h) => (ev) => {
    if (!h) return;
    try { h(JSON.parse(ev.data)); } catch (err) { handlers.onError && handlers.onError(err); }
  };
  es.addEventListener('snapshot', wrap(handlers.onSnapshot));
  es.addEventListener('log',      wrap(handlers.onLog));
  es.addEventListener('phase',    wrap(handlers.onPhase));
  es.addEventListener('end', (ev) => {
    wrap(handlers.onEnd)(ev);
    es.close();
  });
  es.onerror = (err) => handlers.onError && handlers.onError(err);
  return () => es.close();
}
