---
name: agentic-hedge-fund-saucerswap
description: Observe a SaucerSwap V1 or V2 pool and execute a risk-checked swap (exact input) or buy (exact output) through the Hiero CLI. Use when the user asks to monitor a V1 or V2 pool, compute an implied price, run the "Flow 1" hedge-fund scenario, or when an intent specifies either amountIn (→ swap) or amountOut (→ buy). V2 is selected when the caller provides a feeTier.
---

# Agentic Hedge Fund — SaucerSwap Swap / Buy

A seven-phase workflow that observes a SaucerSwap pool (V1 constant-product **or** V2 concentrated liquidity), applies a configurable threshold rule against a baseline price, and executes either an exact-input `swap` or an exact-output `buy` with full pre-flight risk checks and an append-only audit log.

**Version selection:** use `saucerswap-v1` commands when the caller does **not** supply a `feeTier`; use `saucerswap-v2` commands when a `feeTier` (500 / 1500 / 3000 / 10000) is provided. If the version is ambiguous, ask the caller before proceeding.

## Core rules

1. **Every `hcli` invocation MUST end with `--format json`.** The skill parses `stdout` as JSON — human-formatted output will break the workflow. This applies to read-only probes (`network list`, `account view`, `account balance`, `token view`, `saucerswap-v1 view`, `saucerswap-v1 list`) **and** to write commands (`token associate`, `token allowance-ft`, `saucerswap-v1 swap`, `saucerswap-v1 buy`, etc.). The only exception is `hcli network use` / `set-operator`, which are one-shot setup commands the caller runs manually during Prerequisites.
2. Never run two write commands in parallel for the same operator — sign/submit order matters.
3. Never auto-switch networks or auto-top-up balances. Abort and surface the reason to the caller.
4. On any `CliError`, append an `error` entry to the audit log **before** retrying or aborting (see [REFERENCE.md](REFERENCE.md) §9).

## Quick start

```bash
# V1 pair: HBAR ↔ USDC on testnet (no feeTier)
hcli saucerswap-v1 view --api-key "$SAUCERSWAP_API_KEY" -a HBAR -b 0.0.429274 --format json
hcli saucerswap-v1 swap --from HBAR --to 0.0.429274 --amount 10 --slippage 0.5 --format json

# V2 pair: HBAR ↔ USDC on testnet (feeTier supplied)
hcli saucerswap-v2 view-pool --api-key "$SAUCERSWAP_API_KEY" -a HBAR -b 0.0.429274 --fee-tier 3000 --format json
hcli saucerswap-v2 swap --from HBAR --to 0.0.429274 --amount 10 --fee-tier 3000 --slippage 0.5 --format json

# Append audit entry:
echo '{"path":"./audit/agentic-hedge-fund.jsonl","entry":{...}}' | node scripts/audit-log.mjs append
```

## Prerequisites

Before executing blockchain commands:

1. Configure network: `hcli network use --global testnet`
2. Set operator: `hcli network set-operator --operator <accountId>:<privateKey>`

The skill aborts if `hcli network list --format json` does not report `network: "testnet"`, or if `hcli account view -a <operator> --format json` fails.

## Caller-supplied inputs

| Input | Required | Notes |
|---|---|---|
| `operator` | yes | Account alias or Hedera ID |
| `tokenA`, `tokenB` | yes | Pair sides. Each: Hedera ID, alias, EVM address, or `HBAR` |
| `apiKey` | yes | SaucerSwap REST API key (sent as `x-api-key`) |
| `feeTier` | V2 only | `500`, `1500`, `3000`, or `10000`. Presence selects V2 plugin. |
| `amountIn` **xor** `amountOut` | yes | `amountIn` → `swap`, `amountOut` → `buy` |
| `slippage` | no | %, default `0.5` |
| `baselinePrice` | no | Decimal. If absent, read from audit log (latest `observation` for the same pair + network) |
| `threshold` | yes | Decimal, e.g. `0.02` = ±2 % |
| `maxImpactPercent` | no | Price-impact guard, default `2.0` |
| `balanceFloorHbar` | no | Minimum operator HBAR, default `1` |

## Workflow checklist

Run phases in order. **Do not proceed to phase 7 if phase 5 or 6 rejects the plan.** Every `hcli` command below must include `--format json` — see Core rule 1.

