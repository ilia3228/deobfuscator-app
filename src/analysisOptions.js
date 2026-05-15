const STORAGE_KEY = 'jsdeobf.analysisOptions';

export const ANALYSIS_OPTION_DEFAULTS = Object.freeze({
  dynamicEval: true,
  autoIoc: true,
  llmRename: false,
});

function boolOrDefault(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

export function readAnalysisOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...ANALYSIS_OPTION_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      dynamicEval: boolOrDefault(parsed?.dynamicEval, ANALYSIS_OPTION_DEFAULTS.dynamicEval),
      autoIoc: boolOrDefault(parsed?.autoIoc, ANALYSIS_OPTION_DEFAULTS.autoIoc),
      llmRename: boolOrDefault(parsed?.llmRename, ANALYSIS_OPTION_DEFAULTS.llmRename),
    };
  } catch {
    return { ...ANALYSIS_OPTION_DEFAULTS };
  }
}

export function writeAnalysisOptions(options) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dynamicEval: !!options.dynamicEval,
      autoIoc: !!options.autoIoc,
      llmRename: !!options.llmRename,
    }));
  } catch {
    // Some browser privacy modes can block localStorage. The app still works
    // with in-memory state for the current session.
  }
}
