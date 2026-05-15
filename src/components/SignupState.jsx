import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import * as api from '../api.js';

export default function SignupState({ onSwitch, onAuthed }) {
  const lth = getLangTheme(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const strength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : 3;
  const strengthCol = [C.border2, C.red, C.orange, C.teal][strength];
  const strengthTxt = ['—','weak','fair','strong'][strength];

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    if (!email.trim() || pw.length < 6) {
      setErr('Email required, password must be at least 6 characters');
      return;
    }
    if (!accept) {
      setErr('Please accept the terms first');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await api.signup({
        email: email.trim().toLowerCase(),
        password: pw,
        name: name.trim(),
      });
      onAuthed?.(data.user);
    } catch (ex) {
      setErr(ex.message || String(ex));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}
      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px', overflowY:'auto',
      background:`radial-gradient(ellipse at top, ${lth.accentDim} 0%, transparent 60%)` }}>
      <div style={{ width:380, background: C.bg1, border:`1px solid ${C.border}`,
        borderRadius:4, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px 10px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:C.mono, fontSize:13, fontWeight:600,
              color: lth.accentText, letterSpacing:'-0.03em' }}>Unveil</span>
            <span style={{ marginLeft:'auto', fontSize:11, color: C.textMuted, fontFamily:C.mono }}>sign up</span>
          </div>
          <div style={{ marginTop:3, fontFamily:C.mono, fontSize:10.5,
            color: C.textMuted, letterSpacing:'0.01em' }}>
            universal deobfuscation tool
          </div>
        </div>

        <div style={{ padding:'22px' }}>
          <div style={{ fontSize:16, fontWeight:500, color: C.text, marginBottom:4, letterSpacing:'-0.02em' }}>
            Create account
          </div>
          <div style={{ fontSize:11.5, color: C.textMuted, marginBottom:16 }}>
            Sync sessions, IOC history and engine settings across devices.
          </div>

          {[
            { label:'Full name', val:name,  set:setName,  type:'text',  auto:'name' },
            { label:'Email',     val:email, set:setEmail, type:'email', auto:'email' },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:10 }}>
              <div style={{ fontSize:10.5, color: C.textMuted, fontFamily:C.mono,
                textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{f.label}</div>
              <input value={f.val} onChange={e=>f.set(e.target.value)} type={f.type}
                autoComplete={f.auto} disabled={busy}
                style={{ width:'100%', background: C.bg2, border:`1px solid ${C.border2}`,
                  padding:'7px 10px', fontSize:12, color: C.text, outline:'none', borderRadius:3 }} />
            </div>
          ))}

          <div style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              marginBottom:4, alignItems:'baseline' }}>
              <span style={{ fontSize:10.5, color: C.textMuted, fontFamily:C.mono,
                textTransform:'uppercase', letterSpacing:'.08em' }}>Password</span>
              <span style={{ fontSize:10, color: strengthCol, fontFamily:C.mono }}>{strengthTxt}</span>
            </div>
            <input value={pw} onChange={e=>setPw(e.target.value)} type="password"
              autoComplete="new-password" disabled={busy}
              style={{ width:'100%', background: C.bg2, border:`1px solid ${C.border2}`,
                padding:'7px 10px', fontSize:12, color: C.text, outline:'none',
                borderRadius:3, fontFamily: C.mono }} />
            <div style={{ display:'flex', gap:3, marginTop:5 }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ flex:1, height:3, borderRadius:1,
                  background: strength > i ? strengthCol : C.bg3 }} />
              ))}
            </div>
          </div>

          <button type="button" role="checkbox" aria-checked={accept}
            onClick={()=>setAccept(!accept)} style={{ cursor:'pointer',
            display:'flex', alignItems:'flex-start', gap:7, marginTop:12, marginBottom:14,
            background:'none', border:'none', padding:0, textAlign:'left' }}>
            <div style={{ width:13, height:13, borderRadius:2, flexShrink:0, marginTop:2,
              background: accept ? lth.accent : C.bg3,
              border:`1.5px solid ${accept ? lth.accent : C.border2}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {accept && <Ico d="M3 8l3.5 3.5 6.5-6" size={9} col="#fff" />}
            </div>
            <span style={{ fontSize:11, color: C.textDim, lineHeight:1.55 }}>
              I agree to the Terms and acknowledge that
              uploaded samples may contain malicious code analysed in a sandbox.
            </span>
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
            {busy ? 'Creating…' : 'Create account →'}
          </button>

          <div style={{ marginTop:12, fontSize:11.5, color: C.textMuted, textAlign:'center' }}>
            Already have an account?{' '}
            <a href="#" onClick={e=>{e.preventDefault();onSwitch && onSwitch('login');}}
              style={{ color: lth.accentText, textDecoration:'underline',
                textUnderlineOffset:3, textDecorationColor: lth.accentDim }}>Sign in</a>
          </div>
        </div>

        <div style={{ padding:'8px 18px', borderTop:`1px solid ${C.border}`,
          background: C.bg, display:'flex', alignItems:'center', gap:8,
          fontSize:10.5, fontFamily:C.mono, color: C.textMuted }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#4caf6e' }} />
          <span>End-to-end · samples never leave your machine</span>
        </div>
      </div>
    </form>
  );
}
