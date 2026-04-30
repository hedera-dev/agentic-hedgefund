# Examples

Three worked scenarios. Each assumes the Prerequisites in [SKILL.md](SKILL.md) are satisfied: `hcli network list --format json` returns `{"network":"testnet"}` and the operator `0.0.5000001` is configured.

Environment variables used throughout:

```bash
export SAUCERSWAP_API_KEY="…"
export OP=0.0.5000001
export ROUTER=0.0.19264              # SaucerSwap V1 router (testnet)
export AUDIT=./audit/agentic-hedge-fund.jsonl
export USDC=0.0.429274               # raw token ID — alias registered in phase 2
export SAUCE=0.0.1183558             # raw token ID — alias registered in phase 2
```

---

## Example A — HBAR → USDC via `swap` (exact input)

Intent: sell exactly 10 HBAR when the observed HBAR price in USDC has risen at least 2 % above the last logged baseline.

### Phase 1 — Preflight

```bash
hcli network list --format json
# {"network":"testnet", ...}

hcli account view -a $OP --format json
# {"accountId":"0.0.5000001", ...}

hcli account balance -a $OP --format json
# {"accountId":"0.0.5000001","hbar":"250.0","tokens":[{"tokenId":"0.0.429274","balance":"0"}]}
```

HBAR balance 250 ≥ `balanceFloorHbar` (1). Proceed.

### Phase 2 — Token metadata

Skip `token view` for `HBAR` (decimals=8, symbol=`HBAR`).

```bash
hcli token view -T $USDC --format json
# {"tokenId":"0.0.429274","symbol":"USDC","decimals":6, ...}
```

`$USDC` is a raw Hedera ID — register the alias so all later commands use `USDC`:

```bash
hcli token import -T 0.0.429274 -n USDC --format json
# {"tokenId":"0.0.429274","name":"USD Coin","symbol":"USDC","alias":"USDC", ...}

USDC=USDC   # replace raw-ID var with alias for phases 3–7
```

### Phase 3 — Observation

```bash
hcli saucerswap-v1 view --api-key "$SAUCERSWAP_API_KEY" -a HBAR -b $USDC --format json
# {"network":"testnet","poolContractId":"0.0.1234567",
#  "tokenA":"0.0.15058","tokenB":"0.0.429274",
#  "reserveA":"100000000000000","reserveB":"60000000000",
#  "lpTokenId":"0.0.999999"}

echo '{"reserveA":"100000000000000","reserveB":"60000000000","decimalsA":8,"decimalsB":6}' \
  | node scripts/implied-price.mjs
# {"priceAinB":"0.06","priceBinA":"16.666666666666666666"}
```

Append observation to the audit log:

```json
{
  "timestamp": "2026-04-22T10:10:00Z",
  "network": "testnet",
  "phase": "observation",
  "pair": "HBAR/0.0.429274",
  "reserveA": "100000000000000",
  "reserveB": "60000000000",
  "decimalsA": 8,
  "decimalsB": 6,
  "priceAinB": "0.06",
  "priceBinA": "16.666666666666666666",
  "poolContractId": "0.0.1234567"
}
```

### Phase 4 — Decision

No `--baseline-price` passed, so read the latest matching snapshot:

```bash
echo '{"path":"'"$AUDIT"'","pair":"HBAR/0.0.429274","network":"testnet"}' \
  | node scripts/audit-log.mjs read-snapshot
# {"timestamp":"2026-04-22T09:10:00Z","priceAinB":"0.0582", ...}
```

`(0.06 − 0.0582) / 0.0582 ≈ 3.1 %` ≥ threshold `0.02` → emit `{ action: "swap", amountIn: "10" }`.

### Phase 5 — Risk checks

```bash
echo '{"mode":"exactIn","reserveIn":"100000000000000","reserveOut":"60000000000","amountIn":"1000000000"}' \
  | node scripts/price-impact.mjs
# {"amountOut":"598205","spotPrice":"0.0006","effectivePrice":"0.000598205","impactPercent":"0.299"}
```

`impactPercent 0.299` < `maxImpactPercent 2.0` → pass. Operator HBAR 250 ≫ 10 → pass.

### Phase 6 — Prepare

Association check:

```bash
hcli account balance -a $OP --token $USDC --format json
# {"tokens":[{"tokenId":"0.0.429274","balance":"0"}]}  ← already associated, skip
```

Input is HBAR — no allowance step.

### Phase 7 — Execute + verify

```bash
hcli saucerswap-v1 swap --from HBAR --to $USDC \
  --amount 10 --slippage 0.5 --format json
# {"transactionId":"0.0.5000001@...","direction":"HBAR_FOR_TOKEN",
#  "amountIn":"1000000000","amountOutMin":"595214",
#  "contractId":"0.0.19264","network":"testnet"}

hcli account balance -a $OP --format json
# {"hbar":"239.987","tokens":[{"tokenId":"0.0.429274","balance":"598205"}]}
```

Audit `trade` entry appended, workflow complete.

---

## Example B — SAUCE → USDC via `swap` (full allowance flow)

