import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { C, E, getLangTheme } from '../theme.js';
import CodeLine from './CodeLine.jsx';
import { useResizable, ResizeHandle } from './Resizable.jsx';

function splitLines(text) {
  if (!text) return [];
  return text.replace(/\r\n?/g, '\n').split('\n');
}

// Two-pane side-by-side view. Each pane renders its own source verbatim
// (obfuscated on the left, deobfuscated on the right) with its own line
// numbering — there's no per-row alignment, so a fully-different cleaned
// output isn't pushed below a blank gap on the right just because the
// obfuscated input has two lines at the top.
//
// Vertical scrolling is mirrored pixel-for-pixel between panes so the
// eye keeps its place when comparing positions; horizontal scrolling
// stays per-pane so a single 60 KB obfuscated line doesn't drag the
// cleaned pane along with it. Active-row highlighting is shared (same
// 1-based row index on both sides) and reset by the parent on tab
// changes.
export default function SplitDiff({
  original = '',
  clean = '',
  lang = 'js',
  lt,
  activeLine,
  setActiveLine,
}) {
  const theme = lt || getLangTheme(lang);
  const leftLines  = useMemo(() => splitLines(original), [original]);
  const rightLines = useMemo(() => splitLines(clean),    [clean]);

  // Drag-to-resize split. Track the actual diff-container width so the
  // upper bound on the left pane shrinks reactively whenever the IOC
  // panel opens / sidebar collapses / window resizes — otherwise a
  // previously-saved width could push the right pane to zero and hide
  // the resize handle behind the IOC column.
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const LEFT_MIN = 240;
  const RIGHT_MIN = 240;
  // Before the observer fires (first paint) containerWidth is 0 — use a
  // generous fallback so a healthy saved width isn't rejected by the
  // localStorage validator inside useResizable.
  const dynamicMax = Math.max(
    LEFT_MIN,
    (containerWidth || 4096) - RIGHT_MIN,
  );

  const {
    size: leftWidth,
    setSize: setLeftWidth,
    startDrag: startSplitDrag,
    dragging: splitDragging,
  } = useResizable({
    initial: 560, min: LEFT_MIN, max: dynamicMax,
    axis: 'x', edge: 'right',
    storageKey: 'jsdeobf.layout.splitDiff',
  });

  // Container shrank below the current leftWidth + RIGHT_MIN budget
  // (e.g. user opened the IOC panel) — pull the divider back so the
  // right pane never collapses under RIGHT_MIN.
  useEffect(() => {
    if (!containerWidth) return;
    if (leftWidth > dynamicMax) setLeftWidth(dynamicMax);
  }, [containerWidth, dynamicMax, leftWidth, setLeftWidth]);

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncing = useRef(false);

  // Mirror scrollTop from `from` to `to`, guarded against the
  // ping-pong feedback that React fires when we set scrollTop
  // programmatically and the browser re-emits a scroll event.
  const makeSync = useCallback((from, to) => () => {
    const src = from.current;
    const dst = to.current;
    if (!src || !dst) return;
    if (syncing.current) return;
    if (dst.scrollTop === src.scrollTop) return;
    syncing.current = true;
    dst.scrollTop = src.scrollTop;
    // Release on next frame so the mirrored scroll event has fired.
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}
    >
      {/* LEFT pane: fixed width, owns the drag handle on its right edge.
          --resize-accent feeds the ::after hover/drag colour in styles.css. */}
      <div
        style={{
          width: leftWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRight: `1px solid ${C.border}`,
          ['--resize-accent']: theme.accent,
        }}
      >
        <Pane
          title="obfuscated"
          lines={leftLines}
          paneRef={leftRef}
          onScroll={makeSync(leftRef, rightRef)}
          lang={lang}
          lt={theme}
          activeLine={activeLine}
          setActiveLine={setActiveLine}
        />
        <ResizeHandle
          edge="right"
          onPointerDown={startSplitDrag}
          dragging={splitDragging}
          label="Resize split"
        />
      </div>
      <Pane
        title="deobfuscated"
        lines={rightLines}
        paneRef={rightRef}
        onScroll={makeSync(rightRef, leftRef)}
        lang={lang}
        lt={theme}
        activeLine={activeLine}
        setActiveLine={setActiveLine}
      />
    </div>
  );
}

function Pane({
  title, lines, paneRef, onScroll, lang, lt,
  activeLine, setActiveLine,
}) {
  return (
    <div
      ref={paneRef}
      onScroll={onScroll}
      className="editor-scroll"
      style={{ flex: 1, minWidth: 0 }}
    >
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 12px',
          background: '#0a0a0a',
          borderBottom: `1px solid ${C.border}`,
          fontFamily: 'Geist, sans-serif',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 10.5, color: C.textMuted, letterSpacing: '.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>
          {lines.length} {lines.length === 1 ? 'line' : 'lines'}
        </span>
      </div>
      <table className="editor-table">
        <tbody>
          {lines.map((text, i) => {
            const ln = i + 1;
            const cls = ['editor-line'];
            if (activeLine === ln) cls.push('active');
            return (
              <tr
                key={i}
                className={cls.join(' ')}
                onClick={() => setActiveLine && setActiveLine(ln)}
              >
                <td
                  className="ed-marker"
                  style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    width: 18, minWidth: 18,
                    padding: '1px 0 0',
                    userSelect: 'none',
                    verticalAlign: 'top',
                  }}
                />
                <td
                  className="ed-ln"
                  style={{
                    position: 'sticky', left: 18, zIndex: 1,
                    width: 50, minWidth: 50,
                    padding: '1px 12px 0 0',
                    textAlign: 'right',
                    color: E.gutterFg,
                    fontSize: 11.5,
                    userSelect: 'none',
                    verticalAlign: 'top',
                    borderRight: `1px solid ${E.gutterDivider}`,
                  }}
                >
                  {ln}
                </td>
                <td
                  className="ed-code"
                  style={{
                    padding: '1px 32px 0 14px',
                    verticalAlign: 'top',
                    width: '100%',
                  }}
                >
                  <code
                    style={{
                      display: 'block',
                      whiteSpace: 'pre',
                      fontVariantLigatures: 'none',
                    }}
                  >
                    <CodeLine line={text} lang={lang} lt={lt} />
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
