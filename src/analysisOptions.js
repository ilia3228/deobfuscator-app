// Per-run analysis options persisted to localStorage. The schema is
// versioned because v1 only had a boolean `llmRename` toggle but the
// backend (after PR1 of the options-settings overhaul) accepts a
// four-way `llmMode` — `off | rename | format | both`. We migrate v1
// users on read so their old prefs survive the upgrade.

const STORAGE_KEY = 'jsdeobf.analysisOptions';
const SCHEMA_VERSION = 2;

export const LLM_MODES = Object.freeze(['off', 'rename', 'format', 'both']);

export const ANALYSIS_OPTION_DEFAULTS = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  llmMode: 'off',
  dynamicEval: true,
  autoIoc: true,
  staticAnalysis: true,
  rename: true,
  verbose: true,
  maxLayers: null,   // null → backend default (js: 100, py: 500)
  timeout: null,     // null → backend default (js: 30s, py: 120s)
});

function boolOrDefault(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function modeOrDefault(value, fallback) {
  return LLM_MODES.includes(value) ? value : fallback;
}

function intOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function migrateV1(parsed) {
  // v1 carried only `dynamicEval`, `autoIoc`, `llmRename`. Map a truthy
  // `llmRename` to `llmMode='both'` so users who previously enabled the
  // single LLM toggle stay on the same effective behaviour.
  return {
    schemaVersion: SCHEMA_VERSION,
    llmMode: parsed?.llmRename ? 'both' : 'off',
    dynamicEval: boolOrDefault(parsed?.dynamicEval, ANALYSIS_OPTION_DEFAULTS.dynamicEval),
    autoIoc: boolOrDefault(parsed?.autoIoc, ANALYSIS_OPTION_DEFAULTS.autoIoc),
    staticAnalysis: ANALYSIS_OPTION_DEFAULTS.staticAnalysis,
    rename: ANALYSIS_OPTION_DEFAULTS.rename,
    verbose: ANALYSIS_OPTION_DEFAULTS.verbose,
    maxLayers: ANALYSIS_OPTION_DEFAULTS.maxLayers,
    timeout: ANALYSIS_OPTION_DEFAULTS.timeout,
  };
}

export function readAnalysisOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...ANALYSIS_OPTION_DEFAULTS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...ANALYSIS_OPTION_DEFAULTS };
    }
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      // v1 (no schemaVersion field) → upgrade.
      return migrateV1(parsed);
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      llmMode: modeOrDefault(parsed.llmMode, ANALYSIS_OPTION_DEFAULTS.llmMode),
      dynamicEval: boolOrDefault(parsed.dynamicEval, ANALYSIS_OPTION_DEFAULTS.dynamicEval),
      autoIoc: boolOrDefault(parsed.autoIoc, ANALYSIS_OPTION_DEFAULTS.autoIoc),
      staticAnalysis: boolOrDefault(parsed.staticAnalysis, ANALYSIS_OPTION_DEFAULTS.staticAnalysis),
      rename: boolOrDefault(parsed.rename, ANALYSIS_OPTION_DEFAULTS.rename),
      verbose: boolOrDefault(parsed.verbose, ANALYSIS_OPTION_DEFAULTS.verbose),
      maxLayers: intOrNull(parsed.maxLayers),
      timeout: intOrNull(parsed.timeout),
    };
  } catch {
    return { ...ANALYSIS_OPTION_DEFAULTS };
  }
}

export function writeAnalysisOptions(options) {
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      llmMode: modeOrDefault(options?.llmMode, ANALYSIS_OPTION_DEFAULTS.llmMode),
      dynamicEval: !!options?.dynamicEval,
      autoIoc: !!options?.autoIoc,
      staticAnalysis: options?.staticAnalysis !== false,
      rename: options?.rename !== false,
      verbose: options?.verbose !== false,
      maxLayers: intOrNull(options?.maxLayers),
      timeout: intOrNull(options?.timeout),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Some browser privacy modes can block localStorage. The app still works
    // with in-memory state for the current session.
  }
}
