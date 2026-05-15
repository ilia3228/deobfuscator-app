import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import * as api from '../api.js';

export default function LoginState({ onSwitch, onAuthed }) {
  const lth = getLangTheme(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    if (!email.trim() || !pw) {
      setErr('Enter email and password');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await api.login({ email: email.trim().toLowerCase(), password: pw });
      onAuthed?.(data.user);
    } catch (ex) {
      setErr(ex.message || String(ex));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}
      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
      padding:'40px 24px',
      background:`radial-gradient(ellipse at top, ${lth.accentDim} 0%, transparent 60%)` }}>
      <div style={{ width:380, background: C.bg1, border:`1px solid ${C.border}`,
        borderRadius:4, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px 10px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:C.mono, fontSize:13, fontWeight:600,
              color: lth.accentText, letterSpacing:'-0.03em' }}>Unveil</span>
            <span style={{ marginLeft:'auto', fontSize:11, color: C.textMuted, fontFamily:C.mono }}>sign in</span>
          </div>
          <div style={{ marginTop:3, fontFamily:C.mono, fontSize:10.5,
            color: C.textMuted, letterSpacing:'0.01em' }}>
            universal deobfuscation tool
          </div>
        </div>

        <div style={{ padding:'22px 22px 18px' }}>
          <div style={{ fontSize:16, fontWeight:500, color: C.text, marginBottom:4, letterSpacing:'-0.02em' }}>
            Welcome back
          </div>
          <div style={{ fontSize:11.5, color: C.textMuted, marginBottom:18 }}>
            Sign in to sync sessions across devices.
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:6, opacity: 0.4 }}>
              {['GitHub','Google','SSO'].map(p=>(
                <button type="button" key={p} disabled title="Not available yet"
                  style={{ flex:1, padding:'7px 0',
                  background: C.bg3, border:`1px solid ${C.border2}`, borderRadius:3,
                  fontSize:11.5, color: C.textDim, cursor:'not-allowed' }}>{p}</button>
              ))}
            </div>
            <div style={{ fontSize:10, color: C.textMuted, textAlign:'center',
              marginTop:5, fontFamily: C.mono }}>OAuth coming soon</div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0 14px' }}>
            <div style={{ flex:1, height:1, background: C.border }} />
            <span style={{ fontSize:10, color: C.textMuted, fontFamily:C.mono,
              textTransform:'uppercase', letterSpacing:'.1em' }}>or</span>
            <div style={{ flex:1, height:1, background: C.border }} />
          </div>

          {[
            { label:'Email', val:email, set:setEmail, mono:false, type:'email', auto:'username' },
            { label:'Password', val:pw, set:setPw, mono:true, type:'password', auto:'current-password' },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                marginBottom:4, alignItems:'baseline' }}>
                <span style={{ fontSize:10.5, color: C.textMuted, fontFamily:C.mono,
                  textTransform:'uppercase', letterSpacing:'.08em' }}>{f.label}</span>
                {f.right}
              </div>
              <input value={f.val} onChange={e=>f.set(e.target.value)} type={f.type}
                autoComplete={f.auto} disabled={busy}
                style={{ width:'100%', background: C.bg2, border:`1px solid ${C.border2}`,
                  padding:'7px 10px', fontSize:12, color: C.text, outline:'none',
                  borderRadius:3, fontFamily: f.mono ? C.mono : 'Geist, sans-serif' }} />
            </div>
          ))}

          <button type="button" role="checkbox" aria-checked={remember}
            onClick={()=>setRemember(!remember)} style={{ cursor:'pointer',
            display:'flex', alignItems:'center', gap:7, marginTop:12, marginBottom:14,
            background:'none', border:'none', padding:0 }}>
            <div style={{ width:13, height:13, borderRadius:2, flexShrink:0,
              background: remember ? lth.accent : C.bg3,
              border:`1.5px solid ${remember ? lth.accent : C.border2}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {remember && <Ico d="M3 8l3.5 3.5 6.5-6" size={9} col="#fff" />}
            </div>
            <span style={{ fontSize:11.5, color: C.textDim }}>Remember this device</span>
          </button>

          {err && (
            <div style={{ marginBottom: 10, padding:'6px 10px', fontSize:11,
              fontFamily: C.mono, color: C.red, background: C.redDim,
              border: `1px solid ${C.red}55`, borderRadius: 2 }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'9px 0',
            background: lth.accentDim, border:`1px solid ${lth.accent}`,
            borderRadius:3, fontSize:13, fontWeight:500, color: lth.accentText,
            cursor: busy ? 'not-allowed' : 'pointer', letterSpacing:'0.01em',
            opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Signing in…' : 'Sign in →'}
          </button>

          <div style={{ marginTop:14, fontSize:11.5, color: C.textMuted, textAlign:'center' }}>
            No account?{' '}
            <a href="#" onClick={e=>{e.preventDefault();onSwitch && onSwitch('signup');}}
              style={{ color: lth.accentText, textDecoration:'underline',
                textUnderlineOffset:3, textDecorationColor: lth.accentDim }}>Create one</a>
          </div>
        </div>
      </div>
    </form>
  );
}
