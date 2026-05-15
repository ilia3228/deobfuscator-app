import React from 'react';
import { E } from '../theme.js';
import CodeLine from './CodeLine.jsx';

// One row inside the IDE-style editor table. Renders three cells:
//
//   ┌────┬─────┬──────────────────────────
//   │ ●  │  42 │ <code line>
//   └────┴─────┴──────────────────────────
//     ↑     ↑       ↑
//     │     │       └── code (whitespace: pre, no wrap)
//     │     └── line number gutter (sticky-left, right-aligned)
//     └── marker gutter (sticky-left, holds IOC dot / diff +/−)
//
// Both gutter cells are `position: sticky; left: …` so they stay
// pinned when the user scrolls horizontally on a long minified line.
// Row state classes (`active`, `ioc`, `add`, `del`) feed the .editor-line
// CSS rules in styles.css for hover / active backgrounds.
export default function IocRow({
  isIoc, isAdd, isDel, ln, line, iocLabel, lang = 'js', lt,
  isActive, onClick,
}) {
  const cls = ['editor-line'];
  if (isActive) cls.push('active');
  if (isIoc)    cls.push('ioc');
  if (isAdd)    cls.push('add');
  if (isDel)    cls.push('del');

  // Single-glyph marker. IOC bullet trumps diff markers; can't be both
  // anyway since IOC rows only render on the cleaned tab.
  const markerChar  = isIoc ? '●' : isAdd ? '+' : isDel ? '−' : '';
  const markerColor = isIoc ? E.iocMark
                    : isAdd ? E.diffAddFg
                    : isDel ? E.diffDelFg
                    : 'transparent';

  // Diff +/- lines override the whole tokeniser output with one colour
  // so the row reads as add/delete at a glance.
  const override = isDel ? E.diffDelFg : isAdd ? E.diffAddFg : null;

  return (
    <tr
      className={cls.join(' ')}
      onClick={onClick}
      title={isIoc ? iocLabel : undefined}
    >
      <td
        className="ed-marker"
        style={{
          position: 'sticky', left: 0, zIndex: 1,
          width: 18, minWidth: 18,
          padding: '1px 0 0',
          textAlign: 'center',
          color: markerColor,
          fontSize: 10,
          userSelect: 'none',
          verticalAlign: 'top',
        }}
      >
        {markerChar}
      </td>
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
          <CodeLine line={line} lang={lang} lt={lt} override={override} />
        </code>
      </td>
    </tr>
  );
}
