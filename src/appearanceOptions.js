// UI appearance preferences persisted locally. These settings are purely
// client-side: they affect the shell/editor presentation and do not change
// analysis output or backend state.

const STORAGE_KEY = 'jsdeobf.appearanceOptions';
const SCHEMA_VERSION = 1;

export const ACCENT_PRESETS = Object.freeze([
  { id: 'purple', label: 'Purple', accent: '#9d6ef0', accentText: '#c6a8ff', accentDim: 'rgba(157,110,240,.14)' },
  { id: 'orange', label: 'Orange', accent: '#dc8a3f', accentText: '#f0a76a', accentDim: 'rgba(220,138,63,.14)' },
  { id: 'blue',   label: 'Blue',   accent: '#5b9fd4', accentText: '#9fcbef', accentDim: 'rgba(91,159,212,.14)' },
  { id: 'gold',   label: 'Gold',   accent: '#c9a742', accentText: '#ead07d', accentDim: 'rgba(201,167,66,.14)' },
  { id: 'mint',   label: 'Mint',   accent: '#4ec9b0', accentText: '#8ee6d5', accentDim: 'rgba(78,201,176,.14)' },
  { id: 'rose',   label: 'Rose',   accent: '#d966a8', accentText: '#f0a6ce', accentDim: 'rgba(217,102,168,.14)' },
]);

export const MONO_FONTS = Object.freeze([
  { id: 'geist', label: 'Geist Mono', css: "'Geist Mono', Consolas, monospace" },
  { id: 'jetbrains', label: 'JetBrains Mono', css: "'JetBrains Mono', 'Geist Mono', Consolas, monospace" },
  { id: 'consolas', label: 'Consolas', css: "Consolas, 'Geist Mono', monospace" },
  { id: 'system', label: 'System mono', css: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
]);

export const APPEARANCE_DEFAULTS = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  theme: 'terminal',
  accent: 'purple',
  jsAccent: 'orange',
  pyAccent: 'blue',
  uiScale: 1.1,
  monoFont: 'geist',
  editorFontSize: 12.5,
  lineNumbers: true,
  iocHighlight: true,
  reduceMotion: false,
});

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function boolOrDefault(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function idOrDefault(items, value, fallback) {
  return items.some((item) => item.id === value) ? value : fallback;
}

export function readAppearanceOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...APPEARANCE_DEFAULTS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...APPEARANCE_DEFAULTS };
    return {
      schemaVersion: SCHEMA_VERSION,
      theme: parsed.theme === 'terminal' ? 'terminal' : APPEARANCE_DEFAULTS.theme,
      accent: idOrDefault(ACCENT_PRESETS, parsed.accent, APPEARANCE_DEFAULTS.accent),
      jsAccent: idOrDefault(ACCENT_PRESETS, parsed.jsAccent, APPEARANCE_DEFAULTS.jsAccent),
      pyAccent: idOrDefault(ACCENT_PRESETS, parsed.pyAccent, APPEARANCE_DEFAULTS.pyAccent),
      uiScale: clampNumber(parsed.uiScale, APPEARANCE_DEFAULTS.uiScale, 0.9, 1.25),
      monoFont: idOrDefault(MONO_FONTS, parsed.monoFont, APPEARANCE_DEFAULTS.monoFont),
      editorFontSize: clampNumber(parsed.editorFontSize, APPEARANCE_DEFAULTS.editorFontSize, 11, 15),
      lineNumbers: boolOrDefault(parsed.lineNumbers, APPEARANCE_DEFAULTS.lineNumbers),
      iocHighlight: boolOrDefault(parsed.iocHighlight, APPEARANCE_DEFAULTS.iocHighlight),
      reduceMotion: boolOrDefault(parsed.reduceMotion, APPEARANCE_DEFAULTS.reduceMotion),
    };
  } catch {
    return { ...APPEARANCE_DEFAULTS };
  }
}

export function writeAppearanceOptions(options) {
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      theme: 'terminal',
      accent: idOrDefault(ACCENT_PRESETS, options?.accent, APPEARANCE_DEFAULTS.accent),
      jsAccent: idOrDefault(ACCENT_PRESETS, options?.jsAccent, APPEARANCE_DEFAULTS.jsAccent),
      pyAccent: idOrDefault(ACCENT_PRESETS, options?.pyAccent, APPEARANCE_DEFAULTS.pyAccent),
      uiScale: clampNumber(options?.uiScale, APPEARANCE_DEFAULTS.uiScale, 0.9, 1.25),
      monoFont: idOrDefault(MONO_FONTS, options?.monoFont, APPEARANCE_DEFAULTS.monoFont),
      editorFontSize: clampNumber(options?.editorFontSize, APPEARANCE_DEFAULTS.editorFontSize, 11, 15),
      lineNumbers: boolOrDefault(options?.lineNumbers, APPEARANCE_DEFAULTS.lineNumbers),
      iocHighlight: boolOrDefault(options?.iocHighlight, APPEARANCE_DEFAULTS.iocHighlight),
      reduceMotion: boolOrDefault(options?.reduceMotion, APPEARANCE_DEFAULTS.reduceMotion),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // App can still run with in-memory settings when localStorage is blocked.
  }
}

export function getAccentPreset(id) {
  return ACCENT_PRESETS.find((preset) => preset.id === id) || ACCENT_PRESETS[0];
}

export function getMonoFont(id) {
  return MONO_FONTS.find((font) => font.id === id) || MONO_FONTS[0];
}

export function applyAccentToTheme(theme, accentId) {
  const preset = getAccentPreset(accentId);
  return {
    ...theme,
    accent: preset.accent,
    accentText: preset.accentText,
    accentDim: preset.accentDim,
    accentBorder: `${preset.accent}44`,
    statusAccent: preset.accent,
    logInfo: preset.accentText,
    logOk: preset.accentText,
    logOrange: preset.accent,
    logArrow: preset.accent,
    codeKeyword: preset.accentText,
  };
}