Intent: sell exactly 1,000 SAUCE when its USDC price has fallen 2 % below baseline.

### Highlights

- Phase 2 reads decimals for both SAUCE (6) and USDC (6). Both are raw IDs → `token import` runs for each, setting aliases `SAUCE` and `USDC`, then `SAUCE` and `USDC` vars are overwritten with the aliases.
- Phase 6 has **two** remediation steps — associate USDC if missing, then grant the router an HTS allowance for 1,000 SAUCE in base units.

### Phase 2 — Token metadata (alias registration)

```bash
hcli token view -T $SAUCE --format json
# {"tokenId":"0.0.1183558","symbol":"SAUCE","decimals":6, ...}
hcli token import -T 0.0.1183558 -n SAUCE --format json
# {"tokenId":"0.0.1183558","alias":"SAUCE", ...}

hcli token view -T $USDC --format json
# {"tokenId":"0.0.429274","symbol":"USDC","decimals":6, ...}
hcli token import -T 0.0.429274 -n USDC --format json
# {"tokenId":"0.0.429274","alias":"USDC", ...}

SAUCE=SAUCE; USDC=USDC   # use aliases from here on
```

### Phase 6 — Prepare (the interesting part)

```bash
# 1) Make sure USDC is associated (skip if already)
hcli account balance -a $OP --token $USDC --format json
# {"tokens":[]}  ← not associated
hcli token associate -T $USDC -a $OP --format json
# {"tokenId":"0.0.429274","accountId":"0.0.5000001","transactionId":"..."}

# 2) Grant the router a SAUCE allowance for 1000 SAUCE = 1_000_000_000 base units
hcli token allowance-ft -T $SAUCE -o $OP -s $ROUTER -a 1000000000 --format json
# {"tokenId":"0.0.1183558","owner":"0.0.5000001","spender":"0.0.19264",
#  "amount":"1000000000","transactionId":"..."}
```

### Phase 7 — Execute

```bash
hcli saucerswap-v1 swap --from $SAUCE --to $USDC \
  --amount 1000 --slippage 0.5 --format json
```

### If the precheck fires anyway

If phase 7 returns `TransactionPrecheckError` with code `SPENDER_DOES_NOT_HAVE_ALLOWANCE` (stale state, e.g. a previous allowance was consumed), the skill:

1. Appends an `error` audit entry with the raw envelope.
2. Re-runs `token allowance-ft` for the exact base-unit amount.
3. Retries the original `swap` **once**.
4. On a second failure, aborts.

---

## Example C — HBAR → SAUCE via `buy` (exact output)

Intent: acquire exactly 5,000 SAUCE when its HBAR price has fallen ≥ 2 % below baseline. Input side is HBAR, so no allowance step. Phase 2 imports SAUCE and sets the alias — same pattern as Example B.

### Phase 4 — Decision → `buy`

The caller passed `amountOut: "5000"` (not `amountIn`), so the intent is `{ action: "buy", amountOut: "5000" }`.

### Phase 5 — Risk check uses `exactOut` mode

```bash
echo '{"mode":"exactOut","reserveIn":"100000000000000","reserveOut":"2000000000000","amountOut":"5000000000"}' \
  | node scripts/price-impact.mjs
# {"amountIn":"251882437","spotPrice":"0.02","effectivePrice":"0.01984998...",
#  "impactPercent":"0.75"}
```

If the returned `amountIn` (in base units, here ~2.519 HBAR) exceeds the operator's HBAR balance minus the floor, reject. Otherwise, derive `maxInput` = `amountIn × (1 + slippage/100)` and pass it to the command.

### Phase 7 — Execute

```bash
# With an explicit cap derived from the quote:
hcli saucerswap-v1 buy --from HBAR --to $SAUCE \
  --amount 5000 --max-input 2.6 --slippage 0.5 --format json
# {"transactionId":"...","direction":"HBAR_FOR_TOKEN",
#  "amountOut":"5000000000","amountInMax":"260000000",
#  "contractId":"0.0.19264","network":"testnet"}
```

Alternative: omit `--max-input` and let the router's `getAmountsIn` + `--slippage` derive the cap — acceptable when the risk check has already bounded the trade. The audit `trade` entry should record which path was used.

### Resulting audit entry

```json
{
  "timestamp": "2026-04-22T10:25:00Z",
  "network": "testnet",
  "phase": "trade",
  "pair": "HBAR/0.0.1183558",
  "command": "buy",
  "args": {
    "from": "HBAR",
    "to": "0.0.1183558",
    "amount": "5000",
    "maxInput": "2.6",
    "slippage": 0.5
  },
  "transactionId": "…",
  "direction": "HBAR_FOR_TOKEN",
  "amountOut": "5000000000",
  "amountInMax": "260000000",
  "balancesBefore": { "hbar": "239.987", "tokens": [] },
  "balancesAfter": {
    "hbar": "237.467",
    "tokens": [{ "tokenId": "0.0.1183558", "balance": "5000000000" }]
  }
}
```
