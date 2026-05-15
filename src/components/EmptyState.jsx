import React, { useCallback, useEffect, useRef, useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import { ANALYSIS_OPTION_DEFAULTS, LLM_MODES } from '../analysisOptions.js';
import { useResizable, ResizeHandle } from './Resizable.jsx';
import * as api from '../api.js';

// Small bank of demo payloads, one per kind of obfuscation the engine handles.
// Clicking a chip pastes the text into the textarea so the user can immediately
// hit "Run deobfuscation".
const TRY_SAMPLES = [
  { label: 'javascript-obfuscator', lang: 'js', url: '/samples/javascript-obfuscator.js' },
  { label: 'pyfuscate',             lang: 'py', url: '/samples/pyfuscate_21.py' },
  { label: 'pyobfuscate',           lang: 'py', url: '/samples/pyobfuscate_06.py' },
  { label: 'JSFuck',                lang: 'js', url: '/samples/JsFuck.js' },
];

const LARGE_FILE_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Heuristic content-based language detection for pasted code. We only
// commit to a language when one side has clear markers and the other
// doesn't — ambiguous content returns null so the API's own sniffer
// (`mock-api/main.py::_sniff_lang`) gets to make the final call.
const PY_RE = /\b__import__\b|\blambda\s+[\w,*\s]*:|\bdef\s+\w|\bclass\s+\w+\s*[:(]|^\s*from\s+\w|^\s*import\s+(?:zlib|base64|marshal|struct|os|sys|builtins)|exec\s*\(\s*b['"]|print\s*\(/m;
const JS_RE = /\bfunction\s*[\w(]|=>|\bconsole\.|\bvar\s+\w|\blet\s+\w|\bconst\s+\w|\brequire\s*\(|\bmodule\.exports|\bglobalThis\b|\bnavigator\./;

const detectLangFromText = (text) => {
  const hasPy = PY_RE.test(text);
  const hasJs = JS_RE.test(text);
  if (hasPy && !hasJs) return 'py';
  if (hasJs && !hasPy) return 'js';
  return null; // ambiguous — defer to server
};

export default function EmptyState({
  lang = 'js',
  lt,
  onAnalyze,
  uploadError,
  onClearError,
  options = ANALYSIS_OPTION_DEFAULTS,
  onOptionChange,
}) {
  const lth = lt || getLangTheme(null);
  const [drag, setDrag] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pickedFile, setPickedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(null);
  const [sampleError, setSampleError] = useState(null);
  const [langMode, setLangMode] = useState('auto'); // 'auto' | 'js' | 'py'
  const [llmConfigured, setLlmConfigured] = useState(null); // null=unknown, true/false once probed
  const fileInputRef = useRef(null);
  // Right-side options panel is user-resizable from its left edge.
  const {
    size: optionsW,
    startDrag: startOptionsDrag,
    dragging: optionsDragging,
  } = useResizable({
    initial: 240, min: 200, max: 380,
    axis: 'x', edge: 'left',
    storageKey: 'jsdeobf.layout.options',
  });
  const llmMode = LLM_MODES.includes(options?.llmMode) ? options.llmMode : 'off';
  const dynamicEval = options.dynamicEval !== false;
  const autoIoc = options.autoIoc !== false;
  const staticAnalysis = options.staticAnalysis !== false;
  const renameOn = options.rename !== false;
  const verbose = options.verbose !== false;
  const maxLayers = options.maxLayers ?? '';
  const timeout = options.timeout ?? '';
  const canSubmit = !!pickedFile || !!pasted.trim();
  const fileWarning = pickedFile && pickedFile.size > LARGE_FILE_BYTES
    ? `Large sample (${formatBytes(pickedFile.size)}). Analysis may take longer and LLM cleanup can be skipped by max-code-size limits.`
    : null;

  // Probe whether the backend has an LLM key configured. Disabled segmented
  // controls when not — the user is directed to Settings → LLM.
  useEffect(() => {
    let cancelled = false;
    api.getLlmConfig()
      .then((cfg) => { if (!cancelled) setLlmConfigured(!!cfg?.api_key_present); })
      .catch(() => { if (!cancelled) setLlmConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  // Auto-clamp to 'off' when the key disappears so we never submit a job that
  // would be rejected by the backend's "llm not configured" guard.
  useEffect(() => {
    if (llmConfigured === false && llmMode !== 'off') {
      onOptionChange?.('llmMode', 'off');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmConfigured]);

  // Live preview of which language the current paste will be routed to.
  // Pure display — `submit` re-runs detection to stay honest.
  const autoGuess = pasted.trim() ? detectLangFromText(pasted) : null;

  const submit = useCallback(async () => {
    if (busy || sampleLoading) return;
    let file = pickedFile;
    let langHint;
    if (!file) {
      if (!pasted.trim()) return;
      if (langMode === 'auto') {
        // undefined when ambiguous → server sniff decides
        langHint = detectLangFromText(pasted) ?? undefined;
      } else {
        langHint = langMode;
      }
      const ext = langHint === 'py' ? 'py' : 'js';
      file = new File([pasted], `pasted.${ext}`, { type: 'text/plain' });
    }
    setBusy(true);
    try {
      await onAnalyze?.(file, {
        llmMode,
        dynamicEval,
        autoIoc,
        staticAnalysis,
        rename: renameOn,
        verbose,
        maxLayers: options.maxLayers ?? null,
        timeout: options.timeout ?? null,
        langHint,
      });
    } finally {
      setBusy(false);
    }
  }, [
    busy, sampleLoading, pickedFile, pasted, langMode, onAnalyze,
    llmMode, dynamicEval, autoIoc, staticAnalysis, renameOn, verbose,
    options.maxLayers, options.timeout,
  ]);

  useEffect(() => {
    const h = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key !== 'Enter') return;
      if (!canSubmit || busy) return;
      e.preventDefault();
      submit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submit, canSubmit, busy]);

  const acceptFile = (f) => {
    if (!f) return;
    setPickedFile(f);
    setPasted('');
    setSampleError(null);
    onClearError?.();
  };

  const insertSample = async (s) => {
    setPickedFile(null);
    setSampleError(null);
    setLangMode(s.lang);
    onClearError?.();

    if (s.text != null) {
      setPasted(s.text);
      return;
    }

    setSampleLoading(s.label);
    try {
      const response = await fetch(s.url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPasted(await response.text());
    } catch {
      setPasted('');
      setSampleError(`Could not load ${s.label} sample.`);
    } finally {
      setSampleLoading(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 48px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.ts,.mjs,.py,.txt,text/*,application/javascript,application/x-python-code"
          style={{ display: 'none' }}
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            width: '100%',
            maxWidth: 480,
            border: `1px solid ${drag ? lth.accent : C.border2}`,
            background: drag ? lth.accentDim : C.bg1,
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'border-color .12s',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 11.5, color: C.text }}>
              {drag
                ? 'Drop to analyse…'
                : pickedFile
                  ? `${pickedFile.name} · ${formatBytes(pickedFile.size)}`
                  : 'Drop file or paste code'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn-hover"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '3px 10px',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  color: C.textDim,
                  cursor: 'pointer',
                }}
              >
                Browse…
              </button>
            </div>
          </div>

          <textarea
            value={pasted}
            onChange={(e) => { setPasted(e.target.value); setSampleError(null); onClearError?.(); }}
            placeholder={`var _0x4f2a=['push','ZmV0Y2g=','aHR0cHM6Ly9j…\n\n// or drag a .js / .py file onto this area`}
            rows={8}
            style={{
              width: '100%',
              resize: 'none',
              background: 'transparent',
              border: 'none',
              padding: '12px 14px',
              fontSize: 11.5,
              color: C.text,
              outline: 'none',
              fontFamily: C.mono,
              lineHeight: 1.7,
              display: 'block',
            }}
          />

          <div
            style={{
              padding: '6px 14px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 10.5, fontFamily: C.mono, color: C.textMuted }}>
              {pasted.length > 0
                ? `${pasted.length} chars${langMode === 'auto' && autoGuess ? ` · auto → ${autoGuess}` : ''}`
                : 'js · ts · mjs · py'}
            </span>
            <div
              role="radiogroup"
              aria-label="Language"
              style={{
                display: 'flex',
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                overflow: 'hidden',
                fontSize: 10.5,
                fontFamily: C.mono,
              }}
            >
              {['auto', 'js', 'py'].map((m, i) => {
                const active = langMode === m;
                return (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLangMode(m)}
                    title={
                      m === 'auto'
                        ? 'Detect language from content'
                        : `Force ${m.toUpperCase()} deobfuscator`
                    }
                    style={{
                      padding: '2px 8px',
                      background: active ? lth.accentDim : 'transparent',
                      color: active ? lth.accentText : C.textMuted,
                      border: 'none',
                      borderLeft: i === 0 ? 'none' : `1px solid ${C.border}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, width: '100%', maxWidth: 480 }}>
          <button
            onClick={submit}
            disabled={busy || !!sampleLoading || !canSubmit}
            style={{
              width: '100%',
              padding: '8px 0',
              background: lth.accentDim,
              border: `1px solid ${lth.accent}`,
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 500,
              color: lth.accentText,
              cursor: busy || sampleLoading || !canSubmit ? 'not-allowed' : 'pointer',
              opacity: busy || sampleLoading || !canSubmit ? 0.55 : 1,
              fontFamily: 'Geist, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {sampleLoading ? 'Loading sample...' : busy ? 'Uploading…' : 'Run deobfuscation →'}
          </button>
          {fileWarning && (
            <div style={{
              marginTop: 8, padding: '6px 10px', fontSize: 11,
              fontFamily: C.mono, color: C.orange,
              background: 'rgba(212,160,80,.08)',
              border: '1px solid rgba(212,160,80,.28)', borderRadius: 2,
              lineHeight: 1.45,
            }}>
              {fileWarning}
            </div>
          )}
          {uploadError && (
            <div style={{
              marginTop: 8, padding: '6px 10px', fontSize: 11,
              fontFamily: C.mono, color: C.red,
              background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 2,
            }}>
              {uploadError}
            </div>
          )}
          {sampleError && (
            <div style={{
              marginTop: 8, padding: '6px 10px', fontSize: 11,
              fontFamily: C.mono, color: C.red,
              background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 2,
            }}>
              {sampleError}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            maxWidth: 480,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.textMuted,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Try:
          </span>
          {TRY_SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => insertSample(s)}
              disabled={!!sampleLoading}
              className="btn-hover"
              title={`Load ${s.label} sample (${s.lang})`}
              style={{
                background: 'none',
                border: 'none',
                cursor: sampleLoading ? 'wait' : 'pointer',
                fontSize: 11,
                color: lth.accentText,
                opacity: sampleLoading ? 0.6 : 1,
                padding: 0,
                fontFamily: C.mono,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                textDecorationColor: lth.accentDim,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          width: optionsW,
          borderLeft: `1px solid ${C.border}`,
          background: C.bg1,
          padding: '16px 14px',
          overflowY: 'auto',
          flexShrink: 0,
          position: 'relative',
          '--resize-accent': lth.accent,
        }}
      >
        <ResizeHandle
          edge="left"
          onPointerDown={startOptionsDrag}
          dragging={optionsDragging}
          label="Resize options panel"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: C.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            Options
          </div>
          <button
            onClick={() => {
              ['llmMode', 'dynamicEval', 'autoIoc', 'staticAnalysis', 'rename',
               'verbose', 'maxLayers', 'timeout'].forEach((k) => {
                onOptionChange?.(k, ANALYSIS_OPTION_DEFAULTS[k]);
              });
            }}
            className="btn-hover"
            title="Reset all options to defaults"
            style={{
              fontSize: 10, fontFamily: C.mono, color: C.textMuted,
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            reset
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.text, fontWeight: 500, marginBottom: 6 }}>
            LLM mode
          </div>
          <div
            role="radiogroup"
            aria-label="LLM mode"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              border: `1px solid ${C.border2}`,
              borderRadius: 3,
              overflow: 'hidden',
              opacity: llmConfigured === false ? 0.55 : 1,
            }}
          >
            {LLM_MODES.map((m, i) => {
              const active = llmMode === m;
              const disabled = llmConfigured === false && m !== 'off';
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => !disabled && onOptionChange?.('llmMode', m)}
                  title={
                    m === 'off' ? 'No LLM (default)' :
                    m === 'rename' ? 'Use LLM only for variable renaming' :
                    m === 'format' ? 'Use LLM only for formatting/cleanup' :
                    'Use LLM for both rename + format'
                  }
                  style={{
                    padding: '5px 0',
                    fontSize: 11,
                    fontFamily: C.mono,
                    background: active ? lth.accentDim : 'transparent',
                    color: active ? lth.accentText : C.textDim,
                    border: 'none',
                    borderLeft: i === 0 ? 'none' : `1px solid ${C.border}`,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {llmConfigured === false && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: C.textMuted, lineHeight: 1.45 }}>
              No API key — configure LLM in Settings → LLM provider.
            </div>
          )}
        </div>

        <OptionCheck
          checked={dynamicEval}
          onChange={() => onOptionChange?.('dynamicEval', !dynamicEval)}
          accent={lth.accent}
          label="Dynamic eval"
          desc="Hook eval/Function in a sandboxed VM"
        />

        <OptionCheck
          checked={autoIoc}
          onChange={() => onOptionChange?.('autoIoc', !autoIoc)}
          accent={lth.accent}
          label="Auto-extract IOCs"
          desc="Run IOC extractor on completion"
        />

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10.5, color: C.textMuted, fontFamily: C.mono,
            textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            Advanced
          </div>
          <NumberRow
            label="Max layers"
            hint="engine default"
            value={maxLayers}
            onChange={(v) => onOptionChange?.('maxLayers', v)}
            placeholder="default"
          />
          <NumberRow
            label="Timeout"
            hint="seconds per layer"
            value={timeout}
            onChange={(v) => onOptionChange?.('timeout', v)}
            placeholder="default"
          />
          <OptionCheck
            checked={staticAnalysis}
            onChange={() => onOptionChange?.('staticAnalysis', !staticAnalysis)}
            accent={lth.accent}
            label="Static analysis"
            desc="AST + string transforms"
          />
          <OptionCheck
            checked={renameOn}
            onChange={() => onOptionChange?.('rename', !renameOn)}
            accent={lth.accent}
            label="Identifier rename"
            desc="heuristic short names"
          />
          <OptionCheck
            checked={verbose}
            onChange={() => onOptionChange?.('verbose', !verbose)}
            accent={lth.accent}
            label="Verbose logs"
            desc="pass -v to engine"
          />
        </div>
      </div>
    </div>
  );
}

function NumberRow({ label, hint, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.text, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{hint}</div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, '');
            if (raw === '') return onChange(null);
            const n = Number(raw);
            onChange(Number.isFinite(n) && n > 0 ? Math.floor(n) : null);
          }}
          style={{
            width: 76,
            background: C.bg2,
            border: `1px solid ${C.border2}`,
            padding: '5px 8px',
            fontSize: 11.5,
            color: C.text,
            outline: 'none',
            borderRadius: 2,
            fontFamily: C.mono,
          }}
        />
      </div>
    </div>
  );
}

function OptionCheck({ checked, onChange, accent, label, desc }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      style={{
        cursor: 'pointer',
        marginBottom: 4,
        padding: '4px 0',
        background: 'transparent',
        border: 'none',
        transition: 'all .1s',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: 2,
          flexShrink: 0,
          marginTop: 2,
          background: checked ? accent : C.bg4,
          border: `1.5px solid ${checked ? accent : C.border2}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Ico d="M3 8l3.5 3.5 6.5-6" size={9} col="#fff" />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: checked ? C.text : C.textDim, fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1, lineHeight: 1.35 }}>
          {desc}
        </div>
      </div>
    </button>
  );
}
