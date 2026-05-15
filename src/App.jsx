import React, { useState, useEffect, useCallback, useRef } from 'react';
import { C, getLangTheme } from './theme.js';
import * as api from './api.js';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmptyState from './components/EmptyState.jsx';
import AnalyzingState from './components/AnalyzingState.jsx';
import ResultsState from './components/ResultsState.jsx';
import ErrorState from './components/ErrorState.jsx';
import SettingsState from './components/SettingsState.jsx';
import LoginState from './components/LoginState.jsx';
import SignupState from './components/SignupState.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { readAnalysisOptions, writeAnalysisOptions } from './analysisOptions.js';

const emptyJob = () => ({
  id: null,
  filename: null,
  size: 0,
  lang: 'js',
  status: 'idle',     // idle | queued | running | done | error | cancelled
  phase: 'detect',
  progress: 0,
  logs: [],
  result: null,
  error: null,
  uploadedCode: '',   // raw text of the just-uploaded sample (for live preview)
});

// Read the first ~256 KB of a File/Blob as text. Used so the analysing view
// can show the user's *actual* uploaded sample rather than a static fixture.
async function readFilePreview(file) {
  if (!file) return '';
  try {
    const slice = file.size > 262144 ? file.slice(0, 262144) : file;
    return await slice.text();
  } catch {
    return '';
  }
}

