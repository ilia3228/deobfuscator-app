// IDE-style editor-surface tokens. Used by CodeViewer / IocRow / tabs.
// Kept language-agnostic; per-language accents come from getLangTheme(lang).
// Static neutral palette → the CSS in styles.css mirrors these values for
// the :hover / .active state rules where inline styles can't reach.
export const E = {
  editorBg:        '#0d0d0d',  // code surface
  gutterBg:        '#0a0a0a',  // line-number / marker column
  gutterDivider:   '#1f1f1f',  // vertical separator gutter→code
  gutterFg:        '#5a5a5a',  // dim line number
  gutterFgActive:  '#dadada',  // active line number, lit
  lineHover:       '#171717',  // mouse hover on a row
  lineActive:      '#1d2026',  // selected / focused line
  iocRow:          'rgba(224,112,112,.05)',
  iocRowHover:     'rgba(224,112,112,.13)',
  iocMark:         '#d45f5f',
  diffAddRow:      'rgba(92,194,121,.06)',
  diffAddRowHover: 'rgba(92,194,121,.13)',
  diffAddFg:       '#6cbf80',
  diffDelRow:      'rgba(224,112,112,.06)',
  diffDelRowHover: 'rgba(224,112,112,.13)',
  diffDelFg:       '#c97070',
  tabStripBg:      '#0f0f0f',
  tabHoverBg:      '#171717',
  tabActiveBg:     '#0d0d0d',
  tabDivider:      '#1c1c1c',
};

// Per-tab file-type badge — IDE-style colored 2-char chip next to the label.
// Maps tab id + language → { bg, fg, text }.
export function tabBadge(id, lang) {
  const isPy = lang === 'py';
  if (id === 'report')   return { bg: '#2f2806', fg: '#e8c660', text: '{}' };
  if (id === 'diff')     return { bg: '#162533', fg: '#7aa5d4', text: 'Δ' };
  if (id === 'original') return { bg: '#1f1f1f', fg: '#a8a8a8', text: isPy ? 'py' : 'js' };
  if (id === 'cleaned')
    return isPy
      ? { bg: '#0f2335', fg: '#8dc4f0', text: 'py' }
      : { bg: '#2f1a06', fg: '#f0a76a', text: 'js' };
  if (id.startsWith('layer-'))
    return isPy
      ? { bg: '#0d1a26', fg: '#5b9fd4', text: 'py' }
      : { bg: '#1f1006', fg: '#dc8a3f', text: 'js' };
  return { bg: '#1f1f1f', fg: '#a8a8a8', text: '·' };
}

// colour tokens — dark terminal aesthetic
export const C = {
  bg: '#0d0d0d',
  bg1: '#111111',
  bg2: '#161616',
  bg3: '#1c1c1c',
  bg4: '#222222',
  border: '#303030',
  border2: '#3e3e3e',
  text: '#efefef',
  textDim: '#c8c8c8',
  textMuted: '#9a9a9a',
  accent: '#9d6ef0', // purple
  accentDim: '#1e1235',
  accentText: '#c4a7f7',
  pink: '#d966a8',
  pinkDim: '#2a0e22',
  pinkText: '#f0a3d4',
  teal: '#4ec9b0',
  tealDim: '#0e2922',
  green: '#5cc279',
  greenDim: '#1a3326',
  red: '#e07070',
  redDim: '#3a1a1a',
  orange: '#e0a55a',
  orangeDim: '#382710',
  yellow: '#dab852',
  mono: "'Geist Mono', 'JetBrains Mono', 'Consolas', monospace",
};

