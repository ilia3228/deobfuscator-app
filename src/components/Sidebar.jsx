import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import { useResizable, ResizeHandle } from './Resizable.jsx';

export default function Sidebar({
  collapsed,
  onToggle,
  activeSession,
  setActiveSession,
  onNewAnalysis,
  onLogout,
  onDeleteSession,
  user,
  sessions = [],
  lang,
  lt,
}) {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null); // session row currently awaiting confirmation
  const {
    size: expandedW,
    startDrag: startSidebarDrag,
    dragging: sidebarDragging,
  } = useResizable({
    initial: 210, min: 160, max: 480,
    axis: 'x', edge: 'right',
    storageKey: 'jsdeobf.layout.sidebar',
  });
  const w = collapsed ? 44 : expandedW;
  const filtered = sessions.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const lth = lt || getLangTheme(lang);
  const accentBar = lth.accent;

  return (
    <div
      style={{
        width: w,
        minWidth: w,
        height: '100%',
        background: C.bg1,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        // Smooth width animation only when toggling collapsed; suppress
        // it during a live drag so the panel tracks the cursor 1:1.
        transition: sidebarDragging ? 'none' : 'width .15s ease',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        // Drives the resize-handle accent (var --resize-accent in styles.css)
        // so the drag strip lights up in the current language colour.
        '--resize-accent': lth.accent,
      }}
    >
      <div
        style={{
          height: 34,
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          paddingLeft: collapsed ? 10 : 12,
        }}
      >
        {!collapsed && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: '#505050',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              flex: 1,
            }}
          >
            Sessions
          </span>
        )}
        <button
          onClick={onToggle}
          className="btn-hover"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.textMuted,
            padding: '4px 8px',
            lineHeight: 0,
            marginLeft: collapsed ? 2 : 0,
          }}
        >
          <Ico d={collapsed ? 'M5 3l6 5-6 5' : 'M11 3L5 8l6 5'} col={C.textMuted} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ padding: '8px 8px 6px' }}>
            <button
              onClick={onNewAnalysis}
              className="btn-hover"
              style={{
                width: '100%',
                padding: '5px 9px',
                background: 'transparent',
                border: `1px solid ${C.border2}`,
                cursor: 'pointer',
                fontSize: 11.5,
                color: C.textDim,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                borderRadius: 3,
                marginBottom: 6,
              }}
            >
              + New analysis
            </button>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="filter…"
                style={{
                  width: '100%',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  padding: '4px 8px 4px 24px',
                  fontSize: 11.5,
                  color: C.text,
                  outline: 'none',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{
                padding: '12px 14px', fontSize: 11, color: C.textMuted,
                fontFamily: C.mono, lineHeight: 1.6,
              }}>
                No sessions yet. Drop a sample to start.
              </div>
            )}
            {filtered.map((s) => {
              const isPy = (s.lang || '').toLowerCase() === 'py' || (s.name || '').endsWith('.py');
              const isAct = activeSession === s.id;
              const running = s.status === 'running' || s.status === 'queued';
              const activate = () => { setConfirmId(null); setActiveSession(s.id); };
              return (
                // role="button" instead of <button> so the delete-confirm
                // controls (real <button>s) can live inside without
                // violating the HTML rule that <button> can't be nested.
                <div
                  key={s.id}
                  className="session-row"
                  role="button"
                  tabIndex={0}
                  onClick={activate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      activate();
                    }
                  }}
                  style={{
                    padding: '5px 11px 5px 9px',
                    cursor: 'pointer',
                    background: isAct ? lth.accentDim : 'transparent',
                    borderLeft: `2px solid ${isAct ? accentBar : 'transparent'}`,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '0 3px',
                        borderRadius: 2,
                        flexShrink: 0,
                        fontFamily: C.mono,
                        fontWeight: 600,
                        lineHeight: '14px',
                        background: isPy ? '#0e1e30' : '#1f1208',
                        color: isPy ? '#5b9fd4' : '#dc8a3f',
                        border: `1px solid ${isPy ? '#5b9fd444' : '#dc8a3f44'}`,
                      }}
                    >
                      {isPy ? 'py' : 'js'}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: isAct ? '#e8e8e8' : '#888888',
                        fontFamily: C.mono,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: isAct ? 500 : 400,
                      }}
                    >
                      {s.name}
                    </span>
                    {running && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: lth.accent, flexShrink: 0,
                        animation: 'pulse 1.2s ease-in-out infinite',
                      }} />
                    )}
                    {onDeleteSession && (
                      <div
                        className={`session-actions${confirmId === s.id ? ' confirming' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {confirmId === s.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmId(null);
                                onDeleteSession(s.id);
                              }}
                              title="Confirm delete"
                              style={{
                                background: 'transparent',
                                border: `1px solid ${C.red}55`,
                                color: C.red,
                                cursor: 'pointer',
                                padding: '0 5px',
                                fontSize: 9.5,
                                fontFamily: C.mono,
                                lineHeight: '14px',
                                borderRadius: 2,
                                textTransform: 'uppercase',
                                letterSpacing: '.06em',
                              }}
                            >
                              del
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmId(null); }}
                              title="Cancel"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: C.textMuted,
                                cursor: 'pointer',
                                padding: '0 4px',
                                fontSize: 12,
                                lineHeight: '14px',
                              }}
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(s.id); }}
                            title="Delete session"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: C.textMuted,
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: 13,
                              lineHeight: '14px',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      fontSize: 10,
                      color: '#5a5a5a',
                      paddingLeft: 0,
                      fontFamily: C.mono,
                      marginTop: 1,
                    }}
                  >
                    <span>{s.time}</span>
                    <span style={{ color: '#3a3a3a' }}>·</span>
                    <span>{s.size}</span>
                    <span style={{ color: '#3a3a3a' }}>·</span>
                    <span>{s.layers || 0}L</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: '7px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 2,
                background: C.bg4,
                border: `1px solid ${C.border2}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: lth.accentText,
                fontFamily: C.mono,
                textTransform: 'uppercase',
              }}
            >
              {((user?.name || user?.email || '?')[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11.5,
                  color: '#cccccc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={user?.email}
              >
                {user?.name || user?.email || 'guest'}
              </div>
              <div
                title="Unveil — universal deobfuscation tool"
                style={{ fontSize: 10.5, color: C.textMuted }}
              >Unveil</div>
            </div>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="btn-hover"
              title="Account menu"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted, padding: '4px 6px', lineHeight: 0,
              }}
            >
              <Ico d="M3 6l5 5 5-5" col={C.textMuted} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', right: 8,
                background: C.bg2, border: `1px solid ${C.border2}`,
                borderRadius: 3, minWidth: 140, zIndex: 10, padding: '4px 0',
                boxShadow: '0 4px 18px rgba(0,0,0,0.6)',
              }}>
                <button
                  className="menu-item"
                  onClick={() => { setMenuOpen(false); onLogout?.(); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11.5, color: C.text, fontFamily: 'Geist, sans-serif',
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ResizeHandle
        edge="right"
        onPointerDown={startSidebarDrag}
        dragging={sidebarDragging}
        hidden={collapsed}
        label="Resize sidebar"
      />

      {collapsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 8,
            gap: 8,
          }}
        >
          <button
            onClick={onNewAnalysis}
            title="New analysis"
            style={{
              background: C.bg3,
              border: `1px solid ${C.border2}`,
              borderRadius: 3,
              width: 28,
              height: 28,
              cursor: 'pointer',
              lineHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ico d="M8 3v10M3 8h10" col={lth.accentText} />
          </button>
          {sessions.slice(0, 5).map((s) => (
            <button
              key={s.id}
              title={s.name}
              onClick={() => setActiveSession(s.id)}
              style={{
                fontSize: 9,
                fontFamily: C.mono,
                color: (s.lang === 'py' || (s.name || '').endsWith('.py')) ? '#5b9fd4' : '#dc8a3f',
                lineHeight: '14px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {(s.lang === 'py' || (s.name || '').endsWith('.py')) ? 'py' : 'js'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
