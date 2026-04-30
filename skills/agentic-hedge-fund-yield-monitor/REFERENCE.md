# Reference — IL formula, scripts, audit schema, error handling

## 0. Output format

Every `hcli` invocation MUST include `--format json`.

## 1. Per-plugin command reference

| Plugin          | File                                                         | Commands the skill uses                                                           |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `saucerswap-v1` | [`references/saucerswap-v1.md`](references/saucerswap-v1.md) | `view` (phase 2), `withdraw` (phase 4)                                            |
| `saucerswap-v2` | [`references/saucerswap-v2.md`](references/saucerswap-v2.md) | `view-pool` (phase 2), `list-positions` (phase 4), `decrease-liquidity` (phase 4) |
| `account`       | [`references/account.md`](references/account.md)             | `balance` (phase 4)                                                               |
| `network`       | [`references/network.md`](references/network.md)             | `list` (phase 1), `get-operator` (phase 1)                                        |

## 2. Script interfaces

### `scripts/implied-price.mjs`

Auto-detects V1 vs V2 by input field presence. See `agentic-hedge-fund-saucerswap` skill for full docs.

```bash
# V1
echo '{"reserveA":"100000000000","reserveB":"6000000","decimalsA":8,"decimalsB":6}' \
  | node scripts/implied-price.mjs
# → {"priceAinB":"0.06","priceBinA":"16.666..."}

# V2
echo '{"sqrtRatioX96":"...","decimalsA":8,"decimalsB":6}' \
  | node scripts/implied-price.mjs
# → {"priceAinB":"0.054","priceBinA":"18.51..."}
```

### `scripts/il-calculator.mjs`

```bash
echo '{
  "entryPriceAinB":   "0.06",
  "currentPriceAinB": "0.054",
  "tickCurrent": -500,
  "tickLower":   -1000,
  "tickUpper":    1000
}' | node scripts/il-calculator.mjs
# → {"ilPercent":"0.00307","priceRatio":"0.9","outOfRange":false}
```

Input fields `tickCurrent`, `tickLower`, `tickUpper` are optional (V2 only). When absent, `outOfRange` is not included in output.

`ilPercent` is always a positive decimal string. `0.05` = 5% IL.

Formula: `ilPercent = 1 - 2√r / (1 + r)` where `r = currentPrice / entryPrice`.

### `scripts/audit-log.mjs`

```bash
# Read latest open position-entered for a pair
echo '{"path":"./audit/agentic-hedge-fund.jsonl","pair":"HBAR/USDC","network":"testnet","phase":"position-entered"}' \
  | node scripts/audit-log.mjs read-snapshot

# Append a snapshot entry
echo '{"path":"./audit/...","entry":{...}}' | node scripts/audit-log.mjs append
```

The `read-snapshot` subcommand scans from the tail and returns the most recent matching entry, or `null`.

## 3. Audit log — monitor-specific entries

**`monitor-snapshot` entry (every invocation, phase 3):**

```json
{
  "timestamp": "...", "network": "testnet", "phase": "monitor-snapshot",
  "pair": "HBAR/USDC", "protocol": "v1" | "v2",
  "currentPriceAinB": "0.054",
  "entryPriceAinB": "0.06",
  "priceRatio": "0.9",
  "ilPercent": "0.00307",
  "ilThreshold": "0.05",
  "decision": "hold" | "exit" | "dry-run",
  "outOfRange": false
}
```

**`position-exited` entry (phase 4, on successful withdrawal):**

```json
{
  "timestamp": "...", "network": "testnet", "phase": "position-exited",
  "pair": "HBAR/USDC", "protocol": "v1" | "v2",
  "ilPercent": "0.062",
  "transactionId": "...",
  "liquidityRemoved": "50.00000000",
  "balancesAfter": { "hbar": "...", "tokens": [...] }
}
```

**`withdrawal-recommended` entry (when `--dry-run` and IL ≥ threshold):**

```json
{
  "timestamp": "...",
  "network": "testnet",
  "phase": "withdrawal-recommended",
  "pair": "HBAR/USDC",
  "ilPercent": "0.062",
  "ilThreshold": "0.05"
}
```

## 4. audit-log.mjs — extended read-snapshot for open positions

The monitor needs to find a `position-entered` entry with no matching `position-exited`. The standard `read-snapshot` returns the latest entry by phase + pair + network. Run it twice:

```bash
# 1. Get latest position-entered
echo '{"path":"./audit/...","pair":"HBAR/USDC","network":"testnet","phase":"position-entered"}' \
  | node scripts/audit-log.mjs read-snapshot  →  entry or null

# 2. Get latest position-exited
echo '{"path":"./audit/...","pair":"HBAR/USDC","network":"testnet","phase":"position-exited"}' \
  | node scripts/audit-log.mjs read-snapshot  →  entry or null
```

If `position-entered.timestamp > position-exited.timestamp` (or `position-exited` is null), the position is still open. Otherwise, abort with `no-open-position`.

## 5. V2 decrease-liquidity note

`decrease-liquidity` bundles a `collect()` call internally using `MAX_UINT128`, sweeping all unlocked amounts AND previously accrued fees in the same transaction. **Do not call `collect-fees` separately** — it would be a no-op after `decrease-liquidity --burn`.

## 6. Error handling

| Condition                                    | Phase | Behaviour                                                                 |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| `no-open-position`                           | 1     | Abort; no audit entry needed                                              |
| `no-active-liquidity` (V2 null sqrtRatioX96) | 2     | Abort + error entry; position may be out-of-range with 0 active liquidity |
| `outOfRange: true`                           | 3     | Apply threshold normally; note in audit entry                             |
| `NetworkError`                               | any   | Exponential backoff `1s → 2s → 4s`, ≤ 3 retries                           |
| `TransactionError` (recoverable)             | 4     | Backoff + retry once                                                      |
| `TransactionError` (non-recoverable)         | 4     | Abort + error entry; position remains open                                |
| `dry-run` flag set, IL ≥ threshold           | 3     | Append `withdrawal-recommended`, stop (no phase 4)                        |