// Language theme — full visual identity per language
export function getLangTheme(lang) {
  if (lang === 'py')
    return {
      accent: '#5b9fd4',
      accentDim: '#0a1a2a',
      accentText: '#8dc4f0',
      accentBorder: '#5b9fd444',
      label: 'py',
      obfChip: 'pyarmor',
      headerBg: '#0a1520',
      footerBg: '#080f18',
      sidebarBg: '#0c1820',
      borderTint: '#1a3040',
      border2Tint: '#244060',
      logInfo: '#8dc4f0',
      logOk: '#a0e0ff',
      logDebug: '#5a8aaa',
      logOrange: '#5b9fd4',
      logArrow: '#5a9aca',
      // Syntax palette — aligned with the project's terminal palette
      // (C.teal / C.green / C.orange / C.yellow / C.pink) rather than
      // VS Code Dark+ defaults, so PY code reads as part of the app
      // instead of a transplanted editor pane.
      codeKeyword: '#5b9fd4',     // import/def/class — PY lang accent
      codeString:  '#a3c982',     // softer C.green
      codeNumber:  '#e0a55a',     // C.orange
      codeIdent:   '#dcdcdc',     // off-white identifiers
      codeWarn:    '#e07070',     // C.red
      codeComment: '#5a7a8a',     // muted blue-gray (matches PY chrome)
      codeFn:      '#dab852',     // C.yellow — function names
      codeBuiltin: '#4ec9b0',     // C.teal — print, range, __import__
      codePunct:   '#9a9a9a',     // C.textMuted — neutral grey
      codeRegex:   '#d966a8',     // C.pink
      codeProp:    '#9ec4e0',     // light blue-tinted off-white
      statusAccent: '#5b9fd4',
    };
  if (lang === 'js')
    return {
      accent: '#dc8a3f',
      accentDim: '#1f1208',
      accentText: '#f0a76a',
      accentBorder: '#dc8a3f44',
      label: 'js',
      obfChip: 'js-obfuscator',
      headerBg: '#1a0e02',
      footerBg: '#140a01',
      sidebarBg: '#180c02',
      borderTint: '#2e1c08',
      border2Tint: '#48300f',
      logInfo: '#e8a060',
      logOk: '#ffb878',
      logDebug: '#8a6a3a',
      logOrange: '#ff8a3a',
      logArrow: '#a07a48',
      // Syntax palette — aligned with the project's terminal palette
      // (C.teal / C.green / C.orange / C.yellow / C.pink). JS keywords
      // pick up the warm-orange lang-accent instead of VS Code's purple so
      // the editor reads as part of the JS-flavoured UI surface.
      codeKeyword: '#e69050',     // function/return/const/let — warm orange (JS accent family)
      codeString:  '#ce9178',     // warm salmon — VS Code Dark+ string, harmonises with the orange accent
      codeNumber:  '#e0a55a',     // C.orange
      codeIdent:   '#dcdcdc',     // off-white identifiers
      codeWarn:    '#e07070',     // C.red
      codeComment: '#7a6a55',     // warm desaturated taupe — replaces the olive green
      codeFn:      '#f0b878',     // light orange — function call name
      codeBuiltin: '#4ec9b0',     // C.teal — fetch, atob, eval, console
      codePunct:   '#9a9a9a',     // C.textMuted
      codeRegex:   '#d966a8',     // C.pink
      codeProp:    '#c8c8c8',     // soft off-white properties
      statusAccent: '#e8a060',
    };
  // upload / unknown — neutral purple, but with full IDE palette
  return {
    accent: C.accent,
    accentDim: C.accentDim,
    accentText: C.accentText,
    accentBorder: C.accent + '44',
    label: '?',
    obfChip: 'detecting…',
    headerBg: C.bg1,
    footerBg: C.bg1,
    sidebarBg: C.bg1,
    borderTint: C.border,
    border2Tint: C.border2,
    logInfo: '#8abcf0',
    logOk: '#ffffff',
    logDebug: '#a8a8a8',
    logOrange: C.orange,
    logArrow: '#7a9aba',
    // Neutral palette for the upload/unknown lang — uses the project's
    // main accent (purple) for keywords and shares the terminal-aligned
    // string/number/builtin/comment tones with the JS/PY themes.
    codeKeyword: '#c4a7f7',     // C.accentText (project main accent)
    codeString:  '#a3c982',
    codeNumber:  '#e0a55a',
    codeIdent:   '#dcdcdc',
    codeWarn:    '#e07070',
    codeComment: '#6a8060',
    codeFn:      '#dab852',
    codeBuiltin: '#4ec9b0',
    codePunct:   '#9a9a9a',
    codeRegex:   '#d966a8',
    codeProp:    '#c8c8c8',
    statusAccent: C.accentText,
  };
}

// ─── severity helpers ─────────────────────────────────────────────────────────
export function sevColor(sev) {
  return { high: C.red, med: C.orange, low: C.textDim }[sev] || C.textDim;
}
export function sevBg(sev) {
  return { high: C.redDim, med: C.orangeDim, low: '#1e1e1e' }[sev] || '#1e1e1e';
}

