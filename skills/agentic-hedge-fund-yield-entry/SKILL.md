---
name: agentic-hedge-fund-yield-entry
description: Discover the deepest SaucerSwap liquidity pool (V1 or V2) for a token pair and enter a yield farming position — all in one invocation. Compares V1 reserves against V2 virtual reserves and picks the highest-liquidity pool automatically, then handles associations, allowances, and the deposit/mint in sequence. Use when executing Flow 4 entry of the hedge fund ("yield farming lifecycle") or when an agent wants to enter the best available LP position for a given pair.
---

# Agentic Hedge Fund — Yield Farming Entry (Flow 4, Part 1)

A five-phase workflow that discovers the highest-liquidity SaucerSwap pool for a token pair across both V1 and V2, enters the position, and records it in the audit log for the monitor skill to track.

## Core rules

1. **Every `hcli` invocation MUST end with `--format json`.**
2. **Token auto-import:** for every token parameter that is a raw Hedera ID (`\d+\.\d+\.\d+`), call `token import -T $ID -n $SYMBOL --format json` in the setup phase. Deduplicate. Use alias for all subsequent commands.
3. **Pool comparison across V1 and V2:** V1 depth = `reserveA` (base units of token-a from `list`). V2 depth = `virtualReserve0 = liquidity * 2^96 / sqrtRatioX96` (base units of token-a equivalent from `view-pool`). Pick the pool with the higher depth value. If V2 yields multiple fee tiers, compare all and pick the deepest.
4. **Never run two write commands in parallel** — ordering matters for allowances and deposit.
5. **Associations go before allowances; allowances go before the deposit** — all as standalone transactions.
6. **After a V2 mint-position, call `list-positions` to obtain the NFT serial** — the mint output does not include it.
7. **Every phase outcome is appended to the audit log.** On any abort, append an `error` entry before surfacing the failure.

## Caller-supplied inputs

| Input           | Required | Notes                                                              |
| --------------- | -------- | ------------------------------------------------------------------ |
| `api-key`       | yes      | SaucerSwap REST API key                                            |
| `token-a`       | yes      | First token: Hedera ID, alias, or `HBAR`                           |
| `token-b`       | yes      | Second token: Hedera ID, alias, or `HBAR`                          |
| `amount-a`      | yes      | Desired amount for token A (display units)                         |
| `amount-b`      | yes      | Desired amount for token B (display units)                         |
| `slippage`      | no       | %, default `2.0`                                                   |
| `range-percent` | no       | V2 only — symmetric ±% tick range for `mint-position`, default `5` |

The operator is always read from hcli state (`network get-operator --format json`).

## Workflow checklist

Run phases in order. Every `hcli` command must include `--format json`.

### Phase 1 — Setup

1. `hcli network list --format json` — confirm network; cache `network`, V1 router ID, V2 contract IDs.
2. `hcli network get-operator --format json` — cache `operatorAccountId`.
3. Collect unique raw token IDs from `--token-a` / `--token-b`. For each: `hcli token view -T $ID --format json` → cache `symbol`, `decimalsA`, `decimalsB`. Then `hcli token import -T $ID -n $SYMBOL --format json`. Use aliases for all subsequent commands.

### Phase 2 — Discovery

Run V1 and V2 discovery in sequence. Compute depth scores and pick the winner.

**V1 discovery:**

```
hcli saucerswap-v1 list --api-key "$API_KEY" --token $TA --format json
```

Filter pools that contain both `$TA` and `$TB`. For each matching pool, record `reserveA` as V1 depth. Pick the V1 pool with the highest `reserveA`.

**V2 discovery:**

```
hcli saucerswap-v2 list-pools --api-key "$API_KEY" --token $TA --format json
```

Filter pools that contain both tokens. For each matching fee tier, call:

```
hcli saucerswap-v2 view-pool --api-key "$API_KEY" -a $TA -b $TB --fee-tier $FEE_TIER --format json
```

