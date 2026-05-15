import React, { useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { ANALYSIS_OPTION_DEFAULTS } from '../analysisOptions.js';

export default function SettingsState({
  lt,
  user,
  sessionCount = 0,
  onLogout,
  options = ANALYSIS_OPTION_DEFAULTS,
  onOptionChange,
}) {
  const lth = lt || getLangTheme(null);
  const [section, setSection] = useState('account');
  const [tele, setTele] = useState(false);
  const initial = ((user?.name || user?.email || 'U')[0] || 'U').toUpperCase();
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'guest');
  const dynamicEval = options.dynamicEval !== false;
  const autoIoc = options.autoIoc !== false;
  const llmRename = !!options.llmRename;

  const sections = [
    { id:'account',      label:'Account'       },
    { id:'engine',       label:'Engine'        },
    { id:'llm',          label:'LLM provider'  },
    { id:'integrations', label:'Integrations'  },
    { id:'appearance',   label:'Appearance'    },
    { id:'shortcuts',    label:'Keyboard'      },
    { id:'data',         label:'Data & privacy'},
  ];

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      <div style={{ width:200, borderRight:`1px solid ${C.border}`, background: C.bg1,
        flexShrink:0, padding:'14px 0', overflowY:'auto' }}>
        <div style={{ padding:'0 14px 10px', fontSize:10.5, color: C.textMuted,
          textTransform:'uppercase', letterSpacing:'.1em', fontWeight:500 }}>Settings</div>
        {sections.map(s=>{
          const sel = section === s.id;
          return (
            <button key={s.id} onClick={()=>setSection(s.id)} className="btn-hover"
              style={{ padding:'6px 14px', cursor:'pointer', fontSize:12,
                color: sel ? C.text : C.textDim,
                background: sel ? C.bg3 : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${sel ? lth.accent : 'transparent'}`,
                width: '100%', textAlign: 'left', display: 'block' }}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
        {section === 'account' && (
          <Block title="Account" subtitle="Your current signed-in identity.">
            <Row label="Avatar">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:42, height:42, borderRadius:3, background: C.bg3,
                  border:`1px solid ${C.border2}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:16, fontWeight:700,
                  color: lth.accentText, fontFamily: C.mono }}>{initial}</div>
                <span style={{ fontSize:11, color: C.textMuted, fontFamily: C.mono }}>
                  Derived from your display name.
                </span>
              </div>
            </Row>
            <Row label="Display name">
              <Input val={displayName} readOnly />
            </Row>
            <Row label="Email">
              <Input val={user?.email || '—'} readOnly mono />
            </Row>
            <Row label="User ID">
              <Input val={user?.id != null ? String(user.id) : '—'} readOnly mono w={120} />
            </Row>
            <Row label="Sessions analysed" hint="Stored in the backend SQLite for this account.">
              <span style={{ fontSize:12, fontFamily: C.mono, color: C.text }}>
                {sessionCount}
              </span>
            </Row>
            <Row label="Sign out" hint="Revokes your current bearer token.">
              <button onClick={onLogout} className="btn-hover"
                style={{ ...inputBtn(), color: C.red, borderColor:'#3a2020' }}>
                Sign out
              </button>
            </Row>
          </Block>
        )}

        {section === 'engine' && (
          <Block title="Engine" subtitle="Static and dynamic analysis defaults.">
            <Row label="Workers" hint="Concurrent layer-decoding workers.">
              <Input val="4" mono w={70} disabled />
            </Row>
            <Row label="Max layers" hint="Stop after N consecutive no-op passes.">
              <Input val="6" mono w={70} disabled />
            </Row>
            <Row label="Dynamic eval"
              hint="Hook eval/Function in a sandboxed VM. Slower but resolves runtime decoders.">
              <Toggle
                val={dynamicEval}
                onChange={() => onOptionChange?.('dynamicEval', !dynamicEval)}
                lth={lth}
              />
            </Row>
            <Row label="Anti-debug bypass"
              hint="Neutralise debugger traps and self-defending IIFEs.">
              <Toggle val={true} lth={lth} disabled />
            </Row>
            <Row label="Auto-extract IOCs" hint="Run IOC extractor on completion.">
              <Toggle
                val={autoIoc}
                onChange={() => onOptionChange?.('autoIoc', !autoIoc)}
                lth={lth}
              />
            </Row>
            <Row label="Sandbox timeout" hint="Per-layer kill switch (seconds).">
              <Input val="30" mono w={70} disabled />
            </Row>
          </Block>
        )}

        {section === 'llm' && (
          <Block title="LLM provider" subtitle="Used for variable renaming and code formatting.">
            <ReadOnlyBanner text="Provider details are configured on the backend; rename default is saved locally." />
            <Row label="LLM rename" hint="GPT-4o variable renaming on the deobfuscated output.">
              <Toggle
                val={llmRename}
                onChange={() => onOptionChange?.('llmRename', !llmRename)}
                lth={lth}
              />
            </Row>
            <Row label="Provider">
              <div style={{ display:'flex', gap:6 }}>
                {[
                  { id:'openai',    label:'OpenAI'    },
                  { id:'anthropic', label:'Anthropic' },
                  { id:'local',     label:'Local (Ollama)' },
                  { id:'off',       label:'Disabled'  },
                ].map(o=>(
                  <button key={o.id} disabled className="btn-hover"
                    style={{ padding:'5px 11px', fontSize:11.5, borderRadius:3,
                      background: o.id==='openai' ? lth.accentDim : C.bg3,
                      border:`1px solid ${o.id==='openai' ? lth.accent : C.border2}`,
                      color: o.id==='openai' ? lth.accentText : C.textDim,
                      cursor:'not-allowed', opacity: 0.7 }}>{o.label}</button>
                ))}
              </div>
            </Row>
            <Row label="Model">
              <select disabled
                style={{ background: C.bg2, border:`1px solid ${C.border2}`,
                  padding:'6px 10px', fontSize:12, color: C.textDim, outline:'none',
                  borderRadius:3, fontFamily: C.mono, minWidth:200, opacity: 0.7 }}>
                <option>gpt-4o</option>
              </select>
            </Row>
            <Row label="API key" hint="Configured on the server via llm_config.toml.">
              <div style={{ display:'flex', gap:6, alignItems:'center', width:'100%' }}>
                <input value="(not configured)"
                  readOnly disabled
                  style={{ flex:1, background: C.bg2, border:`1px solid ${C.border2}`,
                    padding:'6px 10px', fontSize:11.5, color: C.textMuted, outline:'none',
                    borderRadius:3, fontFamily: C.mono, opacity: 0.7 }} />
              </div>
            </Row>
            <Row label="Temperature" hint="0 = deterministic renames, 1 = creative.">
              <Input val="0.2" mono w={70} disabled />
            </Row>
            <Row label="Max tokens / pass"><Input val="4096" mono w={90} disabled /></Row>
          </Block>
        )}

        {section === 'integrations' && (
          <Block title="Integrations">
            <ReadOnlyBanner />
            {[
              { name:'VirusTotal', desc:'Submit IOC hashes for reputation lookup.', on:false },
              { name:'URLhaus',    desc:'Cross-check URLs against abuse.ch feed.',  on:true },
              { name:'MISP',       desc:'Push IOCs to MISP instance on completion.', on:false },
              { name:'CyberChef',  desc:'Open layers in CyberChef recipes.',       on:true },
              { name:'Slack',      desc:'Notify channel on high-severity IOCs.',   on:false },
            ].map(i=>(
              <div key={i.name} style={{ display:'flex', alignItems:'center', gap:14,
                padding:'12px 0', borderBottom:`1px solid ${C.border}`, opacity: 0.7 }}>
                <div style={{ width:32, height:32, borderRadius:3, background: C.bg3,
                  border:`1px solid ${C.border2}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontFamily:C.mono, fontSize:11,
                  color: lth.accentText, flexShrink:0 }}>{i.name.slice(0,2)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12.5, color: C.text, marginBottom:2 }}>{i.name}</div>
                  <div style={{ fontSize:11, color: C.textMuted }}>{i.desc}</div>
                </div>
                <button disabled className="btn-hover" style={{ ...inputBtn(), cursor:'not-allowed' }}>
                  {i.on ? 'Configure' : 'Connect'}
                </button>
                <Toggle val={i.on} lth={lth} disabled />
              </div>
            ))}
          </Block>
        )}

        {section === 'appearance' && (
          <Block title="Appearance">
            <ReadOnlyBanner text="Preview only — settings are not persisted across reloads." />
            <Row label="Theme">
              <div style={{ display:'flex', gap:6 }}>
                {['terminal','midnight','paper'].map(t=>(
                  <button key={t} disabled className="btn-hover"
                    style={{ padding:'5px 12px', fontSize:11.5, borderRadius:3,
                      background: t==='terminal' ? lth.accentDim : C.bg3,
                      border:`1px solid ${t==='terminal' ? lth.accent : C.border2}`,
                      color: t==='terminal' ? lth.accentText : C.textDim,
                      cursor:'not-allowed', fontFamily:C.mono, opacity: 0.7 }}>{t}</button>
                ))}
              </div>
            </Row>
            <Row label="Accent">
              <div style={{ display:'flex', gap:6 }}>
                {['#9d6ef0','#5b9fd4','#c9a742','#4ec9b0','#d966a8'].map(c=>(
                  <button key={c} disabled style={{ width:24, height:24, borderRadius:3,
                    background: c, border:`2px solid ${c===lth.accent ? '#fff' : 'transparent'}`,
                    cursor:'not-allowed', opacity: 0.7 }} />
                ))}
              </div>
            </Row>
            <Row label="Editor font">
              <select disabled style={{ background: C.bg2, border:`1px solid ${C.border2}`,
                padding:'6px 10px', fontSize:12, color: C.textDim, outline:'none',
                borderRadius:3, fontFamily: C.mono, minWidth:200, opacity: 0.7 }}>
                <option>Geist Mono</option>
              </select>
            </Row>
            <Row label="Font size"><Input val="12" mono w={60} disabled /></Row>
            <Row label="Line numbers"><Toggle val={true} lth={lth} disabled /></Row>
            <Row label="IOC line highlight"><Toggle val={true} lth={lth} disabled /></Row>
            <Row label="Reduce motion"><Toggle val={false} lth={lth} disabled /></Row>
          </Block>
        )}

        {section === 'shortcuts' && (
          <Block title="Keyboard shortcuts" subtitle="Currently active shortcuts.">
            {[
              ['New analysis',['⌘','N']],
              ['Toggle sidebar',['⌘','B']],
              ['Toggle IOC panel',['⌘','I']],
              ['Command palette',['⌘','K']],
            ].map(([label, keys])=>(
              <div key={label} style={{ display:'flex', alignItems:'center',
                padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ flex:1, fontSize:12, color: C.textDim }}>{label}</span>
                <div style={{ display:'flex', gap:3 }}>
                  {keys.map((k,i)=>(
                    <kbd key={i} style={{ fontFamily:C.mono, fontSize:10.5,
                      padding:'2px 6px', background: C.bg3,
                      border:`1px solid ${C.border2}`, borderRadius:2,
                      color: C.text, minWidth:22, textAlign:'center' }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </Block>
        )}

        {section === 'data' && (
          <Block title="Data & privacy">
            <Row label="Telemetry"
              hint="Anonymous usage metrics. Never includes sample contents.">
              <Toggle val={tele} onChange={()=>setTele(!tele)} lth={lth} />
            </Row>
            <Row label="Crash reports"><Toggle val={true} lth={lth} /></Row>
            <Row label="Sample retention" hint="How long to keep analysed samples locally.">
              <select style={{ background: C.bg2, border:`1px solid ${C.border2}`,
                padding:'6px 10px', fontSize:12, color: C.text, outline:'none',
                borderRadius:3 }}>
                <option>Forever</option>
                <option>30 days</option>
                <option>7 days</option>
                <option>Until app closes</option>
              </select>
            </Row>
            <Row label="Stored sessions" hint="Analyses kept in the backend SQLite for this account.">
              <span style={{ fontSize:11.5, fontFamily:C.mono, color: C.textDim }}>
                {sessionCount} session{sessionCount === 1 ? '' : 's'}
              </span>
            </Row>
          </Block>
        )}
      </div>
    </div>
  );
}

function ReadOnlyBanner({ text }) {
  return (
    <div style={{ padding:'8px 12px', background:'rgba(201,167,66,.06)',
      border:'1px solid rgba(201,167,66,.2)', borderRadius:3,
      fontSize:11, color:'#c9a742', marginBottom:14, fontFamily: C.mono }}>
      ⚠ {text || 'Read-only preview — not connected to backend yet.'}
    </div>
  );
}

function Block({ title, subtitle, children }) {
  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ fontSize:18, fontWeight:500, color: C.text, marginBottom:2,
        letterSpacing:'-0.02em' }}>{title}</div>
      {subtitle && <div style={{ fontSize:12, color: C.textMuted, marginBottom:18 }}>{subtitle}</div>}
      {!subtitle && <div style={{ marginBottom:14 }} />}
      {children}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:20,
      padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:160, flexShrink:0, paddingTop:5 }}>
        <div style={{ fontSize:12, color: C.text }}>{label}</div>
        {hint && <div style={{ fontSize:10.5, color: C.textMuted, marginTop:2, lineHeight:1.5 }}>{hint}</div>}
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', minHeight:28 }}>
        {children}
      </div>
    </div>
  );
}

function Input({ val, mono, w, readOnly, disabled }) {
  const isRO = readOnly || disabled;
  const props = isRO ? { value: val, readOnly: true } : { defaultValue: val };
  return <input {...props} disabled={disabled}
    style={{ width: w || '100%', maxWidth: w ? w : 320,
      background: C.bg2, border:`1px solid ${C.border2}`,
      padding:'6px 10px', fontSize:12,
      color: isRO ? C.textDim : C.text, outline:'none',
      borderRadius:3, fontFamily: mono ? C.mono : 'Geist, sans-serif',
      opacity: disabled ? 0.7 : 1 }} />;
}

function Toggle({ val, onChange, lth, disabled }) {
  const [v,setV] = useState(val);
  const cur = onChange ? val : v;
  const h = () => { if (disabled) return; if (onChange) onChange(); else setV(!v); };
  return (
    <button onClick={h} disabled={disabled} style={{ width:32, height:18, borderRadius:9,
      background: cur ? lth.accent : C.bg3,
      border:`1px solid ${cur ? lth.accent : C.border2}`,
      position:'relative', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink:0,
      opacity: disabled ? 0.7 : 1 }}>
      <span style={{ position:'absolute', top:1, left: cur ? 15 : 1,
        width:13, height:13, borderRadius:'50%',
        background: cur ? '#fff' : '#666', transition:'left .12s' }} />
    </button>
  );
}

function inputBtn() {
  return { padding:'5px 11px', fontSize:11.5, borderRadius:3,
    background: C.bg3, border:`1px solid ${C.border2}`,
    color: C.textDim, cursor:'pointer' };
}
