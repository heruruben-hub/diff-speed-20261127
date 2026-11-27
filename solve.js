// A faster drop-in for makefun-diff 1.0.0: run(input) returns exactly the patch
// makefun-diff returns for { old, new }, as one JSON string. Written from the
// rule in the competition's RULES.txt (lines split only on "\n"; common prefix
// then common suffix trimmed; Myers greedy search with deletion preferred over
// insertion on ties, no move past either text's end, no edge-diagonal pruning,
// every run of equal lines followed; first path to both ends wins; hunks show
// up to 3 kept lines around each change run, runs at most 6 kept lines apart
// share a hunk, deletions before insertions; a line with no trailing newline
// is written with one and followed by a "%" line; identical texts are the
// header line alone).
//
// Speed comes from: lines are interned to small integers once per case, so
// every line comparison in the search is one integer comparison; the Myers
// search keeps its diagonals in typed arrays (one row per edit count, kept
// for the backtrack) instead of allocating a linked path object per step;
// and the patch is rendered from the backtracked runs with plain string
// building. No per-case state is kept across cases: each run() call builds
// its own intern table.

const KEEP = 0;
const DELETE = 1;
const INSERT = 2;

/** A text's lines, each with its "\n" except a last line that has none. */
function linesOf(text) {
  const parts = text.split('\n');
  const last = parts.length - 1;
  const lines = new Array(last);
  for (let i = 0; i < last; i++) lines[i] = parts[i] + '\n';
  if (parts[last] !== '') lines.push(parts[last]);
  return lines;
}

/** Small integer ids for lines, equal lines sharing one id. */
function idsOf(lines, table) {
  const ids = new Int32Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let id = table.get(line);
    if (id === undefined) {
      id = table.size;
      table.set(line, id);
    }
    ids[i] = id;
  }
  return ids;
}

/**
 * The edit script of the middle (after prefix/suffix trimming) as runs
 * [{ kind, count }] in order, by Myers's greedy search with the rule above.
 * Rows of furthest-reached old-line counts are kept, one per edit count, so
 * the winning path can be walked back exactly: at each step the predecessor
 * is recomputed with the same rule the forward search used.
 */
function myersRuns(a, b) {
  const n = a.length;
  const m = b.length;
  // d = 0: the snake from the start.
  let x = 0;
  let y = 0;
  while (x < n && y < m && a[x] === b[y]) {
    x++;
    y++;
  }
  const rows = [new Int32Array([x])];
  if (x >= n && y >= m) return [];
  const maxEdit = n + m;
  // Only the diagonal k* = n - m can reach both ends (there X = n and
  // Y = X - k* = m), so the finish is checked once per row, not per step.
  const kStar = n - m;
  const absKStar = kStar < 0 ? -kStar : kStar;
  let df = -1;
  for (let d = 1; d <= maxEdit; d++) {
    const prev = rows[d - 1];
    const cur = new Int32Array(d + 1);
    rows[d] = cur;
    let k = -d;
    let xpD = -1;
    for (let j = 0; j <= d; j++, k += 2) {
      const xpI = j < d ? prev[j] : -1;
      const byDel = xpD >= 0 && xpD < n ? xpD + 1 : -2;
      const byIns = xpI >= 0 && xpI - k <= m ? xpI : -2;
      const X0 = byDel >= byIns ? byDel : byIns;
      if (X0 >= 0) {
        let X = X0;
        let Y = X - k;
        while (X < n && Y < m && a[X] === b[Y]) {
          X++;
          Y++;
        }
        cur[j] = X;
      } else {
        cur[j] = -1;
      }
      xpD = xpI;
    }
    if (d >= absKStar && ((d - kStar) & 1) === 0 && cur[(kStar + d) >> 1] === n) {
      df = d;
      break;
    }
  }
  if (df < 0) throw new Error('diff: the search ended without reaching both ends');
  const kf = kStar;

  // Walk the winning path back, collecting runs in reverse.
  const rev = [];
  const push = (kind, count) => {
    const last = rev[rev.length - 1];
    if (last !== undefined && last.kind === kind) last.count += count;
    else rev.push({ kind, count });
  };
  let X = n;
  let k = kf;
  for (let d = df; d >= 1; d--) {
    const prev = rows[d - 1];
    const j = (k + d) / 2;
    let byDel = -2;
    let byIns = -2;
    let xpDel = -1;
    let xpIns = -1;
    if (j > 0) {
      const xp = prev[j - 1];
      if (xp >= 0 && xp < n) {
        byDel = xp + 1;
        xpDel = xp;
      }
    }
    if (j < d) {
      const xp = prev[j];
      if (xp >= 0 && xp - k <= m) {
        byIns = xp;
        xpIns = xp;
      }
    }
    const isDel = byDel >= byIns;
    const xPre = isDel ? byDel : byIns;
    const snake = X - xPre;
    if (snake > 0) push(KEEP, snake);
    if (isDel) {
      push(DELETE, 1);
      X = xpDel;
      k = k - 1;
    } else {
      push(INSERT, 1);
      X = xpIns;
      k = k + 1;
    }
  }
  if (X > 0) push(KEEP, X);
  rev.reverse();
  return rev;
}