1. **Preflight** — `hcli network list --format json`; `hcli account view -a $OP --format json`; `hcli account balance -a $OP --format json`. Confirm testnet, operator exists, HBAR balance ≥ `balanceFloorHbar`.
2. **Token metadata** — `hcli token view -T $TA --format json`; `hcli token view -T $TB --format json`. Cache `decimals` and `symbol`; skip `token view` for the literal `HBAR` and substitute decimals=8.
3. **Observation**
   - **V1:** `hcli saucerswap-v1 view --api-key "$KEY" -a $TA -b $TB --format json`. Pipe `reserveA`/`reserveB` + decimals into `scripts/implied-price.mjs`.
   - **V2:** `hcli saucerswap-v2 view-pool --api-key "$KEY" -a $TA -b $TB --fee-tier $FEE_TIER --format json`. Pipe `sqrtRatioX96`/`tickCurrent` + decimals into `scripts/implied-price.mjs`. Abort if `poolAddress` or `sqrtRatioX96` is `null`.
4. **Decision** — Source baseline: caller input, else `scripts/audit-log.mjs read-snapshot`. Apply threshold rule → emit `{ action: "swap", amountIn }`, `{ action: "buy", amountOut }`, or `no-op`. Append an `observation` audit entry with the computed `priceAinB`.
5. **Risk checks** — `scripts/price-impact.mjs` with the chosen mode. Reject if: required input > caller balance, or `impactPercent > maxImpactPercent`, or router-quoted output fails the slippage bound.
6. **Prepare** — If output token not in `account balance` tokens[]: `hcli token associate -T $TOUT -a $OP --format json`. If input is an HTS token (not `HBAR`): grant `token allowance-ft` to the appropriate router — see REFERENCE.md §3.
   - **V1 router:** `0.0.19264` (testnet) / `0.0.3045981` (mainnet)
   - **V2 SwapRouter:** `0.0.1414040` (testnet) / `0.0.3949434` (mainnet)
7. **Execute + verify**
   - **V1:** `hcli saucerswap-v1 swap ... --format json` **or** `hcli saucerswap-v1 buy ... --format json`
   - **V2:** `hcli saucerswap-v2 swap ... --fee-tier $FEE_TIER --format json` **or** `hcli saucerswap-v2 buy ... --fee-tier $FEE_TIER --format json`

   Then `hcli account balance -a $OP --format json` again. Append a `trade` audit entry.

Every phase transition is logged via `scripts/audit-log.mjs append` to `./audit/agentic-hedge-fund.jsonl` (override with `HEDGE_FUND_AUDIT_LOG`).

## Error handling

See [REFERENCE.md](REFERENCE.md) for the full error-code → behaviour table. Highlights:

- `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` → run `token associate`, retry once.
- `SPENDER_DOES_NOT_HAVE_ALLOWANCE` / `AMOUNT_EXCEEDS_ALLOWANCE` → run `token allowance-ft`, retry once.
- `NetworkError` / recoverable `TransactionError` → exponential backoff (1s → 2s → 4s), up to 3 attempts.
- Anything else → abort, append the raw error envelope to the audit log, surface to the caller.

## More

- Cross-cutting rules (output format, HBAR detection, allowance strategy, audit log format, full error table): [REFERENCE.md](REFERENCE.md)
- Per-plugin command reference (one file per plugin, with option tables and output schemas):
  - [`references/saucerswap-v1.md`](references/saucerswap-v1.md) — `view`, `list`, `swap`, `buy`, `deposit`, `withdraw`
  - [`references/saucerswap-v2.md`](references/saucerswap-v2.md) — `view-pool`, `list-pools`, `swap`, `buy`; plus `list-positions`, `mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees` (not used by Flow 1)
  - [`references/account.md`](references/account.md) — `view`, `balance`, plus full account lifecycle
  - [`references/token.md`](references/token.md) — `view`, `associate`, `allowance-ft`, `transfer-ft`, …
  - [`references/hbar.md`](references/hbar.md) — `transfer`
  - [`references/network.md`](references/network.md) — `list`, `use`, `set-operator`, `get-operator`
- Worked examples (HBAR→USDC swap, SAUCE→USDC swap, HBAR→SAUCE buy): [EXAMPLES.md](EXAMPLES.md)
