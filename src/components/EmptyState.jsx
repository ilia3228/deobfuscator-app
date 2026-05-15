import React, { useRef, useState } from 'react';
import { C, getLangTheme } from '../theme.js';
import { Ico } from './UI.jsx';
import { OBFUSCATED_CODE, PY_OBFUSCATED_CODE } from '../data.js';
import { ANALYSIS_OPTION_DEFAULTS } from '../analysisOptions.js';
import { useResizable, ResizeHandle } from './Resizable.jsx';

// Small bank of demo payloads, one per kind of obfuscation the engine handles.
// Clicking a chip pastes the text into the textarea so the user can immediately
// hit "Run deobfuscation".
const TRY_SAMPLES = [
  { label: 'javascript-obfuscator', lang: 'js', text: OBFUSCATED_CODE },
  { label: 'pyarmor (py)',          lang: 'py', text: PY_OBFUSCATED_CODE },
  {
    label: 'Dean Edwards packer',
    lang: 'js',
    text:
      "eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};" +
      "if(!''.replace(/^/,String)){while(c--)d[c.toString(a)]=k[c]||c.toString(a);" +
      "k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};" +
      "while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);" +
      "return p}('1(\"2 0\")',3,3,'world|alert|hello'.split('|'),0,{}))",
  },
  {
    label: 'eval-chain',
    lang: 'js',
    text:
      "eval(atob('ZnVuY3Rpb24geCgpe2NvbnNvbGUubG9nKCdoZWxsbycpfTsgeCgpOw=='));\n" +
      "Function('return this')().fetch('https://example.com/c2');",
  },
];