/** makefun-diff 1.0.0's answer for one case's input { old, new }. */
export function run(input) {
  if (input === null || typeof input !== 'object' || typeof input.old !== 'string' || typeof input.new !== 'string') {
    throw new TypeError('diff: the input is { old, new }, two strings');
  }
  const a = linesOf(input.old);
  const b = linesOf(input.new);
  const n = a.length;
  const m = b.length;
  const table = new Map();
  const ai = idsOf(a, table);
  const bi = idsOf(b, table);

  // The common prefix, then the common suffix of what is left.
  let prefix = 0;
  while (prefix < n && prefix < m && ai[prefix] === bi[prefix]) prefix++;
  let suffix = 0;
  while (suffix < n - prefix && suffix < m - prefix && ai[n - 1 - suffix] === bi[m - 1 - suffix]) suffix++;
  const runs = [];
  if (prefix > 0) runs.push({ kind: KEEP, count: prefix });
  const middle = myersRuns(ai.subarray(prefix, n - suffix), bi.subarray(prefix, m - suffix));
  for (const r of middle) runs.push(r);
  if (suffix > 0) runs.push({ kind: KEEP, count: suffix });

  // The change runs: each a stretch of deletions and insertions between two
  // kept lines, at old line o and new line p.
  const changes = [];
  let o = 0;
  let p = 0;
  let deleted = 0;
  let inserted = 0;
  for (const r of runs) {
    if (r.kind === KEEP) {
      o += r.count;
      p += r.count;
      continue;
    }
    let c = changes[changes.length - 1];
    if (c === undefined || c.o + c.dels !== o || c.p + c.ins !== p) {
      c = { o, p, dels: 0, ins: 0 };
      changes.push(c);
    }
    if (r.kind === DELETE) {
      c.dels += r.count;
      o += r.count;
      deleted += r.count;
    } else {
      c.ins += r.count;
      p += r.count;
      inserted += r.count;
    }
  }

  // The hunks: change runs at most 6 kept lines apart share one.
  const hunks = [];
  for (const c of changes) {
    const h = hunks[hunks.length - 1];
    const prev = h !== undefined ? h[h.length - 1] : undefined;
    if (prev !== undefined && c.o - (prev.o + prev.dels) <= 6) h.push(c);
    else hunks.push([c]);
  }

  const out = [`makefun-diff/1 old=${n} new=${m} hunks=${hunks.length} deleted=${deleted} inserted=${inserted}\n`];
  // The op and the line go in as separate join parts, so no per-line
  // concatenation happens; only a last line without a newline needs its
  // extra "%" line.
  const aBare = n > 0 && !a[n - 1].endsWith('\n');
  const bBare = m > 0 && !b[m - 1].endsWith('\n');
  for (const h of hunks) {
    const first = h[0];
    const last = h[h.length - 1];
    const oldStart = Math.max(0, first.o - 3);
    const newStart = first.p - (first.o - oldStart);
    const after = Math.min(3, n - (last.o + last.dels));
    const oldEnd = last.o + last.dels + after;
    const newEnd = last.p + last.ins + after;
    out.push(`@ ${oldStart + 1} ${oldEnd - oldStart} ${newStart + 1} ${newEnd - newStart}\n`);
    let at = oldStart;
    for (const c of h) {
      for (; at < c.o; at++) {
        out.push('=', a[at]);
        if (at === n - 1 && aBare) out.push('\n%\n');
      }
      for (let i = 0; i < c.dels; i++) {
        out.push('-', a[c.o + i]);
        if (c.o + i === n - 1 && aBare) out.push('\n%\n');
      }
      for (let i = 0; i < c.ins; i++) {
        out.push('+', b[c.p + i]);
        if (c.p + i === m - 1 && bBare) out.push('\n%\n');
      }
      at = c.o + c.dels;
    }
    for (; at < oldEnd; at++) {
      out.push('=', a[at]);
      if (at === n - 1 && aBare) out.push('\n%\n');
    }
  }
  return out.join('');
}
