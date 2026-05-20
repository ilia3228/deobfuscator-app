import React, { useEffect, useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { ANALYSIS_OPTION_DEFAULTS, LLM_MODES } from '../analysisOptions.js';
import {
  ACCENT_PRESETS,
  APPEARANCE_DEFAULTS,
  MONO_FONTS,
} from '../appearanceOptions.js';
import * as api from '../api.js';

export default function SettingsState({
  lt,
  user,
  sessionCount = 0,
  onLogout,
  onAccountDeleted,
  options = ANALYSIS_OPTION_DEFAULTS,
  onOptionChange,
  appearance = APPEARANCE_DEFAULTS,
  onAppearanceChange,
  initialSection,
}) {
  const lth = lt || getLangTheme(null);
  // `initialSection` lets other screens deep-link into a specific tab — e.g.
  // the upload screen's "Settings → LLM provider" link opens us on `llm`.
  const [section, setSection] = useState(initialSection || 'account');
  const [modal, setModal] = useState(null); // 'change-password' | 'delete-account'
  const [actionMsg, setActionMsg] = useState(null); // { kind: 'ok'|'err', text }
  const initial = ((user?.name || user?.email || 'U')[0] || 'U').toUpperCase();
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'guest');
  const llmMode = LLM_MODES.includes(options.llmMode) ? options.llmMode : ANALYSIS_OPTION_DEFAULTS.llmMode;
  const dynamicEval = options.dynamicEval !== false;
  const autoIoc = options.autoIoc !== false;
  const staticAnalysis = options.staticAnalysis !== false;
  const rename = options.rename !== false;
  const verbose = options.verbose !== false;
  const maxLayers = options.maxLayers ?? null;
  const timeout = options.timeout ?? null;

  const flashMsg = (kind, text) => {
    setActionMsg({ kind, text });
    window.setTimeout(() => setActionMsg(null), 4000);
  };

  const handleSignOutAll = async () => {
    try {
      const res = await api.signOutAllOtherDevices();
      flashMsg('ok', `Signed out ${res.revoked || 0} other device(s).`);
    } catch (err) {
      flashMsg('err', err?.message || String(err));
    }
  };

  const sections = [
    { id:'account',      label:'Account'       },
    { id:'engine',       label:'Engine'        },
    { id:'llm',          label:'LLM provider'  },
    { id:'appearance',   label:'Appearance'    },
    { id:'shortcuts',    label:'Keyboard'      },
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
        {actionMsg && (
          <div style={{
            position:'fixed', right:24, bottom:24, zIndex: 90,
            padding:'10px 14px', fontSize:12, fontFamily:C.mono,
            color: actionMsg.kind === 'ok' ? C.green : C.red,
            background: actionMsg.kind === 'ok' ? 'rgba(78,201,176,.10)' : C.redDim,
            border:`1px solid ${actionMsg.kind === 'ok' ? '#2c4a44' : '#3a2020'}`,
            borderRadius: 3, maxWidth: 420,
          }}>
            {actionMsg.text}
          </div>
        )}

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
            <Row label="Change password" hint="Replace your password without affecting active sessions.">
              <button onClick={() => setModal('change-password')} className="btn-hover"
                style={inputBtn()}>
                Change password…
              </button>
            </Row>
            <Row label="Sign out other devices"
              hint="Revoke every bearer token except the one this tab is using.">
              <button onClick={handleSignOutAll} className="btn-hover" style={inputBtn()}>
                Sign out from all devices
              </button>
            </Row>
            <Row label="Sign out" hint="Revokes your current bearer token.">
              <button onClick={onLogout} className="btn-hover"
                style={{ ...inputBtn(), color: C.red, borderColor:'#3a2020' }}>
                Sign out
              </button>
            </Row>
            <Row label="Delete account"
              hint="Permanently removes the account, all stored sessions and uploaded files. Irreversible.">
              <button onClick={() => setModal('delete-account')} className="btn-hover"
                style={{ ...inputBtn(), color: C.red, borderColor:'#3a2020' }}>
                Delete account…
              </button>
            </Row>
          </Block>
        )}

        {section === 'engine' && (
          <Block title="Engine" subtitle="Static and dynamic analysis defaults.">
            <Row label="Dynamic eval"
              hint="Hook eval/Function in a sandboxed VM. Slower but resolves runtime decoders.">
              <Toggle
                val={dynamicEval}
                onChange={() => onOptionChange?.('dynamicEval', !dynamicEval)}
                lth={lth}
              />
            </Row>
            <Row label="Static analysis" hint="Keep parser heuristics and string folding enabled before dynamic passes.">
              <Toggle
                val={staticAnalysis}
                onChange={() => onOptionChange?.('staticAnalysis', !staticAnalysis)}
                lth={lth}
              />
            </Row>
            <Row label="Auto-extract IOCs" hint="Run IOC extractor on completion.">
              <Toggle
                val={autoIoc}
                onChange={() => onOptionChange?.('autoIoc', !autoIoc)}
                lth={lth}
              />
            </Row>
            <Row label="Identifier rename" hint="Use engine-level rename pass where supported.">
              <Toggle
                val={rename}
                onChange={() => onOptionChange?.('rename', !rename)}
                lth={lth}
              />
            </Row>
            <Row label="LLM mode" hint="Default LLM behaviour for new analyses. Configure provider/key in LLM provider.">
              <Segmented
                items={[
                  { id:'off', label:'off' },
                  { id:'rename', label:'rename' },
                  { id:'format', label:'format' },
                  { id:'both', label:'both' },
                ]}
                value={llmMode}
                onChange={(v) => onOptionChange?.('llmMode', v)}
                lth={lth}
              />
            </Row>
            <Row label="Max layers" hint="Blank means backend default. JS default is 100, Python default is 500.">
              <OptionalNumberInput val={maxLayers} min={1} max={2000} w={90}
                placeholder="100 / 500"
                onChange={(v) => onOptionChange?.('maxLayers', v)} />
            </Row>
            <Row label="Sandbox timeout" hint="Blank means engine default timeout in seconds.">
              <OptionalNumberInput val={timeout} min={1} max={3600} w={90}
                placeholder="30 / 120"
                onChange={(v) => onOptionChange?.('timeout', v)} />
            </Row>
            <Row label="Verbose logs" hint="Keep detailed engine logs in the analysis stream.">
              <Toggle
                val={verbose}
                onChange={() => onOptionChange?.('verbose', !verbose)}
                lth={lth}
              />
            </Row>
            <Row label="Reset defaults" hint="Restore the analysis defaults used by the upload screen.">
              <button onClick={() => {
                Object.entries(ANALYSIS_OPTION_DEFAULTS)
                  .filter(([key]) => key !== 'schemaVersion')
                  .forEach(([key, value]) => onOptionChange?.(key, value));
              }} className="btn-hover" style={inputBtn()}>
                Reset engine options
              </button>
            </Row>
          </Block>
        )}

        {section === 'llm' && (
          <LLMSection lth={lth} flashMsg={flashMsg} />
        )}

        {section === 'appearance' && (
          <Block title="Appearance" subtitle="Local UI preferences for this browser.">
            <Row label="Theme" hint="The app currently ships one terminal-style shell.">
              <Segmented
                items={[{ id:'terminal', label:'terminal' }]}
                value={appearance.theme || 'terminal'}
                onChange={() => onAppearanceChange?.('theme', 'terminal')}
                lth={lth}
              />
            </Row>
            <Row label="App accent" hint="Applied to neutral screens and Settings chrome.">
              <Swatches
                value={appearance.accent}
                onChange={(id) => onAppearanceChange?.('accent', id)}
              />
            </Row>
            <Row label="JS analysis color" hint="Applied while analysing or viewing JavaScript results.">
              <Swatches
                value={appearance.jsAccent}
                onChange={(id) => onAppearanceChange?.('jsAccent', id)}
              />
            </Row>
            <Row label="Python analysis color" hint="Applied while analysing or viewing Python results.">
              <Swatches
                value={appearance.pyAccent}
                onChange={(id) => onAppearanceChange?.('pyAccent', id)}
              />
            </Row>
            <Row label="UI scale" hint="Adjust the app density without changing browser zoom.">
              <ScaleSlider
                value={appearance.uiScale}
                onCommit={(v) => onAppearanceChange?.('uiScale', v)}
                accentColor={lth.accent}
              />
            </Row>
            <Row label="Editor font">
              <select value={appearance.monoFont}
                onChange={(e) => onAppearanceChange?.('monoFont', e.target.value)}
                style={{ background: C.bg2, border:`1px solid ${C.border2}`,
                  padding:'6px 10px', fontSize:12, color: C.text, outline:'none',
                  borderRadius:3, fontFamily: C.mono, minWidth:200 }}>
                {MONO_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>{font.label}</option>
                ))}
              </select>
            </Row>
            <Row label="Font size" hint="Editor code size in pixels.">
              <NumInput val={appearance.editorFontSize} step={0.5} min={11} max={15} w={70}
                onChange={(v) => onAppearanceChange?.(
                  'editorFontSize',
                  Math.min(15, Math.max(11, Number(v) || APPEARANCE_DEFAULTS.editorFontSize)),
                )} />
            </Row>
            <Row label="Line numbers">
              <Toggle
                val={appearance.lineNumbers !== false}
                onChange={() => onAppearanceChange?.('lineNumbers', appearance.lineNumbers === false)}
                lth={lth}
              />
            </Row>
            <Row label="IOC line highlight">
              <Toggle
                val={appearance.iocHighlight !== false}
                onChange={() => onAppearanceChange?.('iocHighlight', appearance.iocHighlight === false)}
                lth={lth}
              />
            </Row>
            <Row label="Reduce motion">
              <Toggle
                val={!!appearance.reduceMotion}
                onChange={() => onAppearanceChange?.('reduceMotion', !appearance.reduceMotion)}
                lth={lth}
              />
            </Row>
            <Row label="Reset appearance" hint="Restore the project's default density and editor look.">
              <button onClick={() => {
                Object.entries(APPEARANCE_DEFAULTS)
                  .filter(([key]) => key !== 'schemaVersion')
                  .forEach(([key, value]) => onAppearanceChange?.(key, value));
              }} className="btn-hover" style={inputBtn()}>
                Reset appearance
              </button>
            </Row>
          </Block>
        )}

        {section === 'shortcuts' && (
          <Block title="Keyboard shortcuts" subtitle="Currently active shortcuts.">
            {[
              ['New analysis',['⌘','N']],
              ['Toggle sidebar',['⌘','B']],
              ['Toggle IOC panel',['⌘','I']],
              ['Command palette',['⌘','K']],
              ['Settings',['⌘',',']],
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

      </div>

      {modal === 'change-password' && (
        <ChangePasswordModal
          lth={lth}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); flashMsg('ok', 'Password updated.'); }}
        />
      )}
      {modal === 'delete-account' && (
        <DeleteAccountModal
          lth={lth}
          email={user?.email || ''}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            // Account is gone — drop local token + bounce to login. We
            // bypass the normal logout endpoint (which would 401) and
            // just clear client state.
            api.clearToken();
            onAccountDeleted?.();
          }}
        />
      )}
    </div>
  );
}

