import React from 'react';
import { tokenize, getLangTheme } from '../theme.js';

// Renders a single line of source code with IDE-style token colouring.
// Use inside a <code> block or table cell. The component does not add
// any padding/margin of its own — wrap it however you need.
//
// Props:
//   - line:   raw source text (single line, no '\n')
//   - lang:   'js' | 'py' (anything else treated as JS)
//   - lt:     pre-computed language-theme object (optional; resolved
//             from `lang` when missing)
//   - override: when set, forces every token to this colour (used by
//             diff +/- rows so the whole row reads as add/delete)
export default function CodeLine({ line, lang, lt, override }) {
  const theme = lt || getLangTheme(lang);
  if (!line) return <>&nbsp;</>;
  if (override) {
    return <span style={{ color: override }}>{line}</span>;
  }
  const tokens = tokenize(line, lang, theme);
  if (tokens.length === 0) {
    return <span style={{ color: theme.codeIdent }}>{line}</span>;
  }
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.text}</span>
      ))}
    </>
  );
}