// ─── syntax tokeniser ────────────────────────────────────────────────────────
// Token-level highlighter. Tokenises one line of JS / Python source into
// an array of `{ text, color }` segments suitable for rendering as a row
// of <span>s — IDE-style colouring (à la VS Code Dark+).
//
// Per-line state only (no support for multi-line strings or block
// comments that span rows). Most obfuscated payloads are single-line
// anyway, and the cost of stateful tokenising every render is not worth
// the marginal accuracy gain.

const KW_JS = new Set([
  'async','await','function','return','const','let','var','if','else','new',
  'this','typeof','instanceof','class','extends','super','import','from','export',
  'default','try','catch','finally','throw','switch','case','break','continue',
  'for','while','do','of','in','delete','void','yield','null','undefined','true',
  'false','static','public','private','protected',
]);
const KW_PY = new Set([
  'def','class','import','from','as','lambda','None','True','False','self','cls',
  'elif','if','else','try','except','finally','with','raise','yield','in','not',
  'and','or','pass','return','for','while','break','continue','global','nonlocal',
  'assert','del','is','async','await',
]);
const BUILTIN_JS = new Set([
  'console','window','document','globalThis','Math','JSON','Array','Object',
  'String','Number','Boolean','Promise','Symbol','Set','Map','WeakMap','WeakSet',
  'Date','Error','RegExp','fetch','eval','atob','btoa','parseInt','parseFloat',
  'isNaN','isFinite','Function','navigator','location','localStorage',
  'sessionStorage','setTimeout','setInterval','clearTimeout','clearInterval',
  'XMLHttpRequest','Buffer','require','module','exports','process',
]);
const BUILTIN_PY = new Set([
  'print','range','len','int','str','bytes','bytearray','dict','list','tuple',
  'set','frozenset','open','isinstance','issubclass','type','exec','eval',
  'globals','locals','__import__','marshal','base64','zlib','lzma','codecs',
  'getattr','setattr','hasattr','dir','vars','hex','oct','bin','ord','chr','abs',
  'min','max','sum','sorted','reversed','enumerate','zip','map','filter','any',
  'all','iter','next','repr','format','compile','input','staticmethod','classmethod',
  'property','super','object','Exception','ValueError','TypeError','KeyError',
  'IndexError','AttributeError','RuntimeError',
]);