export default function App() {
  // 'boot' = initial /auth/me probe, gates the whole UI
  const [view, setView] = useState('boot');
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [iocOpen, setIocOpen] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);          // live history shared across views
  const [sessionsTick, setSessionsTick] = useState(0);  // bump to refetch sessions
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [job, setJob] = useState(emptyJob());
  const [uploadError, setUploadError] = useState(null);
  const [streamError, setStreamError] = useState(null); // set when SSE connection drops mid-job
  const [streamTick, setStreamTick] = useState(0);      // bump to force-reconnect the stream
  const [analysisOptions, setAnalysisOptions] = useState(() => readAnalysisOptions());
  const streamUnsubRef = useRef(null);
  const prevViewRef = useRef('empty'); // last non-settings view for back navigation

  const lang = job.lang || 'js';
  // Settings, login/signup and the empty/boot screens are language-agnostic
  // and use the neutral purple palette. Only the analysis-tied views adopt
  // the job's language colour.
  const neutralViews = new Set(['empty', 'login', 'signup', 'boot', 'settings']);
  const lt = neutralViews.has(view) ? getLangTheme(null) : getLangTheme(lang);

  // ── dynamic browser tab title ─────────────────────────────────────────────
  useEffect(() => {
    const base = 'Unveil';
    if (view === 'results' && job?.filename)       document.title = `${base} — ${job.filename}`;
    else if (view === 'analyzing' && job?.filename) document.title = `${base} ● ${job.filename}`;
    else if (view === 'error' && job?.filename)     document.title = `${base} ✗ ${job.filename}`;
    else if (view === 'settings')                   document.title = `${base} — settings`;
    else                                            document.title = base;
  }, [view, job?.filename]);

  useEffect(() => {
    writeAnalysisOptions(analysisOptions);
  }, [analysisOptions]);

  const updateAnalysisOption = useCallback((key, value) => {
    setAnalysisOptions((current) => ({ ...current, [key]: value }));
  }, []);

  // ── sessions list (single source of truth, shared with Sidebar/Empty/Palette/Settings) ──
  useEffect(() => {
    if (!user) { setSessions([]); return; }
    let cancelled = false;
    api.getSessions()
      .then((data) => { if (!cancelled && Array.isArray(data)) setSessions(data); })
      .catch((err) => console.error('[getSessions]', err));
    return () => { cancelled = true; };
  }, [user, sessionsTick]);

  // ── auth bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!api.getToken()) {
        if (!cancelled) setView('login');
        return;
      }
      try {
        const u = await api.me();
        if (cancelled) return;
        setUser(u);
        setView('empty');
      } catch (err) {
        if (cancelled) return;
        api.clearToken();
        setView('login');
      }
    })();
    return () => { cancelled = true; };
  }, []);


  // ── live stream subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!job.id) return;
    if (job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return;
    if (streamUnsubRef.current) streamUnsubRef.current();
    const clearStreamErr = () => setStreamError((e) => (e ? null : e));
    streamUnsubRef.current = api.streamJob(job.id, {
      onSnapshot: (s) => {
        clearStreamErr();
        setJob(j => ({
          ...j, status: s.status || j.status, phase: s.phase || j.phase,
          progress: s.progress ?? j.progress, logs: s.logs || j.logs,
        }));
      },
      onLog: (line) => {
        clearStreamErr();
        setJob(j => ({ ...j, logs: [...j.logs, line] }));
      },
      onPhase: (p) => {
        clearStreamErr();
        setJob(j => ({ ...j, phase: p.phase, progress: p.progress }));
      },
      onEnd: (e) => {
        clearStreamErr();
        // Server may emit `end` with a non-terminal status when an in-flight
        // job was lost mid-flight (e.g. backend restart). Treat anything that
        // isn't `done` as an error-class outcome so the UI never gets stuck.
        const terminalStatus =
          e.status === 'done' ? 'done'
          : e.status === 'cancelled' ? 'cancelled'
          : 'error';
        const terminalError =
          e.error || (e.status !== 'done' && e.status !== 'cancelled' && e.status !== 'error'
            ? `stream ended with unexpected status "${e.status}"`
            : null);
        setJob(j => ({
          ...j, status: terminalStatus, phase: e.phase, progress: e.progress,
          result: e.result, error: terminalError,
        }));
        if (terminalStatus === 'done') setView('results');
        else setView('error'); // error | cancelled | unexpected → ErrorState handles branches
        // refresh sidebar history once a job lands
        setSessionsTick(t => t + 1);
      },
      onError: (err) => {
        console.error('[stream]', err);
        setStreamError('Live updates lost. The job may still be running on the server.');
      },
    });
    return () => { if (streamUnsubRef.current) streamUnsubRef.current(); };
  }, [job.id, streamTick]);

  const reconnectStream = useCallback(() => {
    setStreamError(null);
    setStreamTick(t => t + 1);
  }, []);

  // ── auth actions ──────────────────────────────────────────────────────────
  const handleAuthed = useCallback((u) => {
    setUser(u);
    setView('empty');
    setSessionsTick(t => t + 1);
  }, []);

  const handleLogout = useCallback(async () => {
    if (streamUnsubRef.current) { streamUnsubRef.current(); streamUnsubRef.current = null; }
    await api.logout();
    setUser(null);
    setJob(emptyJob());
    setActiveSession(null);
    setUploadError(null);
    setView('login');
  }, []);

  // ── job actions ───────────────────────────────────────────────────────────
  const startAnalysis = useCallback(async (file, opts = {}) => {
    setUploadError(null);
    // Read the file content up-front so the analysing view can display the
    // user's actual uploaded code instead of a static placeholder.
    const uploadedCode = await readFilePreview(file);
    try {
      const effectiveOptions = { ...analysisOptions, ...opts };
      if (effectiveOptions.useLlm == null) {
        effectiveOptions.useLlm = !!effectiveOptions.llmRename;
      }
      const meta = await api.analyze(file, { speed: 'fast', ...effectiveOptions });
      setJob({
        ...emptyJob(),
        id: meta.job_id,
        filename: meta.filename,
        size: meta.size,
        lang: meta.lang,
        status: 'queued',
        uploadedCode,
      });
      setActiveSession(meta.job_id);
      setSessionsTick(t => t + 1);
      setView('analyzing');
    } catch (err) {
      if (err && err.status === 401) {
        api.clearToken();
        setUser(null);
        setView('login');
        return;
      }
      setUploadError(err.message || String(err));
    }
  }, [analysisOptions]);

  const cancelAnalysis = useCallback(async () => {
    if (!job.id) return;
    try { await api.cancelJob(job.id); } catch (err) { console.error(err); }
  }, [job.id]);

  const newAnalysis = useCallback(() => {
    if (streamUnsubRef.current) { streamUnsubRef.current(); streamUnsubRef.current = null; }
    setJob(emptyJob());
    setActiveSession(null);
    setUploadError(null);
    setView('empty');
  }, []);

  // ── keyboard shortcuts (⌘K, ⌘N, ⌘B, ⌘I) ─────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); if (user) setPaletteOpen(p => !p); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (user) newAnalysis(); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); if (user) setSidebarCollapsed(c => !c); }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); if (user) setIocOpen(c => !c); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [user, newAnalysis]);

  // Drop a session from history. If the deleted session is the one currently
  // shown, fall back to the empty view so we don't render stale job data.
  const deleteSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    // Optimistic: pull it out of the local list before the round-trip so the
    // sidebar feels responsive. On failure we refetch and any auth issue is
    // handled below.
    setSessions((list) => list.filter((s) => s.id !== sessionId));
    const isActive = job.id === sessionId || activeSession === sessionId;
    if (isActive) {
      if (streamUnsubRef.current) { streamUnsubRef.current(); streamUnsubRef.current = null; }
      setJob(emptyJob());
      setActiveSession(null);
      setView('empty');
    }
    try {
      await api.deleteJob(sessionId);
    } catch (err) {
      if (err && err.status === 401) {
        api.clearToken();
        setUser(null);
        setView('login');
        return;
      }
      console.error('[deleteSession]', err);
    } finally {
      setSessionsTick((t) => t + 1);
    }
  }, [job.id, activeSession]);

  // Click on a sidebar session → fetch + restore that job into view
  const openSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setActiveSession(sessionId);
    if (sessionId === job.id) return;
    if (streamUnsubRef.current) { streamUnsubRef.current(); streamUnsubRef.current = null; }
    try {
      const j = await api.getJob(sessionId);
      setJob({
        id: j.id,
        filename: j.filename,
        size: j.size,
        lang: j.lang,
        status: j.status,
        phase: j.phase,
        progress: j.progress,
        logs: j.logs || [],
        result: j.result,
        error: j.error,
      });
      if (j.status === 'done')              setView('results');
      else if (j.status === 'error')        setView('error');
      else if (j.status === 'cancelled')    setView('error');
      else                                  setView('analyzing');
    } catch (err) {
      console.error('[openSession]', err);
      if (err && err.status === 401) handleLogout();
    }
  }, [job.id, handleLogout]);

  // ── palette ───────────────────────────────────────────────────────────────
  function paletteAction(it) {
    if (!it) return;
    setPaletteOpen(false);
    if (it.id === 'view-empty')          newAnalysis();
    else if (it.id === 'view-analyzing') setView('analyzing');
    else if (it.id === 'view-results')   setView('results');
    else if (it.id === 'view-settings')  setView('settings');
    else if (it.id === 'view-error')     setView('error');
    else if (it.id === 'sidebar')        setSidebarCollapsed(c => !c);
    else if (it.id === 'ioc')            setIocOpen(c => !c);
    else if (it.id === 'new')            newAnalysis();
    else if (it.id === 'logout')         handleLogout();
    else if (it.id.startsWith('session-')) openSession(it.id.slice('session-'.length));
  }

  // ── render ────────────────────────────────────────────────────────────────
  if (view === 'boot') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'100%', background: C.bg, color: C.textMuted, fontFamily: C.mono, fontSize: 12 }}>
        <span style={{ opacity: .7 }}>connecting…</span>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%',
        overflow:'hidden', background: C.bg }}>
        <LoginState onSwitch={setView} onAuthed={handleAuthed} />
      </div>
    );
  }
  if (view === 'signup') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%',
        overflow:'hidden', background: C.bg }}>
        <SignupState onSwitch={setView} onAuthed={handleAuthed} />
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%',
      overflow:'hidden', background: C.bg }}>
      <Header view={view} onNewAnalysis={newAnalysis}
        onSettings={() => {
          if (view === 'settings') {
            setView(prevViewRef.current || 'empty');
          } else {
            prevViewRef.current = view;
            setView('settings');
          }
        }}
        onHome={() => {
          if (view === 'settings') setView(prevViewRef.current || 'empty');
          else newAnalysis();
        }}
        onLogout={handleLogout}
        user={user} lt={lt} job={job} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          activeSession={activeSession}
          setActiveSession={openSession}
          onNewAnalysis={newAnalysis}
          onLogout={handleLogout}
          onDeleteSession={deleteSession}
          user={user}
          sessions={sessions}
          lang={lang}
          lt={lt}
        />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {view === 'empty'     && <EmptyState lang={lang} lt={lt}
              onAnalyze={startAnalysis} uploadError={uploadError}
              onClearError={() => setUploadError(null)}
              options={analysisOptions} onOptionChange={updateAnalysisOption} />}
          {view === 'analyzing' && <AnalyzingState lang={lang} lt={lt}
              job={job} onCancel={cancelAnalysis}
              streamError={streamError} onReconnect={reconnectStream} />}
          {view === 'results'   && <ResultsState iocOpen={iocOpen}
              setIocOpen={setIocOpen} lang={lang} lt={lt} job={job} />}
          {view === 'error'     && <ErrorState lang={lang} lt={lt} job={job}
              onRetry={newAnalysis} onNew={newAnalysis} />}
          {view === 'settings'  && <SettingsState lt={lt} user={user}
              sessionCount={sessions.length} onLogout={handleLogout}
              options={analysisOptions} onOptionChange={updateAnalysisOption} />}
        </div>
      </div>
      {paletteOpen && (
        <CommandPalette lt={lt} sessions={sessions}
          onClose={()=>setPaletteOpen(false)} onAction={paletteAction} />
      )}
    </div>
  );
}