// Heuristic content-based language detection for pasted code. We only
// commit to a language when one side has clear markers and the other
// doesn't — ambiguous content returns null so the API's own sniffer
// (`mock-api/main.py::_sniff_lang`) gets to make the final call.
const PY_RE = /\b__import__\b|\blambda\s+[\w,*\s]*:|\bdef\s+\w|\bclass\s+\w+\s*[:(]|^\s*from\s+\w|^\s*import\s+(?:zlib|base64|marshal|struct|os|sys|builtins)|exec\s*\(\s*b['"]|print\s*\(/m;
const JS_RE = /\bfunction\s*[\w(]|=>|\bconsole\.|\bvar\s+\w|\blet\s+\w|\bconst\s+\w|\brequire\s*\(|\bmodule\.exports|\bglobalThis\b|\bnavigator\./;

const detectLangFromText = (text) => {
  const hasPy = PY_RE.test(text);
  const hasJs = JS_RE.test(text);
  if (hasPy && !hasJs) return 'py';
  if (hasJs && !hasPy) return 'js';
  return null; // ambiguous — defer to server
};

export default function EmptyState({
  lang = 'js',
  lt,
  onAnalyze,
  uploadError,
  onClearError,
  options = ANALYSIS_OPTION_DEFAULTS,
  onOptionChange,
}) {
  const lth = lt || getLangTheme(null);
  const [drag, setDrag] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pickedFile, setPickedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [langMode, setLangMode] = useState('auto'); // 'auto' | 'js' | 'py'
  const fileInputRef = useRef(null);
  // Right-side options panel is user-resizable from its left edge.
  const {
    size: optionsW,
    startDrag: startOptionsDrag,
    dragging: optionsDragging,
  } = useResizable({
    initial: 220, min: 180, max: 360,
    axis: 'x', edge: 'left',
    storageKey: 'jsdeobf.layout.options',
  });
  const llm = !!options.llmRename;
  const dynamicEval = options.dynamicEval !== false;
  const autoIoc = options.autoIoc !== false;

  // Live preview of which language the current paste will be routed to.
  // Pure display — `submit` re-runs detection to stay honest.
  const autoGuess = pasted.trim() ? detectLangFromText(pasted) : null;

  const submit = async () => {
    if (busy) return;
    let file = pickedFile;
    let langHint;
    if (!file) {
      if (!pasted.trim()) return;
      if (langMode === 'auto') {
        // undefined when ambiguous → server sniff decides
        langHint = detectLangFromText(pasted) ?? undefined;
      } else {
        langHint = langMode;
      }
      const ext = langHint === 'py' ? 'py' : 'js';
      file = new File([pasted], `pasted.${ext}`, { type: 'text/plain' });
    }
    setBusy(true);
    try {
      await onAnalyze?.(file, {
        useLlm: llm,
        dynamicEval,
        autoIoc,
        langHint,
      });
    } finally {
      setBusy(false);
    }
  };

  const acceptFile = (f) => {
    if (!f) return;
    setPickedFile(f);
    setPasted('');
    onClearError?.();
  };

  const insertSample = (s) => {
    setPickedFile(null);
    setPasted(s.text);
    onClearError?.();
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 48px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.ts,.mjs,.py,.txt,text/*,application/javascript,application/x-python-code"
          style={{ display: 'none' }}
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            width: '100%',
            maxWidth: 480,
            border: `1px solid ${drag ? lth.accent : C.border2}`,
            background: drag ? lth.accentDim : C.bg1,
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'border-color .12s',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 11.5, color: C.text }}>
              {drag
                ? 'Drop to analyse…'
                : pickedFile
                  ? `${pickedFile.name} · ${pickedFile.size} B`
                  : 'Drop file or paste code'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn-hover"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '3px 10px',
                  background: C.bg3,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  color: C.textDim,
                  cursor: 'pointer',
                }}
              >
                Browse…
              </button>
            </div>
          </div>

          <textarea
            value={pasted}
            onChange={(e) => { setPasted(e.target.value); onClearError?.(); }}
            placeholder={`var _0x4f2a=['push','ZmV0Y2g=','aHR0cHM6Ly9j…\n\n// or drag a .js / .py file onto this area`}
            rows={8}
            style={{
              width: '100%',
              resize: 'none',
              background: 'transparent',
              border: 'none',
              padding: '12px 14px',
              fontSize: 11.5,
              color: C.text,
              outline: 'none',
              fontFamily: C.mono,
              lineHeight: 1.7,
              display: 'block',
            }}
          />

          <div
            style={{
              padding: '6px 14px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 10.5, fontFamily: C.mono, color: C.textMuted }}>
              {pasted.length > 0
                ? `${pasted.length} chars${langMode === 'auto' && autoGuess ? ` · auto → ${autoGuess}` : ''}`
                : 'js · ts · mjs · py'}
            </span>
            <div
              role="radiogroup"
              aria-label="Language"
              style={{
                display: 'flex',
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                overflow: 'hidden',
                fontSize: 10.5,
                fontFamily: C.mono,
              }}
            >
              {['auto', 'js', 'py'].map((m, i) => {
                const active = langMode === m;
                return (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLangMode(m)}
                    title={
                      m === 'auto'
                        ? 'Detect language from content'
                        : `Force ${m.toUpperCase()} deobfuscator`
                    }
                    style={{
                      padding: '2px 8px',
                      background: active ? lth.accentDim : 'transparent',
                      color: active ? lth.accentText : C.textMuted,
                      border: 'none',
                      borderLeft: i === 0 ? 'none' : `1px solid ${C.border}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, width: '100%', maxWidth: 480 }}>
          <button
            onClick={submit}
            disabled={busy || (!pickedFile && !pasted.trim())}
            style={{
              width: '100%',
              padding: '8px 0',
              background: lth.accentDim,
              border: `1px solid ${lth.accent}`,
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 500,
              color: lth.accentText,
              cursor: busy || (!pickedFile && !pasted.trim()) ? 'not-allowed' : 'pointer',
              opacity: busy || (!pickedFile && !pasted.trim()) ? 0.55 : 1,
              fontFamily: 'Geist, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {busy ? 'Uploading…' : 'Run deobfuscation →'}
          </button>
          {uploadError && (
            <div style={{
              marginTop: 8, padding: '6px 10px', fontSize: 11,
              fontFamily: C.mono, color: C.red,
              background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 2,
            }}>
              {uploadError}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            maxWidth: 480,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.textMuted,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Try:
          </span>
          {TRY_SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => insertSample(s)}
              className="btn-hover"
              title={`Paste ${s.label} sample (${s.lang})`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: lth.accentText,
                padding: 0,
                fontFamily: C.mono,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                textDecorationColor: lth.accentDim,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          width: optionsW,
          borderLeft: `1px solid ${C.border}`,
          background: C.bg1,
          padding: '16px 14px',
          overflowY: 'auto',
          flexShrink: 0,
          position: 'relative',
          '--resize-accent': lth.accent,
        }}
      >
        <ResizeHandle
          edge="left"
          onPointerDown={startOptionsDrag}
          dragging={optionsDragging}
          label="Resize options panel"
        />
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            color: C.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            marginBottom: 14,
          }}
        >
          Options
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={llm}
          onClick={() => onOptionChange?.('llmRename', !llm)}
          style={{
            cursor: 'pointer',
            marginBottom: 2,
            padding: '9px 10px',
            background: llm ? C.bg3 : 'transparent',
            border: `1px solid ${llm ? C.border2 : C.border}`,
            borderRadius: 3,
            transition: 'all .1s',
            display: 'block',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                flexShrink: 0,
                background: llm ? lth.accent : C.bg4,
                border: `1.5px solid ${llm ? lth.accent : C.border2}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {llm && <Ico d="M3 8l3.5 3.5 6.5-6" size={10} col="#fff" />}
            </div>
            <span style={{ fontSize: 12, color: llm ? C.text : C.textDim, fontWeight: 500 }}>
              LLM rename
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, paddingLeft: 22 }}>
            GPT-4o variable renaming on the deobfuscated output
          </div>
        </button>

        <OptionCheck
          checked={dynamicEval}
          onChange={() => onOptionChange?.('dynamicEval', !dynamicEval)}
          accent={lth.accent}
          label="Dynamic eval"
          desc="Hook eval/Function in a sandboxed VM"
        />

        <OptionCheck
          checked={autoIoc}
          onChange={() => onOptionChange?.('autoIoc', !autoIoc)}
          accent={lth.accent}
          label="Auto-extract IOCs"
          desc="Run IOC extractor on completion"
        />
      </div>
    </div>
  );
}

function OptionCheck({ checked, onChange, accent, label, desc }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      style={{
        cursor: 'pointer',
        marginBottom: 2,
        padding: '9px 10px',
        background: checked ? C.bg3 : 'transparent',
        border: `1px solid ${checked ? C.border2 : C.border}`,
        borderRadius: 3,
        transition: 'all .1s',
        display: 'block',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 2,
            flexShrink: 0,
            background: checked ? accent : C.bg4,
            border: `1.5px solid ${checked ? accent : C.border2}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && <Ico d="M3 8l3.5 3.5 6.5-6" size={10} col="#fff" />}
        </div>
        <span style={{ fontSize: 12, color: checked ? C.text : C.textDim, fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, paddingLeft: 22 }}>
        {desc}
      </div>
    </button>
  );
}
