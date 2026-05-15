import React from 'react';
import { E, getLangTheme } from '../theme.js';
import CodeLine from './CodeLine.jsx';

// Read-only IDE-style code viewer. Used during in-flight analysis
// (AnalyzingState) to show the uploaded source. Mirrors the editor
// surface from ResultsState: sticky line-number gutter, no soft wrap,
// horizontal scroll for long minified lines.
export default function CodeViewer({ lines, lang = 'js', lt }) {
  const theme = lt || getLangTheme(lang);
  return (
    <div className="editor-scroll" style={{ flex: 1 }}>
      <table className="editor-table">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="editor-line">
              <td
                className="ed-ln"
                style={{
                  position: 'sticky', left: 0, zIndex: 1,
                  width: 56, minWidth: 56,
                  padding: '1px 14px 0 8px',
                  textAlign: 'right',
                  color: E.gutterFg,
                  fontSize: 11.5,
                  userSelect: 'none',
                  verticalAlign: 'top',
                  borderRight: `1px solid ${E.gutterDivider}`,
                }}
              >
                {i + 1}
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
                  <CodeLine line={line} lang={lang} lt={theme} />
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
