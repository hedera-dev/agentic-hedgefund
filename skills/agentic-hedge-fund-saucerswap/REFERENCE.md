# Reference — rules, JSON shapes, audit format, error handling

Per-command flag tables live in [`references/`](references/) — one file per plugin. This file covers cross-cutting rules: output format, HBAR detection, allowance strategy, audit log schema, and the error-code-to-behaviour table.

## 0. Output format — non-negotiable

Every `hcli` invocation the skill makes MUST include `--format json`. Rationale:

- The skill parses `stdout` as JSON. Default (human) output uses Handlebars templates with ANSI / emoji and will fail `JSON.parse`.
- Read-only and write commands both emit structured `CommandResult` envelopes whose `result` field matches the Zod schemas documented in the per-plugin reference files.
- The only commands the skill issues **without** `--format json` are the one-shot setup commands the caller runs manually during Prerequisites (`hcli network use`, `hcli network set-operator`).

If a command ever returns a non-JSON line to stdout, abort the phase and log an `error` audit entry with `code: "UnexpectedOutput"`.

## 1. Per-plugin command reference

| Plugin          | File                                                         | Commands the skill uses                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`       | [`references/account.md`](references/account.md)             | `view` (phase 1), `balance` (phases 1, 5, 7)                                                                                                                                                  |
| `token`         | [`references/token.md`](references/token.md)                 | `view` (phase 2), `import` (phase 2 — alias registration), `associate` (phase 6), `allowance-ft` (phase 6); `transfer-ft`, `transfer-nft` available as remediation only                       |
| `hbar`          | [`references/hbar.md`](references/hbar.md)                   | `transfer` — only when the caller explicitly tops up the operator                                                                                                                             |
| `network`       | [`references/network.md`](references/network.md)             | `view` (phase 1); `use` / `set-operator` run manually by the caller                                                                                                                           |
| `saucerswap-v1` | [`references/saucerswap-v1.md`](references/saucerswap-v1.md) | `view`, `list` (phase 3), `swap` or `buy` (phase 7); `deposit` / `withdraw` documented but unused by Flow 1                                                                                   |
| `saucerswap-v2` | [`references/saucerswap-v2.md`](references/saucerswap-v2.md) | `view-pool`, `list-pools` (phase 3), `swap` or `buy` (phase 7); `list-positions`, `mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees` documented but unused by Flow 1 |

Every per-plugin file ships with: option tables (name / short / type / required / default), one runnable example, the Zod output shape, and — where relevant — `[batchify]` / `[scheduled]` hook annotations.

## 2. HBAR detection

Input counts as HBAR if any of:

- `input === "HBAR"` (case-insensitive), **or**
- `input === whbarTokenId` for the active network (testnet `0.0.15058`, mainnet `0.0.1456986`).

This mirrors `isHbar` in `src/shared/util/hbar-detection.ts`.

When input is HBAR, skip `token allowance-ft` in phase 6 (HBAR is paid via the contract's `payableAmount`, not pulled through an allowance). When output is HBAR, no `token associate` is needed.

## 3. Allowance strategy

**Always** use `token allowance-ft`. Do not call `contract-erc20 approve`. The spender must be the correct router **contract ID** (the plugin resolves it to the router's EVM address under the hood). The amount must be in base units (= display amount × 10^decimals, or append `"t"` to the CLI amount to pass the raw integer directly).

Spender contract IDs by version and command:

| Version | Command                               | Spender (testnet) | Spender (mainnet) |
| ------- | ------------------------------------- | ----------------- | ----------------- |
| V1      | `swap`, `buy`                         | `0.0.19264`       | `0.0.3045981`     |
| V2      | `swap`, `buy`                         | `0.0.1414040`     | `0.0.3949434`     |
| V2      | `mint-position`, `increase-liquidity` | `0.0.1308184`     | `0.0.4053945`     |

Skip `token allowance-ft` entirely when the input token is `HBAR` — HBAR is paid via the contract's `payableAmount`, not pulled through an allowance.

If a prior allowance for the same owner / spender pair is already sufficient, skip the call — but checking existing allowance is an optional optimisation; granting a fresh allowance equal to the exact need is always safe.

## 4. Audit log format

Location: `./audit/agentic-hedge-fund.jsonl` (override with `HEDGE_FUND_AUDIT_LOG`). One JSON object per line.

Common fields on every entry:

```json
{
  "timestamp": "2026-04-22T10:15:30.000Z",
  "network": "testnet",
  "phase": "preflight | metadata | observation | decision | risk | prepare | trade | error",
  "pair": "HBAR/0.0.429274"
}
```

Phase-specific additions:

- `observation` → `reserveA`, `reserveB`, `decimalsA`, `decimalsB`, `priceAinB`, `priceBinA`, `poolContractId`.
- `decision` → `intent` (object) or `"no-op"`, `baselinePrice`, `threshold`.
- `risk` → `amountIn`, `amountOutMin` (or `amountOut`/`amountInMax`), `impactPercent`, `passed` (boolean), `reason?`.
- `prepare` → `steps[]` with `{ command, args, transactionId }` for each remediation run.
- `trade` → `command` (`swap` | `buy`), `args`, `transactionId`, `direction`, `amountIn?`, `amountOut?`, `amountOutMin?`, `amountInMax?`, `balancesBefore`, `balancesAfter`.
- `error` → `phase`, `commandArgs?`, `error` (raw `CliError` envelope: `code`, `message`, `recoverable`, `context`), `retryAttempt?`.

`observation` entries are what `scripts/audit-log.mjs read-snapshot` returns when sourcing a baseline.

## 5. Error handling

CLI errors map to concrete skill behaviour. The skill parses the JSON error envelope (`code`, `recoverable`, `context`) emitted by `CliError` and reacts per the table below. **Every branch — retry, abort, or remediate — appends an `error` entry to the audit log before acting.**

| `code`                                                                                      | Typical phase | Behaviour                                                                                 | Retry       |
| ------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- | ----------- |
| `ValidationError`                                                                           | 1–3           | Abort; surface the offending flag/field                                                   | No          |
| `NotFoundError` (account)                                                                   | 1             | Abort with "operator not configured" + point to Prerequisites                             | No          |
| `NotFoundError` (pool / token not listed in SaucerSwap REST)                                | 2–3           | Abort the phase; suggest `saucerswap-v1 list` or `saucerswap-v2 list-pools`               | No          |
| `AuthorizationError`                                                                        | 6–7           | Abort; operator cannot sign — escalate to admin                                           | No          |
| `NetworkError` (REST or consensus)                                                          | any           | Exponential backoff `1s → 2s → 4s`                                                        | ≤ 3         |
| `TransactionPrecheckError` — `INSUFFICIENT_PAYER_BALANCE`                                   | 7             | Abort; instruct caller to top up operator (optional `hbar transfer`)                      | No          |
| `TransactionPrecheckError` — `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT`                              | 7             | Run `token associate`; retry the original command **once**                                | 1 after fix |
| `TransactionPrecheckError` — `SPENDER_DOES_NOT_HAVE_ALLOWANCE` / `AMOUNT_EXCEEDS_ALLOWANCE` | 7             | Run `token allowance-ft` for the needed base-unit amount; retry **once**                  | 1 after fix |
| `TransactionPrecheckError` — `DUPLICATE_TRANSACTION`                                        | 7             | If the prior attempt is visible in the audit log, treat as idempotent success; else abort | No          |
| `TransactionError` (`recoverable: true`)                                                    | 7             | Exponential backoff `1s → 2s → 4s`                                                        | ≤ 3         |
| `TransactionError` (`recoverable: false`)                                                   | 7             | Abort; log failure with pre/post balances                                                 | No          |
| `StateError`                                                                                | any           | Abort; advise the caller to inspect `hcli` state — never auto-reset                       | No          |
| `UnexpectedOutput` (see §0)                                                                 | any           | Abort; dump raw stdout into the audit log                                                 | No          |
| Unknown / uncategorised                                                                     | any           | Abort; dump the raw error envelope to the audit log                                       | No          |

## 6. Script interfaces

All three scripts live in `scripts/`. Pipe JSON to stdin and parse JSON from stdout.

### `scripts/implied-price.mjs`

Auto-detects V1 vs V2 by field presence.

**V1 input** (reserves present):

```json
{
  "reserveA": "12345678",
  "reserveB": "9876543",
  "decimalsA": 8,
  "decimalsB": 6
}
```

**V2 input** (`sqrtRatioX96` present):

```json
{
  "sqrtRatioX96": "1461446703485210103287273052203988822378723970341",
  "decimalsA": 8,
  "decimalsB": 6
}
```

`decimalsA` = decimals of `tokenA` as returned by `view-pool` (pool's token0). `decimalsB` = decimals of token1.

**Output (both):**

```json
{ "priceAinB": "0.000123456", "priceBinA": "8103.7" }
```

---

### `scripts/price-impact.mjs`

Auto-detects V1 vs V2 by presence of `sqrtRatioX96`.

**V1 exactIn:**

```json
{
  "mode": "exactIn",
  "reserveIn": "100000000000",
  "reserveOut": "8000000000",
  "amountIn": "10000000"
}
```

**V1 exactOut:**

```json
{
  "mode": "exactOut",
  "reserveIn": "100000000000",
  "reserveOut": "8000000000",
  "amountOut": "800000"
}
```

**V2 exactIn:**

```json
{
  "mode": "exactIn",
  "sqrtRatioX96": "...",
  "liquidity": "...",
  "feeTier": 3000,
  "direction": "aToB",
  "amountIn": "10000000"
}
```

**V2 exactOut:**

```json
{
  "mode": "exactOut",
  "sqrtRatioX96": "...",
  "liquidity": "...",
  "feeTier": 3000,
  "direction": "bToA",
  "amountOut": "800000"
}
```

`direction` — `"aToB"`: selling token0 (pool's lower-address token) for token1. `"bToA"`: selling token1 for token0. Determine from the caller's `from` token: if `from` = pool's `tokenA` → `"aToB"`, else `"bToA"`.

**Output (all modes):**

```json
{
  "amountOut": "...",
  "spotPrice": "...",
  "effectivePrice": "...",
  "impactPercent": "0.1234"
}
// or amountIn for exactOut
```

---

### `scripts/audit-log.mjs`

No V1/V2 distinction — handles all phases and both pool types generically.

```bash
# Append an entry
echo '{"path":"./audit/...jsonl","entry":{...}}' | node scripts/audit-log.mjs append

# Read latest observation baseline for a pair
echo '{"path":"./audit/...jsonl","pair":"HBAR/0.0.429274","network":"testnet"}' | node scripts/audit-log.mjs read-snapshot
```
