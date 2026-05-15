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

// ─── account ─────────────────────────────────────────────────────────────────
export async function changePassword({ currentPassword, newPassword }) {
  return jsonOrThrow(await fetch(`${BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  }));
}

export async function deleteAccount({ emailConfirm }) {
  const res = await fetch(`${BASE}/auth/me`, {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email_confirm: emailConfirm }),
  });
  return jsonOrThrow(res);
}

/** Sign out from every device except the caller's own session. */
export async function signOutAllOtherDevices() {
  return jsonOrThrow(await fetch(`${BASE}/auth/tokens`, {
    method: 'DELETE', headers: authHeaders(),
  }));
}

// ─── sessions / jobs ─────────────────────────────────────────────────────────
export async function getSessions() {
  return jsonOrThrow(await fetch(`${BASE}/sessions`, { headers: authHeaders() }));
}

/** Bulk-clear every analysis from the user's history. */
export async function clearSessions() {
  return jsonOrThrow(await fetch(`${BASE}/sessions`, {
    method: 'DELETE', headers: authHeaders(),
  }));
}

/**
 * Trigger the export download. The browser handles the actual file save —
 * we just produce a one-off URL with the bearer token attached as a query
 * param (the request goes through the same proxy as the rest of /api/*).
 */
export function exportAllUrl() {
  const t = getToken();
  return `${BASE}/export${t ? `?token=${encodeURIComponent(t)}` : ''}`;
}

/**
 * Upload a sample for analysis.
 * @param {File|Blob} file
 * @param {{
 *   llmMode?: 'off'|'rename'|'format'|'both',
 *   useLlm?: boolean,                 // legacy alias, ignored when llmMode is set
 *   dynamicEval?: boolean,
 *   autoIoc?: boolean,
 *   staticAnalysis?: boolean,
 *   rename?: boolean,
 *   verbose?: boolean,
 *   maxLayers?: number|null,
 *   timeout?: number|null,
 *   langHint?: 'js'|'py',
 *   speed?: 'normal'|'fast',
 *   filename?: string,
 * }} opts
 * @returns {Promise<{job_id: string, lang: 'js'|'py', filename: string, size: number}>}
 */
export async function analyze(file, opts = {}) {
  const fd = new FormData();
  const name = opts.filename || (file && file.name) || 'pasted.txt';
  fd.append('file', file, name);

  // Prefer the granular llmMode field; fall back to the legacy boolean
  // so callers that haven't migrated to v2 options still work.
  const llmMode =
    opts.llmMode != null
      ? opts.llmMode
      : (opts.useLlm === true ? 'both' : 'off');
  fd.append('llm_mode', llmMode);
  // Send legacy alias too — backend accepts both, frontend stays compatible
  // with older mock-api builds during rollout.
  fd.append('use_llm', llmMode !== 'off' ? 'true' : 'false');

  fd.append('dynamic_eval',    opts.dynamicEval    === false ? 'false' : 'true');
  fd.append('auto_ioc',        opts.autoIoc        === false ? 'false' : 'true');
  fd.append('static_analysis', opts.staticAnalysis === false ? 'false' : 'true');
  fd.append('rename',          opts.rename         === false ? 'false' : 'true');
  fd.append('verbose',         opts.verbose        === false ? 'false' : 'true');
  if (opts.maxLayers != null && Number.isFinite(+opts.maxLayers)) {
    fd.append('max_layers', String(Math.floor(+opts.maxLayers)));
  }
  if (opts.timeout != null && Number.isFinite(+opts.timeout)) {
    fd.append('timeout', String(Math.floor(+opts.timeout)));
  }
  if (opts.langHint) fd.append('lang_hint', opts.langHint);
  fd.append('speed', opts.speed || 'normal');

  return jsonOrThrow(await fetch(`${BASE}/analyze`, {
    method: 'POST', body: fd, headers: authHeaders(),
  }));
}

// ─── LLM config ──────────────────────────────────────────────────────────────
export async function getLlmConfig() {
  return jsonOrThrow(await fetch(`${BASE}/llm/config`, { headers: authHeaders() }));
}

/**
 * @param {{
 *   provider?: string, model?: string, base_url?: string,
 *   api_key?: string, clear_api_key?: boolean,
 *   temperature?: number, max_tokens?: number,
 *   max_code_size?: number, timeout_seconds?: number,
 *   api_key_env?: string,
 * }} body
 */
export async function putLlmConfig(body) {
  return jsonOrThrow(await fetch(`${BASE}/llm/config`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  }));
}

/** @param {'js'|'py'|'both'} engine */
export async function checkLlm(engine = 'both') {
  return jsonOrThrow(await fetch(
    `${BASE}/llm/check?engine=${encodeURIComponent(engine)}`,
    { method: 'POST', headers: authHeaders() },
  ));
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
