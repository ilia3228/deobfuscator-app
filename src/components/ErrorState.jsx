import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import FileStrip from './FileStrip.jsx';
import LogStrip from './LogStrip.jsx';
import { parseLayers } from '../utils/layers.js';

// Renders the failure / cancellation screen. All copy is derived from the
// real `job` (status, phase, error, logs); when no job is in flight (e.g.
// the user navigates here via Cmd-K), the screen falls back to a neutral
// "no error context" placeholder.
export default function ErrorState({ lang = 'js', lt, job, onRetry, onNew }) {
  const lth = lt || getLangTheme(lang);
  const [expanded, setExpanded] = useState(false);

  const status = job?.status || null; // 'error' | 'cancelled' | null
  const cancelled = status === 'cancelled';
  const isError = status === 'error';
  const hasContext = isError || cancelled;

  // ── derived facts ────────────────────────────────────────────────────────
  const filename = job?.filename || `sample.${lang === 'py' ? 'py' : 'js'}`;
  const phase = job?.phase || '—';
  const layers = parseLayers(job?.logs);
  const layersTotal = layers.length;
  const layersDone = layers.filter((l) => l.status === 'done').length;
  const layersText = layersTotal
    ? `${layersDone} of ${layersTotal} completed`
    : '—';
  const durationMs = job?.result?.stats?.duration_ms;
  const elapsedText = durationMs != null
    ? `${(durationMs / 1000).toFixed(1)}s`
    : (job?.progress != null && job.progress > 0
        ? `≈${Math.round(job.progress * 100)}% before stop`
        : '—');
  const errorMsg = cancelled
    ? 'Job cancelled by user.'
    : (job?.error || 'Unknown error');

  // Stack trace = tail of the log focused on ERR/WARN (or the last few lines
  // if the engine didn't emit error levels). Empty trace → accordion hidden.
  const logTail = job?.logs || [];
  const errLines = logTail.filter((l) => l && (l.level === 'ERR' || l.level === 'WARN'));
  const trace = errLines.length
    ? errLines.slice(-10)
    : logTail.slice(-6);

  const accent = cancelled ? C.orange : C.red;
  const accentDim = cancelled ? 'rgba(212,160,80,.08)' : 'rgba(212,95,95,.08)';

  const headerKicker = cancelled
    ? `cancelled · phase ${phase}`
    : isError
      ? `analysis failed · phase ${phase}`
      : 'no error context';
  const headerTitle = cancelled
    ? 'Job was cancelled before completion'
    : isError
      ? (firstLine(errorMsg) || 'Engine reported an error')
      : 'Nothing to show here';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FileStrip status="done" lang={lang} lt={lth} job={job} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', overflowY: 'auto',
        background: `radial-gradient(ellipse at top, ${accentDim} 0%, transparent 60%)` }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 3,
              background: cancelled ? 'rgba(212,160,80,.12)' : C.redDim,
              border: `1px solid ${cancelled ? '#4a3a20' : '#4a2020'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 24, color: accent, fontWeight: 300, lineHeight: 1 }}>
                {cancelled ? '⏸' : '!'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: accent, fontFamily: C.mono,
                textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 2 }}>
                {headerKicker}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.text, letterSpacing: '-0.02em' }}>
                {headerTitle}
              </div>
            </div>
          </div>

          {hasContext ? (
            <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 3,
              overflow: 'hidden', marginBottom: 14 }}>
              {[
                ['file',    filename],
                ['phase',   phase],
                ['layers',  layersText],
                ['elapsed', elapsedText],
                ['exit',    errorMsg],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', padding: '7px 14px',
                  borderBottom: `1px solid ${C.border}`, fontSize: 11.5, fontFamily: C.mono }}>
                  <span style={{ width: 70, color: C.textMuted }}>{k}</span>
                  <span style={{ flex: 1, color: C.textDim, wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}

              {trace.length > 0 && (
                <>
                  <button onClick={() => setExpanded(!expanded)} className="btn-hover"
                    style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontSize: 11, fontFamily: C.mono, color: C.textMuted,
                      background: C.bg2, border: 'none', width: '100%', textAlign: 'left' }}>
                    <span style={{ fontSize: 9, color: accent }}>{expanded ? '▼' : '▶'}</span>
                    <span>{errLines.length ? 'error log' : 'log tail'}</span>
                    <span style={{ marginLeft: 'auto', color: C.textMuted }}>
                      {expanded ? 'hide' : 'show'} · {trace.length} {trace.length === 1 ? 'line' : 'lines'}
                    </span>
                  </button>
                  {expanded && (
                    <div style={{ background: '#080808', padding: '10px 14px',
                      fontFamily: C.mono, fontSize: 11, lineHeight: 1.7,
                      borderTop: `1px solid ${C.border}` }}>
                      {trace.map((l, i) => (
                        <div key={i} style={{
                          color: l.level === 'ERR' ? C.red : l.level === 'WARN' ? C.orange : '#7a7a7a',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>
                          <span style={{ color: '#404040', marginRight: 8 }}>{l.t}</span>
                          <span style={{ color: '#606060', marginRight: 8 }}>{l.level}</span>
                          {l.text}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '14px 16px', background: C.bg1,
              border: `1px solid ${C.border}`, borderRadius: 3, marginBottom: 14,
              fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
              No analysis is currently associated with this view. Start a new
              analysis from the upload screen or open one from the sidebar.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {isError && onRetry && (
              <button onClick={onRetry} className="btn-hover" style={{ flex: 1, padding: '9px 0',
                background: lth.accentDim, border: `1px solid ${lth.accent}`,
                borderRadius: 3, fontSize: 12.5, fontWeight: 500, color: lth.accentText,
                cursor: 'pointer' }}>Retry</button>
            )}
            <button onClick={onNew} className="btn-hover" style={{ flex: 1, padding: '9px 0',
              background: hasContext ? C.bg3 : lth.accentDim,
              border: `1px solid ${hasContext ? C.border2 : lth.accent}`,
              borderRadius: 3, fontSize: 12.5,
              color: hasContext ? C.textDim : lth.accentText,
              cursor: 'pointer' }}>New analysis</button>
          </div>
        </div>
      </div>

      <LogStrip done lt={lth} entries={job?.logs} job={job} />
    </div>
  );
}

function firstLine(s) {
  if (!s) return '';
  const i = String(s).indexOf('\n');
  return i === -1 ? String(s) : String(s).slice(0, i);
}
