// Line-level diff used by the split-diff view in ResultsState.
//
// Returns an ordered list of rows describing how the two texts line up:
//
//   { kind: 'eq'|'del'|'add', leftLn, leftText, rightLn, rightText }
//
// `leftLn` is set on rows that have an original-side line, `rightLn` on
// rows that have a cleaned-side line. Either may be `null` (a "pad"
// row used so the opposite-side change stays visually aligned).
//
// Strategy:
//   1. Normalise line endings, strip common prefix/suffix lines.
//   2. Run an LCS DP over the middle slice to produce a minimal-edit
//      pairing. Cells are capped at MAX_LCS_CELLS to keep memory bounded
//      on pathological inputs; beyond that we fall back to "every middle
//      line on the left is a delete, every middle line on the right is
//      an add" which still renders something useful.
//
// Both texts are treated as plain UTF-8 strings — no diff hunks or
// header parsing is done here. The caller is expected to pass raw
// `original_code` / `clean_code` from the backend.

const MAX_LCS_CELLS = 1_500_000;

function splitLines(text) {
  if (!text) return [];
  return text.replace(/\r\n?/g, '\n').split('\n');
}

export function splitLineDiff(originalText, cleanText) {
  const a = splitLines(originalText);
  const b = splitLines(cleanText);
  const rows = [];

  // common prefix
  let head = 0;
  const maxHead = Math.min(a.length, b.length);
  while (head < maxHead && a[head] === b[head]) head++;

  // common suffix (must not eat into the prefix on either side)
  let tailA = a.length;
  let tailB = b.length;
  while (tailA > head && tailB > head && a[tailA - 1] === b[tailB - 1]) {
    tailA--;
    tailB--;
  }

  for (let k = 0; k < head; k++) {
    rows.push({
      kind: 'eq',
      leftLn: k + 1, leftText: a[k],
      rightLn: k + 1, rightText: b[k],
    });
  }

  const midA = a.slice(head, tailA);
  const midB = b.slice(head, tailB);

  if (midA.length * midB.length <= MAX_LCS_CELLS) {
    appendLcs(rows, midA, midB, head, head);
  } else {
    // Pathological size — bail to a simple delete-all / add-all pairing.
    for (let k = 0; k < midA.length; k++) {
      rows.push({
        kind: 'del',
        leftLn: head + k + 1, leftText: midA[k],
        rightLn: null, rightText: '',
      });
    }
    for (let k = 0; k < midB.length; k++) {
      rows.push({
        kind: 'add',
        leftLn: null, leftText: '',
        rightLn: head + k + 1, rightText: midB[k],
      });
    }
  }

  const suffixLen = a.length - tailA;
  for (let k = 0; k < suffixLen; k++) {
    rows.push({
      kind: 'eq',
      leftLn: tailA + k + 1, leftText: a[tailA + k],
      rightLn: tailB + k + 1, rightText: b[tailB + k],
    });
  }

  return rows;
}

function appendLcs(rows, a, b, offsetA, offsetB) {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return;
  if (n === 0) {
    for (let j = 0; j < m; j++) {
      rows.push({
        kind: 'add',
        leftLn: null, leftText: '',
        rightLn: offsetB + j + 1, rightText: b[j],
      });
    }
    return;
  }
  if (m === 0) {
    for (let i = 0; i < n; i++) {
      rows.push({
        kind: 'del',
        leftLn: offsetA + i + 1, leftText: a[i],
        rightLn: null, rightText: '',
      });
    }
    return;
  }

  // dp[i][j] = LCS length of a[i:] vs b[j:]. Filled bottom-up so the
  // reconstruction walk that follows can read forwards.
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i];
    const next = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        row[j] = next[j + 1] + 1;
      } else {
        const down = next[j];
        const right = row[j + 1];
        row[j] = down > right ? down : right;
      }
    }
  }

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({
        kind: 'eq',
        leftLn: offsetA + i + 1, leftText: a[i],
        rightLn: offsetB + j + 1, rightText: b[j],
      });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        kind: 'del',
        leftLn: offsetA + i + 1, leftText: a[i],
        rightLn: null, rightText: '',
      });
      i++;
    } else {
      rows.push({
        kind: 'add',
        leftLn: null, leftText: '',
        rightLn: offsetB + j + 1, rightText: b[j],
      });
      j++;
    }
  }
  while (i < n) {
    rows.push({
      kind: 'del',
      leftLn: offsetA + i + 1, leftText: a[i],
      rightLn: null, rightText: '',
    });
    i++;
  }
  while (j < m) {
    rows.push({
      kind: 'add',
      leftLn: null, leftText: '',
      rightLn: offsetB + j + 1, rightText: b[j],
    });
    j++;
  }
}
