import React from 'react';
import { C, getLangTheme } from '../theme.js';
import { Tag } from './UI.jsx';
import { parseLayers } from '../utils/layers.js';

export default function FileStrip({ status, onIocToggle, iocOpen, lang = 'js', lt, job, onCancel }) {
  const lth = lt || getLangTheme(lang);
  const r = job?.result;
  const fileName = job?.filename || `sample.${lang === 'py' ? 'py' : 'js'}`;
  const inputBytes = r?.stats?.input_bytes ?? job?.size;
  const outputBytes = r?.stats?.output_bytes;
  const durationMs = r?.stats?.duration_ms;
  const layers = r?.stats?.layers ?? r?.layer_cards?.length;
  const iocCounts = (sev) => (r?.iocs || []).filter((i) => i.sev === sev).length;
  const fmtKB = (b) => (b == null ? null : `${(b / 1024).toFixed(1)} KB`);

  // Collect actually-detected obfuscation techniques. Prefer the
  // authoritative `layer_cards` once the job is done; during the
  // analyzing phase fall back to live `Detected: …` lines parsed from
  // the log stream. Drop placeholders the backend may emit when no real
  // technique fired:
  //   - `python (auto-detected)` / `js (auto-detected)` — lang routing.
  //   - `unknown` / `none` — debug.log summary missing or `detected=none`.
  const isLangSniff = (t) =>
    !t
    || /\(auto[- ]?detected\)/i.test(t)
    || /^(unknown|none)$/i.test(t.trim());
  const liveTechniques = parseLayers(job?.logs)
    .map((l) => l.name)
    .filter((t) => t && !isLangSniff(t));
  const techniques = (
    r?.layer_cards?.length
      ? r.layer_cards.map((c) => c.obfuscator)
      : liveTechniques
  ).filter((t) => t && !isLangSniff(t));

  const hasDetections = techniques.length > 0;
  // Hide the chip entirely once the job is done with no real
  // techniques — falling back to a literal "—" or hard-coded language
  // tag carries no information and just adds visual noise. While the
  // job is still running we keep `detecting…` so the user sees
  // PatternDetect is in progress.
  const showChip = hasDetections || status === 'running';
  const obfChip = hasDetections
    ? (techniques.length === 1
        ? techniques[0]
        : `${techniques[0]} +${techniques.length - 1}`)
    : 'detecting…';
  const obfTitle = hasDetections
    ? `Detected: ${techniques.join(', ')}`
    : 'PatternDetect is still running…';
  const obfColor = lth.accentText;
  const obfBg = lth.accentDim;
  const obfBorder = lth.accent + '55';

  return (
    <div
      style={{
        height: 38,
        background: C.bg2,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: C.bg3,
          border: `1px solid ${C.border2}`,
          padding: '3px 10px',
          borderRadius: 3,
        }}
      >
        {status === 'running' ? (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: C.red,
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          />
        ) : (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal }} />
        )}
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text, whiteSpace: 'nowrap' }}>
          {fileName}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{fmtKB(inputBytes) || '—'}</span>
        {showChip && (
          <span
            title={obfTitle}
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              color: obfColor,
              padding: '1px 6px',
              background: obfBg,
              border: `1px solid ${obfBorder}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderRadius: 2,
              cursor: hasDetections && techniques.length > 1 ? 'help' : 'default',
            }}
          >
            {obfChip}
          </span>
        )}
      </div>

      {status === 'done' && (
        <>
          <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.green }}>
            {fmtKB(outputBytes) || '—'}
          </span>
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              color: C.textDim,
              background: C.tealDim,
              border: `1px solid ${C.teal}`,
              padding: '1px 6px',
              borderRadius: 2,
            }}
          >
            {layers || 0} layers{durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 5 }}>
            {iocCounts('high') > 0 && <Tag sev="high">{iocCounts('high')} HIGH</Tag>}
            {iocCounts('med')  > 0 && <Tag sev="med">{iocCounts('med')} MED</Tag>}
            {iocCounts('low')  > 0 && <Tag sev="low">{iocCounts('low')} LOW</Tag>}
          </div>
          <button
            onClick={onIocToggle}
            className="btn-hover"
            style={{
              padding: '3px 11px',
              background: iocOpen ? lth.accentDim : C.bg3,
              border: `1px solid ${iocOpen ? lth.accent : C.border2}`,
              borderRadius: 2,
              fontSize: 11.5,
              color: iocOpen ? lth.accentText : C.textDim,
              cursor: 'pointer',
              fontFamily: C.mono,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ fontSize: 13 }}>{iocOpen ? '✕' : '☰'}</span>
            <span>IOC</span>
          </button>
        </>
      )}

      {status === 'running' && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                border: `1.5px solid ${lth.accent}`,
                borderTopColor: 'transparent',
                animation: 'spin .7s linear infinite',
              }}
            />
            <span style={{ fontSize: 11, fontFamily: C.mono, color: lth.accentText }}>
              phase: {job?.phase || 'detect'}
            </span>
            <span style={{ fontSize: 10.5, fontFamily: C.mono, color: C.textMuted }}>
              {Math.round((job?.progress || 0) * 100)}%
            </span>
          </div>
          <button
            className="btn-hover"
            onClick={onCancel}
            style={{
              padding: '3px 10px',
              background: C.bg3,
              border: `1px solid ${C.border2}`,
              borderRadius: 2,
              fontSize: 11,
              color: C.textDim,
              cursor: 'pointer',
              fontFamily: C.mono,
            }}
          >
            cancel
          </button>
        </>
      )}
    </div>
  );
}