function tokenizeLine(line, isJs, kw, builtin, lt) {
  const out = [];
  const len = line.length;
  let i = 0;

  const push = (text, color) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.color === color) last.text += text;
    else out.push({ text, color });
  };

  const canRegexFollow = () => {
    // walk backwards through `out` to find the last non-whitespace char
    for (let k = out.length - 1; k >= 0; k--) {
      const t = out[k].text;
      for (let p = t.length - 1; p >= 0; p--) {
        const c = t[p];
        if (c === ' ' || c === '\t') continue;
        // identifier / closing bracket / number → division, not regex
        return !/[A-Za-z0-9_$)\]]/.test(c);
      }
    }
    return true; // start of line
  };

  while (i < len) {
    const c = line[i];
    const c2 = line[i + 1] || '';

    // whitespace passthrough
    if (c === ' ' || c === '\t') {
      let j = i;
      while (j < len && (line[j] === ' ' || line[j] === '\t')) j++;
      push(line.slice(i, j), lt.codeIdent);
      i = j;
      continue;
    }

    // line comments
    if (isJs && c === '/' && c2 === '/') {
      push(line.slice(i), lt.codeComment);
      i = len;
      continue;
    }
    if (!isJs && c === '#') {
      push(line.slice(i), lt.codeComment);
      i = len;
      continue;
    }

    // inline /* … */ (JS only)
    if (isJs && c === '/' && c2 === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end >= 0) {
        push(line.slice(i, end + 2), lt.codeComment);
        i = end + 2;
      } else {
        push(line.slice(i), lt.codeComment);
        i = len;
      }
      continue;
    }

    // string literals — `, ", '
    if (c === '"' || c === "'" || (isJs && c === '`')) {
      const q = c;
      let j = i + 1;
      while (j < len) {
        if (line[j] === '\\' && j + 1 < len) { j += 2; continue; }
        if (line[j] === q) { j++; break; }
        j++;
      }
      push(line.slice(i, j), lt.codeString);
      i = j;
      continue;
    }

    // python r"…" / b"…" / f"…" prefixes (single-char prefix recognized)
    if (!isJs && /[rRbBfFuU]/.test(c) && (c2 === '"' || c2 === "'")) {
      const q = c2;
      let j = i + 2;
      while (j < len) {
        if (line[j] === '\\' && j + 1 < len) { j += 2; continue; }
        if (line[j] === q) { j++; break; }
        j++;
      }
      push(line.slice(i, j), lt.codeString);
      i = j;
      continue;
    }

    // numbers — 0x.., 0b.., 0o.., decimals, exponents
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(c2))) {
      let j = i;
      if (c === '0' && /[xXbBoO]/.test(c2)) {
        j += 2;
        while (j < len && /[0-9a-fA-F_]/.test(line[j])) j++;
      } else {
        while (j < len && /[0-9._]/.test(line[j])) j++;
        if (j < len && /[eE]/.test(line[j])) {
          j++;
          if (line[j] === '+' || line[j] === '-') j++;
          while (j < len && /[0-9_]/.test(line[j])) j++;
        }
        if (j < len && /[nLjJ]/.test(line[j])) j++; // BigInt / complex suffix
      }
      push(line.slice(i, j), lt.codeNumber);
      i = j;
      continue;
    }

    // regex literal (JS only). Heuristic: only after operator / start of line.
    if (isJs && c === '/' && canRegexFollow()) {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < len) {
        const cj = line[j];
        if (cj === '\\' && j + 1 < len) { j += 2; continue; }
        if (cj === '[') { inClass = true; j++; continue; }
        if (cj === ']') { inClass = false; j++; continue; }
        if (cj === '/' && !inClass) { j++; ok = true; break; }
        j++;
      }
      if (ok) {
        while (j < len && /[gimsuy]/.test(line[j])) j++;
        push(line.slice(i, j), lt.codeRegex);
        i = j;
        continue;
      }
    }

    // dot-property access: `.identifier`
    if (c === '.' && /[A-Za-z_$]/.test(c2)) {
      push('.', lt.codePunct);
      let j = i + 1;
      while (j < len && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i + 1, j);
      // call sites get the function colour; otherwise plain property
      const color = line[j] === '(' ? lt.codeFn : (lt.codeProp || lt.codeIdent);
      push(word, color);
      i = j;
      continue;
    }

    // identifiers / keywords / builtins
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < len && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let color;
      if (kw.has(word)) color = lt.codeKeyword;
      else if (builtin.has(word)) color = lt.codeBuiltin || lt.codeKeyword;
      else if (line[j] === '(') color = lt.codeFn || lt.codeIdent;
      else color = lt.codeIdent;
      push(word, color);
      i = j;
      continue;
    }

    // punctuation / operators — group consecutive ones for nicer DOM
    let j = i;
    while (j < len && /[+\-*/%=<>!&|^~?:;,()\[\]{}@]/.test(line[j])) j++;
    if (j > i) {
      push(line.slice(i, j), lt.codePunct || lt.codeIdent);
      i = j;
      continue;
    }

    // fallback: single char
    push(c, lt.codeIdent);
    i++;
  }

  return out;
}

/**
 * Tokenise one line. Returns an array of `{ text, color }` segments.
 * `lang` accepts `'js' | 'py'` (anything else is treated as JS).
 * `lt` is the language-theme object from `getLangTheme(lang)`.
 */
export function tokenize(line, lang, lt) {
  if (!line) return [];
  const theme = lt || getLangTheme(lang);
  const isJs = lang !== 'py';
  const trimmed = line.trimStart();

  // Whole-line shortcut: comment continuations of a /* … */ block
  if (isJs && /^\s*\*/.test(line)) {
    return [{ text: line, color: theme.codeComment }];
  }
  // Soft warning glyph
  if (/⚠/.test(trimmed)) {
    return [{ text: line, color: theme.codeWarn }];
  }
  const kw = isJs ? KW_JS : KW_PY;
  const builtin = isJs ? BUILTIN_JS : BUILTIN_PY;
  return tokenizeLine(line, isJs, kw, builtin, theme);
}

// Legacy single-colour fallback (kept so any straggling caller still works).
export function colorize(line, lang) {
  const lt = getLangTheme(lang);
  if (!line) return lt.codeIdent;
  if (/⚠/.test(line)) return lt.codeWarn;
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || (lang === 'py' && trimmed.startsWith('#'))) {
    return lt.codeComment;
  }
  return lt.codeIdent;
}