Skip pools where `poolAddress` or `sqrtRatioX96` or `liquidity` is `null` (no active liquidity). For each valid V2 pool, compute `virtualReserve0 = liquidity * 2^96 / sqrtRatioX96` (integer BigInt math). Pick the V2 pool with the highest `virtualReserve0`.

**Selection:** compare V1 `reserveA` against the best V2 `virtualReserve0`. The higher value wins. Cache `selectedProtocol` (`v1` | `v2`), `selectedPool` details, `feeTier` (V2 only), and entry price via `scripts/implied-price.mjs`:

```
echo '{"reserveA":"...","reserveB":"...","decimalsA":8,"decimalsB":6}' | node scripts/implied-price.mjs   # V1
echo '{"sqrtRatioX96":"...","decimalsA":8,"decimalsB":6}' | node scripts/implied-price.mjs               # V2
```

Append a `discovery` audit entry with the ranked pool list and the selected pool.

### Phase 3 — Pre-flight

1. **Token associations** — for each token the operator will receive (both `$TA` and `$TB`):
   - `hcli account balance -a $OP --format json` → check `tokens[]`.
   - If missing: `hcli token associate -T $TOKEN -a $OP --format json`. Skip if `alreadyAssociated`.

2. **Token allowances** (standalone, not in a batch):
   - **V1:** `token allowance-ft` for both `$TA` and `$TB` → V1 router for the deposit amounts.
   - **V2:** `token allowance-ft` for both `$TA` and `$TB` → NFT Position Manager for the deposit amounts.
   - Skip if `$TA` or `$TB` is HBAR.

### Phase 4 — Deposit

**V1:**

```
hcli saucerswap-v1 deposit --token-a $TA --token-b $TB \
  --amount-a $AMOUNT_A --amount-b $AMOUNT_B --slippage $SLIPPAGE --format json
```

**V2:**

```
hcli saucerswap-v2 mint-position --token-a $TA --token-b $TB \
  --fee-tier $FEE_TIER --amount-a $AMOUNT_A --amount-b $AMOUNT_B \
  --range-percent $RANGE_PERCENT --slippage $SLIPPAGE --format json
```

Capture `transactionId`. On failure, append `error` audit entry and abort.

### Phase 5 — Verify and record

1. `hcli account balance -a $OP --format json` — capture `balancesAfter`.
2. **V1:** find LP token ID from `saucerswap-v1 view --api-key "$API_KEY" -a $TA -b $TB --format json` → `lpTokenId`. Get LP balance from `balancesAfter.tokens`.
3. **V2:** `hcli saucerswap-v2 list-positions --api-key "$API_KEY" --account $OP --format json` → find the newly minted position by matching `feeTier`, `tickLower`, `tickUpper` from the mint output. Record `tokenSN` and `liquidity`.
4. Append a `position-entered` audit entry — see REFERENCE.md §5 for the exact schema.

## Error handling

See [REFERENCE.md](REFERENCE.md) for the full error-code → behaviour table.

- `NotFoundError` (pool not found by `list`) → no matching pool for the pair on that protocol. Continue with the other protocol if one still has candidates; abort with `no-pools-found` if neither has any.
- `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` in phase 4 → should have been caught in phase 3. Abort, append error.
- `NetworkError` → exponential backoff `1s → 2s → 4s`, ≤ 3 attempts.
- Any other error → append error entry, surface to caller.

## More

- Cross-cutting rules, pool comparison math, audit schema: [REFERENCE.md](REFERENCE.md)
- [`references/saucerswap-v1.md`](references/saucerswap-v1.md) — `list`, `view`, `deposit`
- [`references/saucerswap-v2.md`](references/saucerswap-v2.md) — `list-pools`, `view-pool`, `mint-position`
- [`references/token.md`](references/token.md) — `view`, `import`, `associate`, `allowance-ft`
- [`references/account.md`](references/account.md) — `balance`
- [`references/network.md`](references/network.md) — `list`, `get-operator`
