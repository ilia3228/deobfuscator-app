import React, { useEffect, useMemo, useRef, useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import { useResizable, ResizeHandle } from './Resizable.jsx';

// ─── log noise filters & sanitisation ────────────────────────────────────────
// Drop or rewrite log lines that leak filesystem details or just re-dump the
// code already visible in the main panel. Centralised so it's easy to tweak.

// Lines emitted by the backend's `codePreview` helper. The JS Logger writes
//   `  ␣␣1 │ !function () {`     using the box-drawing pipe (U+2502)
// and the Python Logger uses the ASCII pipe. The mock-api parser strips
// leading 2-space pairs into the `indent` field, so by the time we see it
// the leading whitespace may be gone. Match either pipe variant.
const CODE_PREVIEW_RE = /^\s*\d{1,4}\s*[|│]\s/;
const MORE_LINES_RE   = /^\s*\.{3,}\s*\(\d+\s+more lines?\)\s*$/;

// Path-bearing INFO chatter we don't want to surface in the UI.
// Some are dropped outright (the user never wants to see the API's run dir);
// others are kept but stripped down to a basename so the line is still useful.
const DROP_PATH_PREFIXES = [
  'Run report:',          // C:\…\runs\<id>\out\report.json
  'IOC report:',          // C:\…\runs\<id>\out\layer_0_ioc_report.js
  'Output:',              // C:\…\runs\<id>\out
  'Rejected output saved for inspection:',
];
const BASENAME_PATH_PREFIXES = [
  'File:',                // File: C:\…\pasted.js (51234 bytes)  →  File: pasted.js (51234 bytes)
  'Saved:',               // Saved: C:\…\out\sample.js           →  Saved: sample.js
];

function shortenPaths(text) {
  return text.replace(/[A-Za-z]:\\[^\s'"`)]+|\/[^\s'"`)]*\/[^\s'"`)]+/g, (m) => {
    const parts = m.split(/[\\/]/);
    return parts[parts.length - 1] || m;
  });
}

function filterAndSanitise(entries) {
  const out = [];
  for (const e of entries || []) {
    const text = e.text || '';
    const trimmed = text.trimStart();
    // Drop the line-by-line code dump that follows "Saved: …" in the backend.
    if (CODE_PREVIEW_RE.test(text)) continue;
    if (MORE_LINES_RE.test(text)) continue;
    // Drop noisy path-only chatter completely.
    if (DROP_PATH_PREFIXES.some((p) => trimmed.startsWith(p))) continue;
    // Trim paths down to their basename for the lines we keep.
    if (BASENAME_PATH_PREFIXES.some((p) => trimmed.startsWith(p))) {
      out.push({ ...e, text: shortenPaths(text) });
      continue;
    }
    out.push(e);
  }
  return out;
}

// ─── per-line colourisation ──────────────────────────────────────────────────
// Returns an array of `{ text, color }` segments for one log line so the
// most important parts (percentages, layer numbers, obfuscator names) jump
// out visually — without losing the surrounding context.
function colouriseLogText(e, lth, defaultColor) {
  const text = e.text || '';
  if (!text) return [{ text: ' ', color: defaultColor }];

  const segs = [];
  let i = 0;
  const len = text.length;
  const push = (t, color) => {
    if (!t) return;
    const last = segs[segs.length - 1];
    if (last && last.color === color) last.text += t;
    else segs.push({ text: t, color });
  };

  // Whole-line shortcuts — these read as section headers.
  if (text.startsWith('──')) return [{ text, color: lth.accentText }];
  if (/^Detected:\s/.test(text)) {
    const m = text.match(/^(Detected:\s+)(.+?)(\s*\(([\d.]+%)\))?\s*$/);
    if (m) {
      push(m[1], C.textDim);
      push(m[2], lth.accentText);
      if (m[3]) {
        push(' (', C.textMuted);
        push(m[4], C.orange);
        push(')', C.textMuted);
      }
      return segs;
    }
  }
  if (/^Methods:\s/.test(text) || /^Anti-analysis findings:\s/.test(text)) {
    const colon = text.indexOf(':');
    push(text.slice(0, colon + 1) + ' ', C.textDim);
    const items = text.slice(colon + 1).split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach((it, idx) => {
      if (idx > 0) push(', ', C.textMuted);
      push(it, lth.codeBuiltin || lth.accentText);
    });
    return segs;
  }
  if (/^(Saved|File):\s/.test(text)) {
    const m = text.match(/^(\w+:\s+)(\S+)(.*)$/);
    if (m) {
      push(m[1], C.textDim);
      push(m[2], lth.codeFn || lth.accentText);
      push(m[3], C.textMuted);
      return segs;
    }
  }
  if (/^Done\./.test(text)) return [{ text, color: C.green }];

  // Generic in-line colouring: numbers, percentages, "Layer N/M".
  // Tiny tokeniser — far cheaper than a regex replace per segment.
  while (i < len) {
    const c = text[i];
    // % numbers like "86%" → orange
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < len && /[0-9.]/.test(text[j])) j++;
      // optional suffix: "%", " ms", " bytes", " KB"
      const head = text.slice(i, j);
      if (text[j] === '%') {
        push(head + '%', C.orange);
        i = j + 1;
        continue;
      }
      push(head, lth.codeNumber || C.orange);
      i = j;
      continue;
    }
    // Layer headers in mid-line: "Layer 3/5"
    if (text.slice(i).startsWith('Layer ') && /^\d/.test(text.slice(i + 6))) {
      push('Layer ', lth.accentText);
      i += 6;
      continue;
    }
    // Quoted bits: 'foo' or "bar"
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < len && text[j] !== q) j++;
      if (j < len) j++;
      push(text.slice(i, j), lth.codeString || C.textDim);
      i = j;
      continue;
    }
    // Skip a regular char.
    let j = i;
    while (j < len && !/[0-9"'L]/.test(text[j])) j++;
    if (j === i) {
      push(text[i], defaultColor);
      i++;
    } else {
      push(text.slice(i, j), defaultColor);
      i = j;
    }
  }
  return segs.length ? segs : [{ text, color: defaultColor }];
}

export default function LogStrip({ running, done, lt, entries, job }) {
  const lth = lt || getLangTheme(null);
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState('all'); // all | info | debug | ok
  const logRef = useRef(null);

  // Log panel grows upward from the bottom; the user can drag its top
  // edge to change height. Persisted across reloads.
  const {
    size: logHeight,
    startDrag: startLogDrag,
    dragging: logDragging,
  } = useResizable({
    initial: 180, min: 80, max: 600,
    axis: 'y', edge: 'top',
    storageKey: 'jsdeobf.layout.log',
  });

  // Filter + sanitise the raw entries before anything else looks at them.
  const cleaned = useMemo(() => filterAndSanitise(entries), [entries]);

  const levelColor = {
    DEBUG: '#7a7a7a',
    INFO:  lth.logInfo || '#7aaee8',
    OK:    '#e8f4d8',
    WARN:  C.orange,
    ERR:   C.red,
  };
  // Default per-entry colour when no semantic pattern matched.
  const entryDefaultColor = (e) => {
    if (e.level === 'OK')   return '#ffffff';
    if (e.level === 'ERR')  return C.red;
    if (e.level === 'WARN') return C.orange;
    if (e.level === 'DEBUG') return '#8a8a8a';
    if (/⚠|fail|error/i.test(e.text)) return C.red;
    if (e.text.startsWith('↳')) return lth.logArrow || '#8aaecc';
    if (/not applicable|converged|no changes/.test(e.text)) return '#5a5a5a';
    return C.textDim;
  };

  const visible =
    filter === 'all' ? cleaned : cleaned.filter((e) => e.level === filter.toUpperCase());

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, cleaned.length]);

  const isLayerHeader = (e) => e.text.startsWith('──');
  const isDone = (e) => e.level === 'OK' && e.indent === 0;

  return (
    <div style={{
      borderTop: `1px solid ${C.border}`,
      background: C.bg1,
      flexShrink: 0,
      position: 'relative',
      '--resize-accent': lth.accent,
    }}>
      <ResizeHandle
        edge="top"
        onPointerDown={startLogDrag}
        dragging={logDragging}
        hidden={!open}
        label="Resize log panel"
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: open ? `1px solid ${C.border}` : 'none',
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          className="btn-hover"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px 10px 5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Ico d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} col={C.textMuted} />
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textMuted }}>log</span>
        </button>
        <span
          style={{
            fontFamily: C.mono,
            fontSize: 10,
            padding: '0 5px',
            borderRadius: 2,
            background: C.bg3,
            border: `1px solid ${C.border}`,
            color: C.textMuted,
          }}
        >
          {cleaned.length} lines
        </span>
        {running && (
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              color: lth.accentText,
              marginLeft: 8,
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          >
            ● running
          </span>
        )}
        {done && (
          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.teal, marginLeft: 8 }}>
            ✓ done{job?.result?.stats?.duration_ms
              ? ` · ${(job.result.stats.duration_ms / 1000).toFixed(1)}s`
              : ''}
          </span>
        )}
        {open && (
          <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', paddingRight: 10 }}>
            {['all', 'info', 'ok', 'debug'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="btn-hover"
                style={{
                  padding: '2px 7px',
                  borderRadius: 2,
                  fontSize: 10,
                  fontFamily: C.mono,
                  background: filter === f ? C.bg4 : 'none',
                  border: `1px solid ${filter === f ? C.border2 : 'transparent'}`,
                  color:
                    filter === f
                      ? f === 'ok'
                        ? C.teal
                        : f === 'info'
                        ? '#8aa5c8'
                        : f === 'debug'
                        ? '#9a9a9a'
                        : C.textDim
                      : C.textMuted,
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div
          ref={logRef}
          style={{
            background: '#080808',
            height: logHeight,
            overflowY: 'auto',
            fontFamily: C.mono,
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          {visible.length === 0 && (
            <div style={{
              padding: '10px 14px',
              color: C.textMuted,
              fontStyle: 'italic',
            }}>
              {running ? 'waiting for first log line…' : 'no log entries.'}
            </div>
          )}
          {visible.map((e, i) => {
            const col = levelColor[e.level] || '#7a7a7a';
            const header = isLayerHeader(e);
            const okDone = isDone(e);
            const defaultColor = entryDefaultColor(e);
            const segs = colouriseLogText(e, lth, defaultColor);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 0,
                  padding: header ? '4px 0 2px' : '0',
                  background: okDone
                    ? 'rgba(78,201,176,.06)'
                    : header
                    ? 'rgba(196,167,247,.04)'
                    : 'transparent',
                  borderTop: header ? `1px solid ${C.border}` : 'none',
                }}
              >
                <span
                  style={{
                    color: '#4a4a4a',
                    paddingLeft: 12,
                    paddingRight: 8,
                    userSelect: 'none',
                    flexShrink: 0,
                    fontSize: 10,
                  }}
                >
                  {e.t}
                </span>
                <span
                  style={{
                    width: 38,
                    flexShrink: 0,
                    textAlign: 'right',
                    paddingRight: 8,
                    color: col,
                    fontSize: 10,
                    fontWeight: e.level === 'OK' ? 600 : 400,
                  }}
                >
                  {e.level}
                </span>
                <span
                  style={{
                    paddingLeft: e.indent * 12,
                    fontWeight: header || okDone ? 500 : 400,
                    flex: 1,
                    paddingRight: 14,
                  }}
                >
                  {segs.map((s, j) => (
                    <span key={j} style={{ color: s.color }}>{s.text}</span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
