import React, { useState, useEffect } from 'react';
import { C, E, getLangTheme, tabBadge } from '../theme.js';
import { Tag } from './UI.jsx';
import FileStrip from './FileStrip.jsx';
import IocRow from './IocRow.jsx';
import LogStrip from './LogStrip.jsx';
import SplitDiff from './SplitDiff.jsx';
import { useResizable, ResizeHandle } from './Resizable.jsx';

// IDE-toolbar icons — tiny inline SVGs, currentColor-driven so the
// surrounding .editor-toolbar-btn:hover rule can light them up.
const IconCopy = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="3.5" width="8" height="8" rx="1.4" />
    <path d="M5.5 1.5h6a1 1 0 0 1 1 1v6" />
  </svg>
);
const IconSave = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden>
    <path d="M7 1.5v8m0 0L4.5 7m2.5 2.5L9.5 7" />
    <path d="M2 10v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10" />
  </svg>
);

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  // legacy fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch { return false; }
}

function downloadBlob(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ResultsState({ iocOpen, setIocOpen, lang = 'js', lt, job }) {
  const lth = lt || getLangTheme(lang);
  const [tab, setTab] = useState('cleaned');
  const [copyTick, setCopyTick] = useState(0);
  const [iocCopiedKey, setIocCopiedKey] = useState(null);
  // IDE-style active line — null = no row selected. Click any row to
  // light it up; reset to null whenever the tab changes since line
  // indices are no longer meaningful in the new content.
  const [activeLine, setActiveLine] = useState(null);
  useEffect(() => { setActiveLine(null); }, [tab]);

  // IOC side-panel is user-resizable from its left edge; width persists
  // in localStorage so it survives reloads.
  const {
    size: iocWidth,
    startDrag: startIocDrag,
    dragging: iocDragging,
  } = useResizable({
    initial: 290, min: 220, max: 520,
    axis: 'x', edge: 'left',
    storageKey: 'jsdeobf.layout.ioc',
  });

  const r = job?.result;
  const ext = lang === 'py' ? 'py' : 'js';

  const cleanCode    = r?.clean_code    ?? '';
  const originalCode = r?.original_code ?? '';
  const diffCode     = r?.diff_code     ?? '';
  const iocs         = r?.iocs          ?? [];
  const mitre        = r?.mitre         ?? [];

  const report = JSON.stringify(
    r
      ? {
          file: r.filename, sha256: r.sha256, engine: r.engine,
          duration_ms: r.stats?.duration_ms, layers: r.stats?.layers,
          input_bytes: r.stats?.input_bytes, output_bytes: r.stats?.output_bytes,
          llm_used: r.stats?.llm_used, severity: 'high',
          ioc_count: (r.iocs || []).length,
          obfuscators: (r.layer_cards || []).map((c) => c.obfuscator),
          anti_analysis: (r.layer_cards || []).flatMap((c) => c.antiAnalysis || []),
        }
      : {
          file: job?.filename || `sample.${ext}`,
          duration_ms: null, layers: null, severity: 'unknown',
        },
    null, 2);

  const codeMap = {
    cleaned: cleanCode,
    original: originalCode,
    diff: diffCode,
    report,
    ...Object.fromEntries(
      (r?.layer_cards || []).map((c, i) => [`layer-${i + 1}`, c.preview || originalCode])
    ),
  };

  const layerTabs = (r?.layer_cards || []).map((_, i) => ({
    id: `layer-${i + 1}`,
    label: `layer-${i + 1}.${ext}`,
  }));
  const tabs = [
    { id: 'cleaned',  label: `cleaned.${ext}` },
    { id: 'diff',     label: 'diff' },
    ...layerTabs,
    { id: 'original', label: `original.${ext}` },
    { id: 'report',   label: 'report.json' },
  ];

  const currentText = codeMap[tab] || '';
  const codeLines = currentText.split('\n');

  const baseName = (r?.filename || job?.filename || `sample.${ext}`).replace(/\.[^.]+$/, '');
  const fileFor = (t) => {
    if (t === 'report')  return `${baseName}.report.json`;
    if (t === 'diff')    return `${baseName}.diff.${ext}`;
    if (t === 'cleaned') return `${baseName}.cleaned.${ext}`;
    if (t === 'original')return `${baseName}.original.${ext}`;
    if (t.startsWith('layer-')) return `${baseName}.${t}.${ext}`;
    return `${baseName}.${t}`;
  };
  const onCopy = async () => {
    if (await copyToClipboard(currentText)) setCopyTick((n) => n + 1);
  };
  const onSave = () => {
    const mime = tab === 'report' ? 'application/json' : 'text/plain';
    downloadBlob(fileFor(tab), currentText, mime);
  };
  const onSaveCleaned = () => {
    downloadBlob(fileFor('cleaned'), cleanCode, 'text/plain');
  };
  const onExportJson = () => {
    downloadBlob(`${baseName}.report.json`, report, 'application/json');
  };
  const onCopyIoc = async (ioc, key) => {
    if (await copyToClipboard(String(ioc.value))) {
      setIocCopiedKey(key);
      setTimeout(() => setIocCopiedKey((k) => (k === key ? null : k)), 1100);
    }
  };
  // crude IOC line spotting — flag every line that contains an IOC value
  const iocByLine = new Map();
  if (tab === 'cleaned') {
    codeLines.forEach((line, i) => {
      const hit = iocs.find((ioc) => line.includes(String(ioc.value).slice(0, 24)));
      if (hit) iocByLine.set(i + 1, hit);
    });
  }

  const iocByType = iocs.reduce((acc, ioc) => {
    if (!acc[ioc.type]) acc[ioc.type] = [];
    acc[ioc.type].push(ioc);
    return acc;
  }, {});

  const sevCount = (s) => iocs.filter((i) => i.sev === s).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FileStrip
        status="done"
        onIocToggle={() => setIocOpen(!iocOpen)}
        iocOpen={iocOpen}
        lang={lang}
        lt={lth}
        job={job}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            // Per-language accent feeds the active-tab top stripe via
            // the .editor-tab.active::before rule.
            ['--tab-accent']: lth.accent,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: E.tabStripBg,
              borderBottom: `1px solid ${C.border}`,
              overflowX: 'auto',
              flexShrink: 0,
              height: 32,
            }}
          >
            {tabs.map((t) => {
              const b = tabBadge(t.id, lang);
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  className={`editor-tab${isActive ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                >
                  <span className="badge" style={{ background: b.bg, color: b.fg }}>
                    {b.text}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
            <div style={{ flex: 1, borderBottom: `1px solid ${E.tabDivider}` }} />
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '0 8px',
                borderBottom: `1px solid ${E.tabDivider}`,
              }}
            >
              <button
                onClick={onCopy}
                className="editor-toolbar-btn"
                title="Copy current tab to clipboard"
              >
                <IconCopy />
                <span>{copyTick > 0 ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={onSave}
                className="editor-toolbar-btn"
                title="Download current tab as a file"
              >
                <IconSave />
                <span>Save</span>
              </button>
            </div>
          </div>

          {tab === 'diff' ? (
            <SplitDiff
              original={originalCode}
              clean={cleanCode}
              lang={lang}
              lt={lth}
              activeLine={activeLine}
              setActiveLine={setActiveLine}
            />
          ) : (
            <div className="editor-scroll" style={{ flex: 1 }}>
              <table className="editor-table">
                <tbody>
                  {codeLines.map((line, i) => {
                    const ln = i + 1;
                    const iocMatch = iocByLine.get(ln);
                    const isIoc = !!iocMatch;
                    const iocLabel = iocMatch
                      ? `IOC · ${iocMatch.type} · ${String(iocMatch.sev).toUpperCase()}: ${iocMatch.value}`
                      : 'IOC indicator — see IOC panel';
                    return (
                      <IocRow
                        key={i}
                        isIoc={isIoc}
                        isAdd={false}
                        isDel={false}
                        ln={ln}
                        line={line}
                        iocLabel={iocLabel}
                        lang={tab === 'report' ? 'js' : lang}
                        lt={lth}
                        isActive={activeLine === ln}
                        onClick={() => setActiveLine(ln)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {iocOpen && (
          <div
            style={{
              width: iocWidth,
              borderLeft: `1px solid ${C.border}`,
              background: C.bg1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
              '--resize-accent': lth.accent,
            }}
          >
            <ResizeHandle
              edge="left"
              onPointerDown={startIocDrag}
              dragging={iocDragging}
              label="Resize IOC panel"
            />
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.text,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                IOC
              </span>
              <div style={{ display: 'flex', gap: 5 }}>
                <Tag sev="high" small>{sevCount('high')}×HIGH</Tag>
                <Tag sev="med"  small>{sevCount('med')}×MED</Tag>
                <Tag sev="low"  small>{sevCount('low')}×LOW</Tag>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {Object.entries(iocByType).map(([type, items]) => (
                <div key={type} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div
                    style={{
                      padding: '7px 12px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '.1em',
                      fontFamily: C.mono,
                    }}
                  >
                    {type} ({items.length})
                  </div>
                  {items.map((ioc, j) => (
                    <div
                      key={j}
                      className="ioc-row"
                      style={{ padding: '5px 12px', cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <code
                          style={{
                            fontSize: 10.5,
                            color: C.textDim,
                            fontFamily: C.mono,
                            wordBreak: 'break-all',
                            flex: 1,
                            lineHeight: 1.5,
                          }}
                        >
                          {ioc.value}
                        </code>
                        <Tag sev={ioc.sev} small>
                          {ioc.sev}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                        <button
                          onClick={() => onCopyIoc(ioc, `${type}-${j}`)}
                          className="btn-hover"
                          style={{
                            fontSize: 10,
                            padding: '1px 7px',
                            borderRadius: 2,
                            background: C.bg3,
                            border: `1px solid ${C.border}`,
                            cursor: 'pointer',
                            color: C.textDim,
                            fontFamily: C.mono,
                          }}
                        >
                          {iocCopiedKey === `${type}-${j}` ? 'copied' : 'copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ borderBottom: `1px solid ${C.border}` }}>
                <div
                  style={{
                    padding: '7px 12px 4px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    fontFamily: C.mono,
                  }}
                >
                  MITRE ATT&amp;CK
                </div>
                {mitre.map((m) => (
                  <div
                    key={m.id}
                    className="ioc-row"
                    style={{ padding: '5px 12px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <code
                        style={{
                          fontSize: 10.5,
                          color: lth.accentText,
                          fontFamily: C.mono,
                          flexShrink: 0,
                        }}
                      >
                        {m.id}
                      </code>
                      <span style={{ fontSize: 11, color: '#909090', lineHeight: 1.5 }}>
                        {m.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        paddingLeft: 56,
                        fontFamily: C.mono,
                      }}
                    >
                      {m.tac}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '8px 10px',
                borderTop: `1px solid ${C.border}`,
                display: 'flex',
                gap: 5,
              }}
            >
              <button
                onClick={onExportJson}
                className="btn-hover"
                title="Download a JSON report bundle of this analysis"
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  fontSize: 10.5,
                  cursor: 'pointer',
                  color: C.textDim,
                  fontFamily: 'Geist, sans-serif',
                }}
              >
                Export JSON
              </button>
              <button
                onClick={onSaveCleaned}
                className="btn-hover"
                title="Download the cleaned source"
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  fontSize: 10.5,
                  cursor: 'pointer',
                  color: C.textDim,
                  fontFamily: 'Geist, sans-serif',
                }}
              >
                Save cleaned
              </button>
            </div>
          </div>
        )}
      </div>

      <LogStrip done lt={lth} entries={job?.logs} job={job} />
    </div>
  );
}
