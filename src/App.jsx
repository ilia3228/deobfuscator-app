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
import {
  applyAccentToTheme,
  getMonoFont,
  readAppearanceOptions,
  writeAppearanceOptions,
} from './appearanceOptions.js';

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
  sourceFile: null,    // in-memory File for one-click retry
  sourceOptions: null,
  startedAt: null,
});

const LAYOUT_KEY = 'jsdeobf.layoutFlags';

// While a job runs we poll GET /api/jobs/{id} rather than subscribing to the
// SSE stream — intermediaries (e.g. Cloudflare tunnels) buffer the stream and
// withhold every log line until the job ends. Plain request/response can't be
// buffered like that, so logs arrive live at this cadence.
const POLL_INTERVAL_MS = 500;
// If nothing observable (status/phase/progress/log count) changes for this long
// the job is likely orphaned (e.g. backend restarted mid-run); surface the
// recoverable "updates lost" banner. Real progress clears it again.
const STALL_LIMIT_MS = 90000;

function readLayoutFlags() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return {
      sidebarCollapsed: parsed?.sidebarCollapsed === true,
      iocOpen: parsed?.iocOpen !== false,
    };
  } catch {
    return { sidebarCollapsed: false, iocOpen: true };
  }
}

function hasFiles(evt) {
  return Array.from(evt?.dataTransfer?.types || []).includes('Files');
}

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readLayoutFlags().sidebarCollapsed);
  const [iocOpen, setIocOpen] = useState(() => readLayoutFlags().iocOpen);
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);          // live history shared across views
  const [sessionsTick, setSessionsTick] = useState(0);  // bump to refetch sessions
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [job, setJob] = useState(emptyJob());
  const [uploadError, setUploadError] = useState(null);
  const [streamError, setStreamError] = useState(null); // set when live polling keeps failing/stalls
  const [streamTick, setStreamTick] = useState(0);      // bump to restart polling for the current job
  const [analysisOptions, setAnalysisOptions] = useState(() => readAnalysisOptions());
  const [appearanceOptions, setAppearanceOptions] = useState(() => readAppearanceOptions());
  const [globalDrag, setGlobalDrag] = useState(false);
  // Optional deep-link target for the next Settings open (e.g. clicking the
  // "Settings → LLM provider" hint from the upload screen sets this to 'llm'
  // so SettingsState mounts on that tab). Cleared whenever the user leaves
  // settings so a plain Settings click always lands on Account.
  const [settingsInitialSection, setSettingsInitialSection] = useState(null);
  const streamUnsubRef = useRef(null);
  const prevViewRef = useRef('empty'); // last non-settings view for back navigation

  const lang = job.lang || 'js';
  // Settings, login/signup and the empty/boot screens are language-agnostic
  // and use the neutral purple palette. Only the analysis-tied views adopt
  // the job's language colour.
  const neutralViews = new Set(['empty', 'login', 'signup', 'boot', 'settings']);
  const neutralTheme = applyAccentToTheme(getLangTheme(null), appearanceOptions.accent);
  const analysisTheme = applyAccentToTheme(
    getLangTheme(lang),
    lang === 'py' ? appearanceOptions.pyAccent : appearanceOptions.jsAccent,
  );
  const lt = neutralViews.has(view) ? neutralTheme : analysisTheme;

  // ── dynamic browser tab title ─────────────────────────────────────────────
  useEffect(() => {
    const base = 'Unveil';
    if (view === 'results' && job?.filename)        document.title = `${base} - ${job.filename}`;
    else if (view === 'analyzing' && job?.filename) document.title = `${base} - ${Math.round(job.progress || 0)}% - ${job.filename}`;
    else if (view === 'error' && job?.filename)     document.title = `${base} - error - ${job.filename}`;
    else if (view === 'settings')                   document.title = `${base} - settings`;
    else                                            document.title = base;
  }, [view, job?.filename, job?.progress]);

  // Reset the deep-link section whenever we leave settings so the next plain
  // Settings click falls back to the default tab.
  useEffect(() => {
    if (view !== 'settings' && settingsInitialSection) setSettingsInitialSection(null);
  }, [view, settingsInitialSection]);

  useEffect(() => {
    writeAnalysisOptions(analysisOptions);
  }, [analysisOptions]);

  useEffect(() => {
    writeAppearanceOptions(appearanceOptions);
    const root = document.documentElement;
    const mono = getMonoFont(appearanceOptions.monoFont);
    root.style.setProperty('--ui-scale', String(appearanceOptions.uiScale));
    root.style.setProperty('--editor-font-size', `${appearanceOptions.editorFontSize}px`);
    root.style.setProperty('--mono-font', mono.css);
    document.body.classList.toggle('no-linenos', !appearanceOptions.lineNumbers);
    document.body.classList.toggle('no-ioc-highlight', !appearanceOptions.iocHighlight);
    document.body.classList.toggle('reduce-motion', !!appearanceOptions.reduceMotion);
  }, [appearanceOptions]);

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ sidebarCollapsed, iocOpen }));
    } catch {
      // Layout persistence is a comfort feature; ignore storage failures.
    }
  }, [sidebarCollapsed, iocOpen]);

  const updateAnalysisOption = useCallback((key, value) => {
    setAnalysisOptions((current) => ({ ...current, [key]: value }));
  }, []);

  const updateAppearanceOption = useCallback((key, value) => {
    setAppearanceOptions((current) => ({ ...current, [key]: value }));
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


  // ── live job polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!job.id) return;
    if (job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return;
    if (streamUnsubRef.current) streamUnsubRef.current();

    let stopped = false;
    let timer = null;
    let failures = 0;
    let lastSig = null;
    let lastChangeAt = Date.now();
    const clearStreamErr = () => setStreamError((e) => (e ? null : e));

    const poll = async () => {
      if (stopped) return;
      try {
        const s = await api.getJob(job.id);
        if (stopped) return;
        failures = 0;

        const terminalStatus =
          s.status === 'done' ? 'done'
          : s.status === 'cancelled' ? 'cancelled'
          : s.status === 'error' ? 'error'
          : null;

        setJob(j => ({
          ...j,
          status: s.status || j.status,
          phase: s.phase || j.phase,
          progress: s.progress ?? j.progress,
          logs: s.logs || j.logs,
          // Only the terminal snapshot carries result/error; keep prior values otherwise.
          ...(terminalStatus ? { result: s.result, error: s.error } : {}),
        }));

        if (terminalStatus) {
          stopped = true;
          if (terminalStatus === 'done') setView('results');
          else setView('error'); // error | cancelled → ErrorState handles branches
          setSessionsTick(t => t + 1); // refresh sidebar history once a job lands
          return; // job reached a terminal state — stop polling
        }

        // Stall watchdog — see STALL_LIMIT_MS. A real change clears the banner.
        const sig = `${s.status}|${s.phase}|${s.progress}|${(s.logs || []).length}`;
        const now = Date.now();
        if (sig !== lastSig) {
          lastSig = sig;
          lastChangeAt = now;
          clearStreamErr();
        } else if (now - lastChangeAt > STALL_LIMIT_MS) {
          setStreamError('Live updates lost. The job may still be running on the server.');
        }
      } catch (err) {
        if (stopped) return;
        // A vanished session (401) is handled by the auth flow elsewhere; just
        // stop polling so we don't spin on a dead token.
        if (err && err.status === 401) { stopped = true; return; }
        // Tolerate transient blips; only surface the banner after a few misses.
        failures += 1;
        if (failures >= 3) {
          console.error('[poll]', err);
          setStreamError('Live updates lost. The job may still be running on the server.');
        }
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();

    const stop = () => { stopped = true; if (timer) { clearTimeout(timer); timer = null; } };
    streamUnsubRef.current = stop;
    return stop;
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
      const meta = await api.analyze(file, { speed: 'fast', ...effectiveOptions });
      setJob({
        ...emptyJob(),
        id: meta.job_id,
        filename: meta.filename,
        size: meta.size,
        lang: meta.lang,
        status: 'queued',
        uploadedCode: meta.uploaded_code || uploadedCode,
        sourceFile: file,
        sourceOptions: effectiveOptions,
        startedAt: Date.now(),
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

  // Open settings on a specific tab. Used by the upload screen to deep-link
  // into "LLM provider" when the user hasn't set up / verified the key yet.
  const openSettingsAt = useCallback((section) => {
    setSettingsInitialSection(section || null);
    setView((current) => {
      if (current === 'settings') return current;
      prevViewRef.current = current;
      return 'settings';
    });
  }, []);

  const retryAnalysis = useCallback(async () => {
    if (!job.sourceFile) return;
    await startAnalysis(job.sourceFile, job.sourceOptions || {});
  }, [job.sourceFile, job.sourceOptions, startAnalysis]);

  useEffect(() => {
    if (!user) return;
    const onDragOver = (e) => {
      if (view === 'empty' || e.defaultPrevented || !hasFiles(e)) return;
      e.preventDefault();
      setGlobalDrag(true);
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setGlobalDrag(false);
      }
    };
    const onDrop = (e) => {
      if (view === 'empty' || e.defaultPrevented || !hasFiles(e)) return;
      e.preventDefault();
      setGlobalDrag(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) startAnalysis(file);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [user, view, startAnalysis]);

  // ── keyboard shortcuts (⌘K, ⌘N, ⌘B, ⌘I, ⌘,) ──────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); if (user) setPaletteOpen(p => !p); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (user) newAnalysis(); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); if (user) setSidebarCollapsed(c => !c); }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); if (user) setIocOpen(c => !c); }
      if (e.key === ',') {
        e.preventDefault();
        if (user) {
          setView((current) => {
            if (current === 'settings') return prevViewRef.current || 'empty';
            prevViewRef.current = current;
            return 'settings';
          });
        }
      }
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
        uploadedCode: '',
        sourceFile: null,
        sourceOptions: null,
        startedAt: null,
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
      {globalDrag && (
        <div style={{ position:'fixed', inset:48, zIndex:70,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(8,8,10,.52)', pointerEvents:'none',
          border:`1px dashed ${lt.accent}` }}>
          <div style={{ padding:'10px 14px', background:C.bg1,
            border:`1px solid ${lt.accent}`, borderRadius:3,
            color:lt.accentText, fontFamily:C.mono, fontSize:12 }}>
            Drop file to start a new analysis
          </div>
        </div>
      )}
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
              options={analysisOptions} onOptionChange={updateAnalysisOption}
              onOpenSettings={() => openSettingsAt('llm')} />}
          {view === 'analyzing' && <AnalyzingState lang={lang} lt={lt}
              job={job} onCancel={cancelAnalysis}
              streamError={streamError} onReconnect={reconnectStream} />}
          {view === 'results'   && <ResultsState iocOpen={iocOpen}
              setIocOpen={setIocOpen} lang={lang} lt={lt} job={job} />}
          {view === 'error'     && <ErrorState lang={lang} lt={lt} job={job}
              onRetry={job.sourceFile ? retryAnalysis : null}
              retryLabel="Retry with same options"
              onNew={newAnalysis} />}
          {view === 'settings'  && <SettingsState lt={lt} user={user}
              sessionCount={sessions.length} onLogout={handleLogout}
              onAccountDeleted={() => {
                setUser(null);
                setJob(emptyJob());
                setSessions([]);
                setActiveSession(null);
                setView('login');
              }}
              options={analysisOptions} onOptionChange={updateAnalysisOption}
              appearance={appearanceOptions} onAppearanceChange={updateAppearanceOption}
              initialSection={settingsInitialSection} />}
        </div>
      </div>
      {paletteOpen && (
        <CommandPalette lt={lt} sessions={sessions}
          onClose={()=>setPaletteOpen(false)} onAction={paletteAction} />
      )}
    </div>
  );
}