// ─── modals ─────────────────────────────────────────────────────────────────

function ModalShell({ children, onClose, width = 420 }) {
  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(8,8,10,.55)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth:'90vw', background: C.bg1, border:`1px solid ${C.border2}`,
          borderRadius:4, padding:'18px 20px', fontFamily:'Geist, sans-serif' }}>
        {children}
      </div>
    </div>
  );
}

function ChangePasswordModal({ lth, onClose, onSuccess }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const valid = next.length >= 6 && next === conf && cur.length >= 1;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!valid || busy) return;
    setBusy(true); setErr(null);
    try {
      await api.changePassword({ currentPassword: cur, newPassword: next });
      onSuccess?.();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize:15, fontWeight:500, color: C.text, marginBottom:14 }}>
          Change password
        </div>
        <PwField label="Current password" value={cur} onChange={setCur} show={show} autoFocus />
        <PwField label="New password (min 6 chars)" value={next} onChange={setNext} show={show} />
        <PwField label="Confirm new password" value={conf} onChange={setConf} show={show}
          warn={conf.length > 0 && next !== conf ? 'Does not match' : null} />
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
          color: C.textMuted, marginTop:6, fontFamily:C.mono, cursor:'pointer' }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          show passwords
        </label>
        {err && (
          <div style={{ marginTop:10, padding:'6px 10px', fontSize:11.5,
            fontFamily:C.mono, color: C.red, background: C.redDim,
            border:`1px solid #3a2020`, borderRadius:2 }}>{err}</div>
        )}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <button type="button" onClick={onClose} className="btn-hover" style={inputBtn()}>
            Cancel
          </button>
          <button type="submit" disabled={!valid || busy} className="btn-hover"
            style={{ ...inputBtn(), color: lth.accentText, borderColor: lth.accent,
              background: lth.accentDim,
              cursor: (!valid || busy) ? 'not-allowed' : 'pointer',
              opacity: (!valid || busy) ? 0.55 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteAccountModal({ lth, email, onClose, onSuccess }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const matches = confirm.trim().toLowerCase() === (email || '').toLowerCase();

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!matches || busy) return;
    setBusy(true); setErr(null);
    try {
      await api.deleteAccount({ emailConfirm: confirm.trim() });
      onSuccess?.();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ fontSize:15, fontWeight:500, color: C.red, marginBottom:8 }}>
          Delete account
        </div>
        <div style={{ fontSize:12, color: C.textDim, lineHeight:1.55, marginBottom:14 }}>
          This permanently removes your account, every stored analysis, and all
          uploaded sample files on the server. There is no undo.
          <br /><br />
          Type your email <strong style={{ color: C.text, fontFamily: C.mono }}>{email}</strong> below
          to confirm.
        </div>
        <input
          type="email"
          autoFocus
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={email}
          style={{ width:'100%', background: C.bg2, border:`1px solid ${C.border2}`,
            padding:'7px 10px', fontSize:12.5, color: C.text, outline:'none',
            borderRadius:3, fontFamily: C.mono }} />
        {err && (
          <div style={{ marginTop:10, padding:'6px 10px', fontSize:11.5,
            fontFamily:C.mono, color: C.red, background: C.redDim,
            border:`1px solid #3a2020`, borderRadius:2 }}>{err}</div>
        )}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <button type="button" onClick={onClose} className="btn-hover" style={inputBtn()}>
            Cancel
          </button>
          <button type="submit" disabled={!matches || busy} className="btn-hover"
            style={{ ...inputBtn(),
              color: C.red, borderColor: '#3a2020',
              background: 'rgba(220,80,80,.08)',
              cursor: (!matches || busy) ? 'not-allowed' : 'pointer',
              opacity: (!matches || busy) ? 0.55 : 1 }}>
            {busy ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── LLM section ────────────────────────────────────────────────────────────

const LLM_PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',         baseUrl: 'https://api.openai.com/v1' },
  { id: 'github',    label: 'GitHub Models',  baseUrl: 'https://models.inference.ai.azure.com' },
  { id: 'azure',     label: 'Azure OpenAI',   baseUrl: '' },
  { id: 'anthropic', label: 'Anthropic',      baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'ollama',    label: 'Ollama',         baseUrl: 'http://localhost:11434/v1' },
  { id: 'local',     label: 'Local (LM Studio)', baseUrl: 'http://localhost:1234/v1' },
  { id: 'stub',      label: 'Stub (off)',     baseUrl: '' },
];

const LLM_MODEL_HINTS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-5', 'gpt-5-mini',
  'openai/gpt-4o', 'openai/gpt-4o-mini',
  'claude-3-5-sonnet', 'claude-3-5-haiku',
  'llama3', 'llama3.1', 'qwen2.5-coder',
];

