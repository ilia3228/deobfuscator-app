// Reconstruct the list of detected layers from the live log stream.
// Used by AnalyzingState (sidebar) and ErrorState (meta row).
//
// Each layer in the returned list has the shape:
//   { num: 1, total: 3, name: 'javascript-obfuscator', status: 'done' | 'running' }
//
// The parser is tolerant: empty / malformed logs simply produce no layers.
export function parseLayers(logs = []) {
  const layers = [];
  let current = null;
  for (const l of logs) {
    if (!l || !l.text) continue;
    const layerHeader = /Layer (\d+)\/(\d+)/.exec(l.text);
    if (layerHeader) {
      current = {
        num: Number(layerHeader[1]),
        total: Number(layerHeader[2]),
        name: null,
        status: 'running',
      };
      layers.push(current);
      continue;
    }
    if (!current) continue;
    const detected = /Detected:\s*(.+?)\s*$/.exec(l.text);
    if (detected && !current.name) {
      current.name = detected[1];
      continue;
    }
    if (l.level === 'OK' && /Static analysis/.test(l.text)) {
      current.status = 'done';
    }
  }
  return layers;
}

// Convenience: last non-empty log entry, or null.
export function lastNonEmpty(logs = []) {
  for (let i = logs.length - 1; i >= 0; i--) {
    const t = logs[i]?.text?.trim();
    if (t) return logs[i];
  }
  return null;
}
