---
name: agentic-hedge-fund-yield-monitor
description: Monitor an active SaucerSwap V1 or V2 yield farming position for impermanent loss and exit automatically when IL exceeds the threshold. Reads position state from the audit log written by agentic-hedge-fund-yield-entry; requires no position parameters from the caller. Use when executing Flow 4 monitoring of the hedge fund ("yield farming lifecycle"), when running on a schedule to watch an open LP position, or when an agent wants to check IL and exit if needed.
---

# Agentic Hedge Fund — Yield Farming Monitor (Flow 4, Part 2)

A four-phase workflow that reads an open position from the audit log, observes current pool state, computes impermanent loss, logs a snapshot, and executes a full exit if IL ≥ threshold. Designed to be invoked periodically (e.g. every 15 minutes via a scheduler).

## Core rules

1. **Every `hcli` invocation MUST end with `--format json`.**
2. **Position state comes from the audit log** — the skill reads the latest `position-entered` entry for the given `pair` + `network` that does not yet have a matching `position-exited` entry. If none is found, abort with `no-open-position`.
3. **IL formula:** `ilPercent = 1 - 2√r / (1 + r)` where `r = currentPrice / entryPrice`. Computed by `scripts/il-calculator.mjs`.
4. **Full exit only** — no partial withdrawals.
5. **V2 decrease-liquidity bundles collect internally** — one call suffices for full V2 exit. No separate `collect-fees` needed.
6. **`--dry-run` flag** — skip the exit even if IL ≥ threshold; append a `withdrawal-recommended` entry instead. Use for monitoring without execution.
7. **Every phase outcome is appended to the audit log** regardless of whether an exit occurs.

## Caller-supplied inputs

| Input          | Required | Notes                                                                   |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `api-key`      | yes      | SaucerSwap REST API key                                                 |
| `token-a`      | yes      | First token of the pair (ID or alias) — used to look up audit log entry |
| `token-b`      | yes      | Second token of the pair                                                |
| `il-threshold` | no       | Exit trigger, e.g. `0.05` = 5%. Default `0.05`                          |
| `slippage`     | no       | %, default `2.0` (applied to the withdrawal)                            |
| `unwrap-hbar`  | no       | V2 only — unwrap WHBAR on exit. Default `false`                         |
| `dry-run`      | no       | If set, compute and log IL but do not execute withdrawal                |

The operator is always read from hcli state.

## Workflow checklist

Every `hcli` command must include `--format json`.

### Phase 1 — Setup

1. `hcli network list --format json` — confirm network.
2. `hcli network get-operator --format json` — cache `operatorAccountId`.
3. Read audit log — `scripts/audit-log.mjs read-snapshot` with `pair` = `$TA/$TB`, `network` = active network, `phase` = `position-entered`. Also check there is no matching `position-exited` entry for the same pair. Abort with `no-open-position` if none found.
4. Cache from the `position-entered` entry: `protocol`, `poolContractId`, `feeTier` (V2), `entryPriceAinB`, `lpTokenId` + `lpBalance` (V1) or `positionSerial` + `positionLiquidity` (V2), `tickLower`, `tickUpper` (V2).

### Phase 2 — Observe current pool state

**V1:**

```
hcli saucerswap-v1 view --api-key "$API_KEY" -a $TA -b $TB --format json
```

Pipe `reserveA`, `reserveB`, `decimalsA`, `decimalsB` into `scripts/implied-price.mjs` → `currentPriceAinB`.

**V2:**

```
hcli saucerswap-v2 view-pool --api-key "$API_KEY" -a $TA -b $TB --fee-tier $FEE_TIER --format json
```

Pipe `sqrtRatioX96`, `tickCurrent`, `decimalsA`, `decimalsB` into `scripts/implied-price.mjs` → `currentPriceAinB`.

### Phase 3 — IL computation and decision

```bash
echo '{
  "entryPriceAinB": "'$ENTRY_PRICE'",
  "currentPriceAinB": "'$CURRENT_PRICE'",
  "tickCurrent": '$TICK_CURRENT',
  "tickLower": '$TICK_LOWER',
  "tickUpper": '$TICK_UPPER'
}' | node scripts/il-calculator.mjs
# → { "ilPercent": "0.0312", "priceRatio": "0.94", "outOfRange": false }
```

Append a `monitor-snapshot` audit entry with `ilPercent`, `currentPriceAinB`, `outOfRange` (V2 only).

- If `ilPercent < ilThreshold` AND position is in-range (or V1): **done**. Log and exit.
- If `--dry-run` is set: append `withdrawal-recommended` entry and **stop**.
- Otherwise: proceed to phase 4.

### Phase 4 — Exit

**V1 — read current LP balance, then withdraw:**

```
hcli account balance -a $OP --format json
# → filter tokens[] for lpTokenId to get current lpBalance
hcli saucerswap-v1 withdraw --token-a $TA --token-b $TB \
  --liquidity $LP_BALANCE --slippage $SLIPPAGE --format json
```

**V2 — read current position liquidity, then fully exit:**

```
hcli saucerswap-v2 list-positions --api-key "$API_KEY" --account $OP --format json
# → filter positions[] for tokenSN = positionSerial to get current liquidity
hcli saucerswap-v2 decrease-liquidity --position $POSITION_SERIAL \
  --liquidity $CURRENT_LIQUIDITY --burn [--unwrap-hbar] --slippage $SLIPPAGE --format json
```

Capture `transactionId`. Append a `position-exited` audit entry (see REFERENCE.md §4). On failure, append `error` entry and abort.

## Error handling

See [REFERENCE.md](REFERENCE.md) for the full error table.

- `no-open-position` → no unmatched `position-entered` entry found; surface and abort.
- `outOfRange: true` (V2) → position is single-sided; IL formula may understate actual loss. The skill still applies the threshold and exits if `ilPercent ≥ ilThreshold`.
- `NetworkError` → exponential backoff `1s → 2s → 4s`, ≤ 3 attempts.
- Any withdrawal failure → append error, surface to caller; position remains open.

## More

- IL formula, audit log schema, error table: [REFERENCE.md](REFERENCE.md)
- [`references/saucerswap-v1.md`](references/saucerswap-v1.md) — `view`, `withdraw`
- [`references/saucerswap-v2.md`](references/saucerswap-v2.md) — `view-pool`, `list-positions`, `decrease-liquidity`
- [`references/account.md`](references/account.md) — `balance`
- [`references/network.md`](references/network.md) — `list`, `get-operator`
