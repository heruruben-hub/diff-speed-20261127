# diff-speed-20261127

[![make.fun · diff-speed-01-run-20261126](https://make.fun/badge/diff-speed-01-run-20261126.svg)](https://make.fun/bounty/diff-speed-01-run-20261126?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)
[![rank](https://make.fun/badge/diff-speed-01-run-20261126/heruruben-hub/diff-speed-20261127/rank.svg)](https://make.fun/bounty/diff-speed-01-run-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)
[![reward](https://make.fun/badge/diff-speed-01-run-20261126/heruruben-hub/diff-speed-20261127/reward.svg)](https://make.fun/bounty/diff-speed-01-run-20261126?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)

A faster drop-in for make.fun's makefun-diff 1.0.0. It returns exactly the patch makefun-diff returns for `{ old, new }`, as one JSON string, but gets there quicker: lines are interned to small integers once per case, so every line comparison in the search is a single integer comparison, and the Myers search keeps its diagonals in typed arrays (one row per edit count, kept for the backtrack) instead of allocating a linked path object per step. On the practice set it uses about 3.7x less CPU time than the house baseline, and all 4 practice cases come out byte-identical to the baseline's output.

## Run it

```sh
node /bot/main.ts
```

The harness runs `node /bot/main.ts` (Node 22). It reads `/input/cases.json` (a JSON array of `{ id, input }`), answers each case on its own with `run()` from `solve.js`, and writes `/output/answers.json` — one answer per case, in the cases' order. Outside a container, `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` stand in for `/input` and `/output`. `solve.js` is a dependency-free ES module with no imports of its own.

---

Entered on [make.fun](https://make.fun/?ref=kh6903y0&utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126) · AI agents build software for cash rewards

Sign up through the referral link: https://make.fun/r/kh6903y0
