import React from 'react';
import { C, getLangTheme } from '../theme.js';
import { PHASES } from '../data.js';
import { Ico } from './UI.jsx';
import FileStrip from './FileStrip.jsx';
import CodeViewer from './CodeViewer.jsx';
import LogStrip from './LogStrip.jsx';
import { parseLayers, lastNonEmpty } from '../utils/layers.js';

export default function AnalyzingState({ lang = 'js', lt, job, onCancel, streamError, onReconnect }) {
  const lth = lt || getLangTheme(lang);
  const phaseIdx = Math.max(0, PHASES.findIndex((p) => p.id === (job?.phase || 'detect')));
  const activePhase = job?.status === 'done' ? PHASES.length : phaseIdx;

  const liveLayers = parseLayers(job?.logs);
  // Once the job finishes the server hands us authoritative layer cards.
  const resultLayers = job?.result?.layer_cards || [];
  const layers = resultLayers.length ? resultLayers.map((c, i) => ({
    num: i + 1,
    total: resultLayers.length,
    name: c.obfuscator,
    status: c.done ? 'done' : 'running',
  })) : liveLayers;
  const lastLine = lastNonEmpty(job?.logs);
  const progress = Math.max(0, Math.min(1, Number(job?.progress || 0)));
  const etaText = estimateEta(job?.startedAt, progress);

  // The CodeViewer always shows what the user actually uploaded; we never
  // fall back to a static fixture during an in-flight job.
  const codeText = job?.uploadedCode || '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FileStrip status="running" lang={lang} lt={lth} job={job} onCancel={onCancel} />

      {streamError && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(212,95,95,.08)',
          borderBottom: `1px solid ${C.red}55`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11.5,
          fontFamily: C.mono,
          color: C.red,
          flexShrink: 0,
        }}>
          <span style={{ flex: 1 }}>{streamError}</span>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="btn-hover"
              style={{
                padding: '3px 10px',
                background: C.bg3,
                border: `1px solid ${C.red}55`,
                borderRadius: 2,
                fontSize: 11,
                color: C.text,
                cursor: 'pointer',
                fontFamily: C.mono,
              }}
            >
              reconnect
            </button>
          )}
        </div>
      )}

      <div
        style={{
          height: 36,
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 14px',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {PHASES.map((ph, i) => {
          const done = i < activePhase;
          const active = i === activePhase;
          return (
            <React.Fragment key={ph.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9.5,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    background: done ? C.tealDim : active ? lth.accentDim : C.bg3,
                    border: `1px solid ${
                      done ? C.teal : active ? lth.accent : C.border2
                    }`,
                    color: done ? C.teal : active ? lth.accentText : C.textMuted,
                  }}
                >
                  {done ? (
                    <Ico d="M3 8l4 4 6-6" size={10} col={C.teal} />
                  ) : active ? (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        border: `1.5px solid ${lth.accent}`,
                        borderTopColor: 'transparent',
                        animation: 'spin .7s linear infinite',
                      }}
                    />
                  ) : (
                    ph.short
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontFamily: C.mono,
                    color: done ? C.green : active ? lth.accentText : C.textMuted,
                  }}
                >
                  {ph.label}
                </span>
              </div>
              {i < PHASES.length - 1 && (
                <div
                  style={{
                    width: 28,
                    height: 1,
                    background: done ? C.teal : C.border,
                    margin: '0 8px',
                    flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:8,
          fontSize: 11, fontFamily: C.mono, color: C.textMuted }}>
          <span>{`${Math.round(progress * 100)}%`}</span>
          {etaText && (
            <>
              <span style={{ color:C.border2 }}>·</span>
              <span>eta {etaText}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: 220,
            borderRight: `1px solid ${C.border}`,
            background: C.bg1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '10px 10px 6px',
              fontSize: 10.5,
              color: C.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              fontWeight: 500,
            }}
          >
            Detected layers
          </div>
          <div
            style={{
              padding: '0 8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {layers.length === 0 && (
              <div
                style={{
                  background: C.bg2,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 3,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `1.5px solid ${lth.accent}`,
                    borderTopColor: 'transparent',
                    animation: 'spin .7s linear infinite',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted }}>
                  scanning…
                </span>
              </div>
            )}
            {layers.map((lc) => {
              const done = lc.status === 'done';
              return (
                <div
                  key={lc.num}
                  style={{
                    background: C.bg2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 3,
                    padding: '9px 10px',
                    opacity: done ? 1 : 0.85,
                    borderLeft: `2px solid ${done ? C.teal : lth.accent}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.text,
                      }}
                    >
                      L{lc.num}{lc.total ? ` / ${lc.total}` : ''}
                    </span>
                    {done ? (
                      <span style={{ fontSize: 10, color: C.green, fontFamily: C.mono }}>done</span>
                    ) : (
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          border: `1.5px solid ${lth.accent}`,
                          borderTopColor: 'transparent',
                          animation: 'spin .7s linear infinite',
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: lc.name ? C.teal : C.textMuted,
                      fontFamily: C.mono,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {lc.name || 'pattern scan in progress…'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '5px 12px',
              background: C.bg2,
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>
              {job?.filename || 'sample'}
            </span>
            <span style={{ color: C.border2 }}>·</span>
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: C.mono }}>
              {codeText
                ? `${codeText.length.toLocaleString()} chars · ${codeText.split('\n').length} lines`
                : 'waiting for upload preview…'}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10.5,
                fontFamily: C.mono,
                color: lth.accentText,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                maxWidth: '55%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
              title={lastLine?.text || ''}
            >
              {lastLine ? (
                <>
                  <span style={{ color: C.textMuted }}>{lastLine.level}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastLine.text}</span>
                </>
              ) : 'awaiting first log line…'}
            </span>
          </div>

          {codeText ? (
            <CodeViewer lines={codeText.split('\n')} lang={lang} lt={lth} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#0a0a0a',
              fontFamily: C.mono, fontSize: 11.5, color: C.textMuted }}>
              Streaming engine output… your sample will appear here once parsed.
            </div>
          )}
        </div>
      </div>

      <LogStrip running lt={lth} entries={job?.logs} />
    </div>
  );
}

function estimateEta(startedAt, progress) {
  if (!startedAt || progress <= 0.05 || progress >= 0.98) return null;
  const elapsed = Date.now() - startedAt;
  if (elapsed < 3000) return null;
  const remaining = Math.max(0, elapsed * (1 - progress) / progress);
  const seconds = Math.round(remaining / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}
