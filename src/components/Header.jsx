import React from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';

export default function Header({ view, onNewAnalysis, onSettings, onHome, onLogout, user, lt, job }) {
  const lth = lt || getLangTheme(null);
  const initial = ((user?.name || user?.email || 'U')[0] || 'U').toUpperCase();
  const durationMs = job?.result?.stats?.duration_ms;
  const completeLabel = durationMs != null
    ? `analysis complete · ${(durationMs / 1000).toFixed(1)}s`
    : 'analysis complete';
  return (
    <div
      style={{
        height: 48,
        background: C.bg1,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 0,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 24 }}>
        <button
          onClick={onHome}
          title="Home"
          className="btn-hover"
          style={{ cursor: onHome ? 'pointer' : 'default', userSelect: 'none',
            background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span
            title="Unveil — universal deobfuscation tool"
            style={{
              fontFamily: C.mono,
              fontSize: 13.5,
              fontWeight: 600,
              color: lth.accentText,
              letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            Unveil
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
        {view === 'results' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              background: C.tealDim,
              border: `1px solid ${C.teal}44`,
              borderRadius: 3,
            }}
          >
            <Ico d="M3 8l4 4 6-6" size={11} col={C.teal} />
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.teal }}>
              {completeLabel}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <a className="btn-hover" href="/api/docs" target="_blank" rel="noreferrer"
          title="Open the backend OpenAPI/Swagger UI"
          style={{ background:'none', border:`1px solid transparent`, borderRadius:3,
            padding:'5px 11px', cursor:'pointer', fontSize:12, textDecoration:'none',
            color: C.textDim, letterSpacing:'0.01em' }}>Docs</a>
        <button onClick={onSettings} className="btn-hover"
          style={{ background: view==='settings' ? C.bg3 : 'none',
            border:`1px solid ${view==='settings' ? C.border2 : 'transparent'}`,
            borderRadius:3, padding:'5px 11px', cursor:'pointer', fontSize:12,
            color: view==='settings' ? C.text : C.textDim, letterSpacing:'0.01em' }}>
          {view==='settings' ? '← Done' : 'Settings'}
        </button>
        <div style={{ width: 1, height: 18, background: C.border, margin: '0 6px' }} />
        <button
          onClick={onNewAnalysis}
          className="btn-hover"
          style={{
            background: lth.accentDim,
            border: `1px solid ${lth.accent}`,
            borderRadius: 3,
            padding: '5px 13px',
            cursor: 'pointer',
            fontSize: 12,
            color: lth.accentText,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          New analysis
        </button>
        <button
          onClick={onLogout}
          title={user?.email ? `${user.email} — click to sign out` : 'Sign out'}
          className="btn-hover"
          style={{
            width: 28,
            height: 28,
            borderRadius: 3,
            background: C.bg3,
            border: `1px solid ${C.border2}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: lth.accentText,
            fontFamily: C.mono,
            cursor: 'pointer',
            marginLeft: 6,
            userSelect: 'none',
          }}
        >
          {initial}
        </button>
      </div>
    </div>
  );
}