function LLMSection({ lth, flashMsg }) {
  const [cfg, setCfg] = useState(null);          // last server snapshot
  const [draft, setDraft] = useState(null);      // editable copy
  const [apiKey, setApiKey] = useState('');      // empty = "keep existing"
  // Plaintext key the backend handed back when the user clicked "show".
  // null until they reveal; once set, used to detect whether the input
  // was actually edited vs simply revealed (so Save stays disabled when
  // the user only peeks).
  const [revealedKey, setRevealedKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [revealBusy, setRevealBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(null);      // last test-connection result
  const [checkBusy, setCheckBusy] = useState(false);
  const [loadErr, setLoadErr] = useState(null);

  // Load on mount.
  useEffect(() => {
    let cancelled = false;
    api.getLlmConfig()
      .then((c) => {
        if (cancelled) return;
        setCfg(c);
        setDraft({
          provider:        c.provider || 'openai',
          model:           c.model || '',
          base_url:        c.base_url || '',
          temperature:     c.temperature ?? 0,
          max_tokens:      c.max_tokens || 4096,
          max_code_size:   c.max_code_size || 65536,
          timeout_seconds: c.timeout_seconds || 120,
          api_key_env:     c.api_key_env || '',
        });
      })
      .catch((err) => { if (!cancelled) setLoadErr(err?.message || String(err)); });
    return () => { cancelled = true; };
  }, []);

  // "Key edited" means the input differs from whatever the backend
  // currently has. Without a reveal we only know the field is non-empty
  // (→ user typed a new key); with a reveal we compare against the
  // revealed plaintext so a no-op peek doesn't flip the Save button.
  const keyDirty = revealedKey == null
    ? apiKey.length > 0
    : apiKey !== revealedKey;

  const dirty = draft && cfg && (
    draft.provider        !== (cfg.provider || 'openai') ||
    draft.model           !== (cfg.model || '') ||
    draft.base_url        !== (cfg.base_url || '') ||
    Number(draft.temperature) !== Number(cfg.temperature ?? 0) ||
    Number(draft.max_tokens)  !== Number(cfg.max_tokens || 0) ||
    Number(draft.max_code_size) !== Number(cfg.max_code_size || 0) ||
    Number(draft.timeout_seconds) !== Number(cfg.timeout_seconds || 0) ||
    draft.api_key_env     !== (cfg.api_key_env || '') ||
    keyDirty
  );

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const body = { ...draft };
      // Only write the key when the user actually edited it. A bare
      // "reveal then save" path keeps the existing stored key intact.
      if (keyDirty && apiKey) body.api_key = apiKey;
      const next = await api.putLlmConfig(body);
      // The backend automatically clears its 'Test connection' stamp
      // whenever a write changes provider/model/base_url/api_key (see
      // ``llm_config.write_config``), so the response's ``verified`` flag
      // is already accurate. We only have to drop our local probe state
      // when verification is now gone — otherwise the stale green badge
      // would linger until the next mount.
      if (!next?.verified) setCheck(null);
      setCfg(next);
      setApiKey('');
      setRevealedKey(null);
      setShowKey(false);
      flashMsg?.('ok', 'LLM configuration saved.');
    } catch (err) {
      flashMsg?.('err', err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await api.putLlmConfig({ clear_api_key: true });
      // Clearing the key always invalidates verification on the backend.
      setCheck(null);
      setCfg(next);
      setApiKey('');
      setRevealedKey(null);
      setShowKey(false);
      flashMsg?.('ok', 'API key cleared.');
    } catch (err) {
      flashMsg?.('err', err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  // "show" toggle: on the first reveal we fetch the plaintext key from the
  // backend so the user can see what's currently stored. Subsequent toggles
  // just flip the input type without another network round-trip.
  const toggleShowKey = async () => {
    if (revealBusy) return;
    if (!showKey && apiKey === '' && cfg.api_key_present && revealedKey == null) {
      setRevealBusy(true);
      try {
        const revealed = await api.getLlmConfig({ reveal: true });
        const key = String(revealed?.api_key || '');
        if (key) {
          setApiKey(key);
          setRevealedKey(key);
        }
      } catch (err) {
        flashMsg?.('err', `Failed to reveal key: ${err?.message || err}`);
        setRevealBusy(false);
        return;
      } finally {
        setRevealBusy(false);
      }
    }
    setShowKey((v) => !v);
  };

  const runCheck = async () => {
    if (checkBusy) return;
    setCheckBusy(true);
    setCheck(null);
    try {
      const res = await api.checkLlm('both');
      setCheck(res);
      // Verified-stamp persistence happens server-side inside
      // ``/api/llm/check`` itself — re-fetch the public config so our
      // local snapshot (and the ✓ verified badge driven by ``cfg.verified``)
      // reflect the new state without waiting for a remount.
      try { setCfg(await api.getLlmConfig()); } catch { /* leave stale cfg */ }
    } catch (err) {
      setCheck({ ok: false, results: [{ engine: 'both', ok: false, error: err?.message || String(err) }] });
      try { setCfg(await api.getLlmConfig()); } catch { /* leave stale cfg */ }
    } finally {
      setCheckBusy(false);
    }
  };

  if (loadErr) {
    return (
      <Block title="LLM provider"
        subtitle="Used for variable renaming and code formatting.">
        <div style={{ padding:'8px 12px', background: C.redDim,
          border:'1px solid #3a2020', borderRadius:3,
          fontSize:11.5, color: C.red, marginBottom:14, fontFamily: C.mono }}>
          Failed to load LLM config: {loadErr}
        </div>
      </Block>
    );
  }
  if (!draft || !cfg) {
    return (
      <Block title="LLM provider"
        subtitle="Used for variable renaming and code formatting.">
        <div style={{ fontSize:12, color: C.textMuted, fontFamily: C.mono }}>Loading…</div>
      </Block>
    );
  }

  const setF = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const keyMissing = !cfg.api_key_present;
  // "Verified" reflects the persisted stamp from the last successful test
  // for the cfg currently saved on disk. Used to surface a green badge so
  // the user sees the connection state without re-clicking Test connection.
  const verified = api.isLlmVerified(cfg);

  return (
    <Block title="LLM provider"
      subtitle="Saved to shared llm_config.toml files; the API key is usable only by this account.">
      {keyMissing && (
        <div style={{ padding:'8px 12px', background:'rgba(220,170,80,.08)',
          border:'1px solid rgba(220,170,80,.25)', borderRadius:3,
          fontSize:11.5, color:'#dab852', marginBottom:14, fontFamily: C.mono }}>
          ⚠ LLM features are disabled until this account has an API key.
        </div>
      )}

      <Row label="Provider">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {LLM_PROVIDERS.map((p) => {
            const sel = draft.provider === p.id;
            return (
              <button key={p.id} className="btn-hover"
                onClick={() => setDraft((d) => ({
                  ...d, provider: p.id,
                  // Auto-suggest the canonical base_url when it's empty or
                  // matches another provider's preset — never stomp a custom URL.
                  base_url: (!d.base_url || LLM_PROVIDERS.some((x) => x.baseUrl === d.base_url))
                    ? p.baseUrl : d.base_url,
                }))}
                style={{ padding:'5px 11px', fontSize:11.5, borderRadius:3,
                  background: sel ? lth.accentDim : C.bg3,
                  border:`1px solid ${sel ? lth.accent : C.border2}`,
                  color: sel ? lth.accentText : C.textDim, cursor:'pointer' }}>
                {p.label}
              </button>
            );
          })}
        </div>
      </Row>

      <Row label="Model" hint="Free-form. Suggestions are popular OpenAI-compatible names.">
        <input
          value={draft.model}
          onChange={(e) => setF('model')(e.target.value)}
          list="llm-model-hints"
          placeholder="openai/gpt-4o-mini"
          name="llm-model-id"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          style={{ width:280, background: C.bg2, border:`1px solid ${C.border2}`,
            padding:'6px 10px', fontSize:12, color: C.text, outline:'none',
            borderRadius:3, fontFamily: C.mono }} />
        <datalist id="llm-model-hints">
          {LLM_MODEL_HINTS.map((m) => <option key={m} value={m} />)}
        </datalist>
      </Row>

      <Row label="API key"
        hint={cfg.api_key_present
          ? (revealedKey != null
              ? 'Revealed from llm_config.toml. Edit to overwrite, or use “clear” to remove.'
              : `Currently set (…${cfg.api_key_last4 || '????'}). Click “show” to reveal, or paste a new key to overwrite.`)
          : 'Not set for this account. Paste your own key to enable LLM features.'}>
        <div style={{ display:'flex', gap:6, alignItems:'center', width:'100%' }}>
          {/*
            Intentionally `type="text"` (not `type="password"`) — Chrome's
            "Save password?" heuristic fires on any password input regardless
            of autoComplete attributes, so we mask the rendered glyphs via
            CSS `-webkit-text-security` instead. Supported in all evergreen
            browsers (Chrome, Edge, Safari, Firefox 122+). Falls back to
            unmasked text on ancient browsers — acceptable trade-off for a
            local dev tool, and the value is still revealable on demand via
            the "show" button anyway.
          */}
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            // Placeholder mirrors the stored key's actual length when one
            // is set (the backend returns ``api_key_length`` alongside
            // ``api_key_last4``). Empty when no key is on file, so the
            // user is never misled into thinking a short token is enough.
            placeholder={
              cfg.api_key_present
                ? '•'.repeat(Math.max(8, Math.min(cfg.api_key_length || 0, 120)))
                : ''
            }
            name="llm-provider-secret"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            style={{ flex:1, maxWidth:320, background: C.bg2,
              border:`1px solid ${C.border2}`, padding:'6px 10px',
              fontSize:11.5, color: C.text, outline:'none',
              borderRadius:3, fontFamily: C.mono,
              WebkitTextSecurity: showKey ? 'none' : 'disc',
              textSecurity: showKey ? 'none' : 'disc' }} />
          <button onClick={toggleShowKey} disabled={revealBusy} className="btn-hover"
            title={showKey ? 'Hide key' : 'Show key'}
            style={{ ...inputBtn(), minWidth:46,
              opacity: revealBusy ? 0.55 : 1,
              cursor: revealBusy ? 'wait' : 'pointer' }}>
            {revealBusy ? '…' : (showKey ? 'hide' : 'show')}
          </button>
          {cfg.api_key_present && (
            <button onClick={clearKey} disabled={busy} className="btn-hover"
              title="Remove the API key from both llm_config.toml files"
              style={{ ...inputBtn(), color: C.red, borderColor: '#3a2020' }}>
              clear
            </button>
          )}
        </div>
      </Row>

      <Row label="Base URL" hint="OpenAI-compatible endpoint. Leave empty for the provider default.">
        <input
          value={draft.base_url}
          onChange={(e) => setF('base_url')(e.target.value)}
          placeholder="https://api.openai.com/v1"
          name="llm-base-url"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          style={{ width:'100%', maxWidth:380, background: C.bg2,
            border:`1px solid ${C.border2}`, padding:'6px 10px',
            fontSize:11.5, color: C.text, outline:'none',
            borderRadius:3, fontFamily: C.mono }} />
      </Row>

      <Row label="Temperature" hint="0 = deterministic, 2 = highly creative. 0–0.2 recommended.">
        <NumInput val={draft.temperature} step={0.1} min={0} max={2} w={80}
          onChange={(v) => setF('temperature')(v)} />
      </Row>

      <Row label="Max tokens" hint="Per-response cap. Typical limits: 4096–16384 (gpt-4o), up to 32768 (gpt-5). Mapped to max_completion_tokens for gpt-5 models.">
        <NumInput val={draft.max_tokens} step={256} min={1} max={32768} w={100}
          onChange={(v) => setF('max_tokens')(v)} />
      </Row>

      <Row label="Max code size" hint="JS-only. Skip LLM rename/format for layers larger than this many bytes.">
        <NumInput val={draft.max_code_size} step={1024} min={1024} w={100}
          onChange={(v) => setF('max_code_size')(v)} />
      </Row>

      <Row label="Timeout (sec)" hint="Python backend per-request HTTP timeout.">
        <NumInput val={draft.timeout_seconds} step={1} min={1} max={3600} w={80}
          onChange={(v) => setF('timeout_seconds')(v)} />
      </Row>

      {/* No borderTop here — the previous <Row>'s borderBottom already
          provides the divider, so adding another line + marginTop ends up
          rendering two parallel rules ~8 px apart on the LLM provider page. */}
      <div style={{ display:'flex', alignItems:'center', gap:10,
        padding:'14px 0 4px' }}>
        <button onClick={save} disabled={!dirty || busy} className="btn-hover"
          style={{ ...inputBtn(),
            color: lth.accentText, borderColor: lth.accent, background: lth.accentDim,
            opacity: (!dirty || busy) ? 0.55 : 1,
            cursor: (!dirty || busy) ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={runCheck} disabled={checkBusy || keyMissing} className="btn-hover"
          style={{ ...inputBtn(),
            opacity: (checkBusy || keyMissing) ? 0.55 : 1,
            cursor: (checkBusy || keyMissing) ? 'not-allowed' : 'pointer' }}>
          {checkBusy ? 'Probing…' : 'Test connection'}
        </button>
        {check ? <CheckResult check={check} /> : (verified && (
          <span title="Last Test connection succeeded for this provider/model/key"
            style={{ padding:'3px 8px', borderRadius:2, fontFamily:C.mono, fontSize:11,
              color: C.green, background:'rgba(92,194,121,.10)', border:'1px solid #2c4a44' }}>
            ✓ verified
          </span>
        ))}
      </div>
    </Block>
  );
}

function CheckResult({ check }) {
  const items = check.results || [];
  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', flex:1, fontFamily:C.mono, fontSize:11 }}>
      {items.map((r) => {
        const ok = !!r.ok;
        const safeError = safeCheckError(r.error, r.exit_code);
        return (
          <span key={r.engine}
            title={ok && r.model ? `${r.provider || ''}/${r.model} · ${r.latency_ms || 0}ms` : safeError}
            style={{ padding:'3px 8px', borderRadius:2,
              color: ok ? C.green : C.red,
              background: ok ? 'rgba(92,194,121,.10)' : C.redDim,
              border:`1px solid ${ok ? '#2c4a44' : '#3a2020'}` }}>
            {ok ? '✓' : '✗'} {r.engine} {ok
              ? `· ${r.latency_ms || 0}ms`
              : `· ${safeError}`}
          </span>
        );
      })}
    </div>
  );
}

function safeCheckError(error, exitCode) {
  const raw = String(error || '');
  const lower = raw.toLowerCase();
  if (lower.includes('invalid_api_key') || lower.includes('incorrect api key') ||
      lower.includes('authenticationerror') || (lower.includes('401') && lower.includes('api key'))) {
    return 'auth failed';
  }
  if (lower.includes('unicodeencodeerror') || lower.includes('charmap')) {
    return 'console encoding failed';
  }
  if (lower.includes('timeout')) return 'timeout';
  if (lower.includes('rate limit') || lower.includes('rate_limit') || lower.includes('429')) {
    return 'rate limited';
  }
  if (lower.includes('connection') || lower.includes('econnrefused') || lower.includes('connecterror')) {
    return 'endpoint unreachable';
  }
  if (lower.includes('not built')) return 'backend not built';
  if (lower.includes('unavailable')) return 'check unavailable';
  return exitCode != null ? `exit ${exitCode}` : 'check failed';
}

function Segmented({ items, value, onChange, lth }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {items.map((item) => {
        const sel = value === item.id;
        return (
          <button key={item.id} onClick={() => !item.disabled && onChange?.(item.id)}
            disabled={!!item.disabled}
            className="btn-hover"
            title={item.disabled ? 'Unavailable with current configuration' : undefined}
            style={{ padding:'5px 11px', fontSize:11.5, borderRadius:3,
              background: sel ? lth.accentDim : C.bg3,
              border:`1px solid ${sel ? lth.accent : C.border2}`,
              color: sel ? lth.accentText : C.textDim,
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.55 : 1,
              fontFamily:C.mono }}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatches({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {ACCENT_PRESETS.map((preset)=>(
        <button key={preset.id} onClick={() => onChange?.(preset.id)}
          title={preset.label}
          style={{ width:24, height:24, borderRadius:3,
            background: preset.accent,
            border:`2px solid ${value === preset.id ? '#e6e6e6' : C.bg2}`,
            boxShadow: value === preset.id ? `0 0 0 1px ${preset.accent}` : 'none',
            cursor:'pointer' }} />
      ))}
    </div>
  );
}

// `#root` is `zoom: var(--ui-scale)`, so committing every micro-step of a
// drag re-zooms the page (and the slider track itself) in real time, which
// makes the thumb skitter around under the cursor. Mirror the value
// locally during the gesture and only propagate on release — that way the
// slider geometry stays stable until the user lets go.
function ScaleSlider({ value, onCommit, accentColor }) {
  const [local, setLocal] = useState(value);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) setLocal(value);
  }, [value, dragging]);

  const commit = () => {
    setDragging(false);
    if (local !== value) onCommit?.(local);
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <input type="range" min="0.9" max="1.25" step="0.01"
        value={local}
        onChange={(e) => { setDragging(true); setLocal(Number(e.target.value)); }}
        onPointerUp={commit}
        onPointerCancel={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ width:180, accentColor }} />
      <span style={{ fontSize:11, color: C.textDim, fontFamily:C.mono, width:42 }}>
        {Math.round((local || 1) * 100)}%
      </span>
    </div>
  );
}

function NumInput({ val, onChange, step = 1, min, max, w = 80 }) {
  return (
    <input className="no-spin" type="number" value={val ?? ''} step={step} min={min} max={max}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(0);
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      style={{ width: w, background: C.bg2, border:`1px solid ${C.border2}`,
        padding:'6px 10px', fontSize:12, color: C.text, outline:'none',
        borderRadius:3, fontFamily: C.mono }} />
  );
}

function OptionalNumberInput({ val, onChange, step = 1, min, max, w = 80, placeholder = 'default' }) {
  return (
    <input className="no-spin" type="number" value={val ?? ''} step={step} min={min} max={max}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange?.(null);
        const n = Number(raw);
        if (!Number.isFinite(n)) return onChange?.(null);
        const bounded = Math.min(max ?? n, Math.max(min ?? n, Math.floor(n)));
        onChange?.(bounded);
      }}
      style={{ width: w, background: C.bg2, border:`1px solid ${C.border2}`,
        padding:'6px 10px', fontSize:12, color: C.text, outline:'none',
        borderRadius:3, fontFamily: C.mono }} />
  );
}

function PwField({ label, value, onChange, show, warn, autoFocus }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, color: C.textDim, marginBottom:4 }}>{label}</div>
      <input
        type={show ? 'text' : 'password'}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width:'100%', background: C.bg2, border:`1px solid ${C.border2}`,
          padding:'7px 10px', fontSize:12.5, color: C.text, outline:'none',
          borderRadius:3, fontFamily: C.mono }} />
      {warn && (
        <div style={{ marginTop:3, fontSize:10.5, color: C.red, fontFamily: C.mono }}>{warn}</div>
      )}
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
