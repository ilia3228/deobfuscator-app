import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';

export default function CommandPalette({ lt, onClose, onAction, sessions = [] }) {
  const lth = lt || getLangTheme(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const sessionItems = sessions.slice(0, 8).map((s) => ({
    id:    `session-${s.id}`,
    group: 'Sessions',
    label: s.name,
    hint:  `${s.time || ''}${s.time && s.size ? ' · ' : ''}${s.size || ''}`.trim() || undefined,
    icon:  (s.lang === 'py' || (s.name || '').endsWith('.py')) ? 'py' : 'js',
  }));

  const items = [
    { id:'new',            group:'Action',   label:'New analysis',          kbd:['⌘','N'], icon:'+' },
    { id:'view-empty',     group:'Go to',    label:'Upload',                kbd:['G','U'], icon:'→' },
    { id:'view-analyzing', group:'Go to',    label:'Analyzing',             kbd:['G','A'], icon:'→' },
    { id:'view-results',   group:'Go to',    label:'Results',               kbd:['G','R'], icon:'→' },
    { id:'view-settings',  group:'Go to',    label:'Settings',              kbd:['G','S'], icon:'→' },
    { id:'view-error',     group:'Go to',    label:'Error state',           kbd:['G','E'], icon:'→' },
    { id:'ioc',            group:'Panel',    label:'Toggle IOC panel',      kbd:['⌘','I'], icon:'☰' },
    { id:'sidebar',        group:'Panel',    label:'Toggle sidebar',        kbd:['⌘','B'], icon:'☰' },
    ...sessionItems,
    { id:'logout',         group:'Account',  label:'Sign out',                              icon:'×' },
  ];

  const filtered = q
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) ||
                       i.group.toLowerCase().includes(q.toLowerCase()))
    : items;

  const grouped = filtered.reduce((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it);
    return acc;
  }, {});

  const flatList = Object.entries(grouped).flatMap(([g,arr])=>arr);

  function handleKey(e) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s=>Math.min(s+1, flatList.length-1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s=>Math.max(s-1, 0)); }
    else if (e.key === 'Enter')     { onAction && onAction(flatList[sel]); }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,.6)', display:'flex', alignItems:'flex-start',
      justifyContent:'center', paddingTop:'12vh', backdropFilter:'blur(2px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:560, maxHeight:'70vh',
        background: C.bg1, border:`1px solid ${C.border2}`, borderRadius:5,
        boxShadow:'0 20px 60px rgba(0,0,0,.5)',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10,
          padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontFamily:C.mono, fontSize:13, color: lth.accentText }}>›</span>
          <input autoFocus value={q} onChange={e=>{setQ(e.target.value);setSel(0);}}
            onKeyDown={handleKey}
            placeholder="Type a command, file, or jump to…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none',
              color: C.text, fontSize:13 }} />
          <kbd style={{ fontFamily:C.mono, fontSize:10, padding:'2px 6px',
            background: C.bg3, border:`1px solid ${C.border2}`, borderRadius:2,
            color: C.textMuted }}>ESC</kbd>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
          {Object.entries(grouped).map(([group, arr])=>(
            <div key={group}>
              <div style={{ padding:'8px 14px 3px', fontSize:9.5,
                fontFamily:C.mono, color: C.textMuted,
                textTransform:'uppercase', letterSpacing:'.12em' }}>{group}</div>
              {arr.map(it => {
                const idx = flatList.indexOf(it);
                const isSel = idx === sel;
                return (
                  <div key={it.id} onMouseEnter={()=>setSel(idx)}
                    onClick={()=>onAction && onAction(it)}
                    style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'6px 14px', cursor:'pointer',
                      background: isSel ? lth.accentDim : 'transparent',
                      borderLeft: isSel ? `2px solid ${lth.accent}` : '2px solid transparent' }}>
                    <div style={{ width:20, height:20, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:C.mono, fontSize:10, color: isSel ? lth.accentText : C.textMuted,
                      background: isSel ? C.bg2 : C.bg3,
                      border:`1px solid ${isSel ? lth.accent+'55' : C.border}`,
                      borderRadius:2 }}>{it.icon}</div>
                    <span style={{ flex:1, fontSize:12.5,
                      color: isSel ? C.text : C.textDim }}>{it.label}</span>
                    {it.hint && (
                      <span style={{ fontSize:10.5, fontFamily:C.mono, color: C.textMuted }}>
                        {it.hint}
                      </span>
                    )}
                    {it.kbd && (
                      <div style={{ display:'flex', gap:3 }}>
                        {it.kbd.map((k,i)=>(
                          <kbd key={i} style={{ fontFamily:C.mono, fontSize:10,
                            padding:'1px 6px', background: C.bg3,
                            border:`1px solid ${C.border2}`, borderRadius:2,
                            color: C.textMuted, minWidth:18, textAlign:'center' }}>{k}</kbd>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {flatList.length === 0 && (
            <div style={{ padding:'24px 14px', textAlign:'center', fontSize:12,
              color: C.textMuted }}>No matches for "{q}"</div>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12,
          padding:'6px 14px', borderTop:`1px solid ${C.border}`,
          background: C.bg, fontSize:10, fontFamily:C.mono, color: C.textMuted }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <kbd style={{ padding:'1px 5px', background: C.bg3,
              border:`1px solid ${C.border2}`, borderRadius:2 }}>↑↓</kbd>navigate
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <kbd style={{ padding:'1px 5px', background: C.bg3,
              border:`1px solid ${C.border2}`, borderRadius:2 }}>↵</kbd>select
          </span>
          <span style={{ marginLeft:'auto' }}>{flatList.length} results</span>
        </div>
      </div>
    </div>
  );
}
