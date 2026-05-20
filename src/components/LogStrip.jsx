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

// JS deobfuscator banner — three box-drawing lines printed to stderr at
// startup (`Logger.header()` in js-deobfuscator/src/utils/logger.ts). They
// add three visually-noisy rows to the top of every analysis with no useful
// content, so we strip them client-side.
const BANNER_RE = /^\s*[╔╗╚╝║]/;

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
    // Drop blank/whitespace-only entries (real content lines never get here).
    if (!trimmed) continue;
    // Drop the JS deobfuscator's startup banner.
    if (BANNER_RE.test(text)) continue;
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
// most important parts (percentages, layer numbers, file sizes, durations)
// jump out visually — without losing the surrounding context.
//
// Rule of thumb: only colour numbers that sit in a *named* context the user
// cares about (a percentage, "Layer N/M", "X bytes", "Xms", "N identifiers",
// …). Random digits inside obfuscator IDs (`_0x4a8d`), hex literals
// (`0x29071`) and content hashes (`47aa7e8edf61a7ca`) stay dim — colouring
// arbitrary digits made every log line look like a Christmas tree.
function colouriseLogText(e, lth, defaultColor) {
  const text = e.text || '';
  if (!text) return [{ text: ' ', color: defaultColor }];

  // Whole-line shortcuts — these read as section headers.
  // Match the ASCII (─) and box-drawing (━ ═) horizontal runs the backends
  // emit for layer / IOC report separators.
  if (/^\s*[─━═]{2,}/.test(text)) return [{ text, color: lth.accentText }];

  if (/^Detected:\s/.test(text)) {
    const m = text.match(/^(Detected:\s+)(.+?)(\s*\(([\d.]+%)\))?\s*$/);
    if (m) {
      const segs = [
        { text: m[1], color: C.textDim },
        { text: m[2], color: lth.accentText },
      ];
      if (m[3]) {
        segs.push({ text: ' (',  color: C.textMuted });
        segs.push({ text: m[4],  color: C.orange });
        segs.push({ text: ')',   color: C.textMuted });
      }
      return segs;
    }
  }
  if (/^Methods:\s/.test(text) || /^Anti-analysis findings:\s/.test(text)) {
    const colon = text.indexOf(':');
    const segs = [{ text: text.slice(0, colon + 1) + ' ', color: C.textDim }];
    const items = text.slice(colon + 1).split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach((it, idx) => {
      if (idx > 0) segs.push({ text: ', ', color: C.textMuted });
      segs.push({ text: it, color: lth.codeBuiltin || lth.accentText });
    });
    return segs;
  }
  if (/^(Saved|File):\s/.test(text)) {
    const m = text.match(/^(\w+:\s+)(\S+)(.*)$/);
    if (m) {
      return [
        { text: m[1], color: C.textDim },
        { text: m[2], color: lth.codeFn || lth.accentText },
        { text: m[3], color: C.textMuted },
      ];
    }
  }
  if (/^Done\./.test(text)) return [{ text, color: C.green }];

  // Generic case: collect "skip" and "highlight" ranges, then stitch
  // unhighlighted gaps as default-coloured spans.
  const numColor = lth.codeNumber || C.orange;
  const strColor = lth.codeString || C.textDim;
  const accentCol = lth.accentText;

  // Ranges we MUST leave untouched — colouring slices of these reads
  // as "the parser thinks 4 and a8d are different things".
  const skip = [];
  const reSkip = /_?0x[a-fA-F0-9]+|\b[a-fA-F0-9]{12,}\b/g;
  for (let m; (m = reSkip.exec(text)); ) skip.push([m.index, m.index + m[0].length]);
  const inSkip = (s, end) => skip.some(([a, b]) => s < b && end > a);

  const ranges = [];
  const add = (start, end, color) => {
    if (start >= end || inSkip(start, end)) return;
    ranges.push({ start, end, color });
  };

  // Quoted bits: 'foo' or "bar" — fold into the string colour, and treat the
  // whole quoted region as a skip range so later patterns don't carve out
  // sub-fragments inside it (e.g. "1 changes" inside a literal sentence).
  const reStr = /"[^"\\\n]*(?:\\.[^"\\\n]*)*"|'[^'\\\n]*(?:\\.[^'\\\n]*)*'/g;
  for (let m; (m = reStr.exec(text)); ) {
    ranges.push({ start: m.index, end: m.index + m[0].length, color: strColor });
    skip.push([m.index, m.index + m[0].length]);
  }

  // Numbers with optional thousand-separator characters in any locale.
  // js-deobf uses `Number.toLocaleString()`, which on Windows + a non-en
  // locale (ru / fr / pl …) inserts NBSP / NARROW NBSP / THIN SPACE
  // between thousands. The Swiss apostrophe and the English comma are
  // common when other tools are mixed in.
  //   `\d[…]*(?:\.\d+)?` — one leading digit, then any combination of
  //   digit + thousand-separator chars, then an optional fractional tail.
  const NUM = `\\d[\\d \\u00A0\\u202F\\u2009',]*(?:\\.\\d+)?`;
  const trimSepEnd = (s) => s.replace(/[\s\u00A0\u202F\u2009',]+$/, '');

  // "Layer N" and "Layer N/M" — highlight both the keyword and the numerals.
  const reLayer = /\bLayer\s+(\d+)(?:\s*\/\s*(\d+))?/g;
  for (let m; (m = reLayer.exec(text)); ) {
    add(m.index, m.index + 5, accentCol); // "Layer"
    const n1 = m.index + m[0].indexOf(m[1]);
    add(n1, n1 + m[1].length, numColor);
    if (m[2]) {
      const n2 = m.index + m[0].lastIndexOf(m[2]);
      add(n2, n2 + m[2].length, numColor);
    }
  }

  // Percentages — "86%", "100%", "0.5%". The whole thing (digits + %) is the
  // semantic unit, so colour m[0] verbatim.
  const rePct = new RegExp(`\\b${NUM}%`, 'g');
  for (let m; (m = rePct.exec(text)); ) add(m.index, m.index + m[0].length, C.orange);

  // File sizes — "1 421 bytes", "9.0 KB", "267 chars" (number portion only).
  const reSize = new RegExp(`\\b(${NUM})\\s*(?:bytes?|chars?|KB|MB|GB|kB|kb|B)\\b`, 'g');
  for (let m; (m = reSize.exec(text)); ) {
    add(m.index, m.index + trimSepEnd(m[1]).length, numColor);
  }

  // Durations — "5.5s", "250ms", "1 250 ms" (number portion only).
  const reDur = new RegExp(`\\b(${NUM})\\s?(?:ms|s)\\b`, 'g');
  for (let m; (m = reDur.exec(text)); ) {
    add(m.index, m.index + trimSepEnd(m[1]).length, numColor);
  }

  // Counts — "Renamed 4 identifiers", "AST pass 1: 0 changes", "5/8 patterns",
  // "16 entries", "2 string transforms", "5 webpack modules". The trailing
  // noun list is what stops random integers (e.g. file paths with numbers)
  // from picking up the highlight.
  const reCount = new RegExp(
    `\\b(${NUM})\\s+(?:identifiers?|changes?|entries|patterns?|modules?|layers?|errors?|warnings?|matches?|hits?|bindings?|aliases?|nodes?|transforms?|unpackers?|passes?|decoders?|samples?|webpack)\\b`,
    'g',
  );
  for (let m; (m = reCount.exec(text)); ) {
    add(m.index, m.index + trimSepEnd(m[1]).length, numColor);
  }

  // "pass N" / "AST pass N".
  const rePass = /\b[Pp]ass\s+(\d+)\b/g;
  for (let m; (m = rePass.exec(text)); ) {
    const start = m.index + m[0].indexOf(m[1]);
    add(start, start + m[1].length, numColor);
  }

  // Fractions — "5/8", "1/2" (both numerator and denominator).
  const reFrac = /\b(\d+)\/(\d+)\b/g;
  for (let m; (m = reFrac.exec(text)); ) {
    add(m.index, m.index + m[1].length, numColor);
    const dStart = m.index + m[0].length - m[2].length;
    add(dStart, dStart + m[2].length, numColor);
  }

  if (!ranges.length) return [{ text, color: defaultColor }];
  ranges.sort((a, b) => a.start - b.start);

  const segs = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue; // skip overlaps; first one wins
    if (r.start > pos) segs.push({ text: text.slice(pos, r.start), color: defaultColor });
    segs.push({ text: text.slice(r.start, r.end), color: r.color });
    pos = r.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), color: defaultColor });

  // Coalesce neighbours that share a colour so we emit fewer <span>s.
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last.color === s.color) last.text += s.text;
    else out.push(s);
  }
  return out;
}

export default function LogStrip({ running, done, lt, entries, job, defaultOpen = true }) {
  const lth = lt || getLangTheme(null);
  const [open, setOpen] = useState(defaultOpen);
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

  const isLayerHeader = (e) => /^\s*[─━═]{2,}/.test(e.text);
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
