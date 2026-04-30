# saucerswap-v1 plugin

SaucerSwap V1 (Uniswap V2-style constant-product AMM) on Hedera: exact-input swaps, exact-output buys, liquidity deposit / withdraw, and pool discovery via REST.

**The skill always passes `--format json` — treat it as implicit on every command below.**

Router contract IDs (spender for `token allowance-ft` in phase 6):

- Mainnet: `0.0.3045981`
- Testnet: `0.0.19264`

Token references accept: Hedera ID (`0.0.X`), account alias, EVM address, or the literal `HBAR` (treated as wrapped HBAR under the hood via the network's WHBAR token ID — `0.0.1456986` mainnet / `0.0.15058` testnet). Amount flags use display units by default; append `"t"` to pass raw base units.

---

### `hcli saucerswap-v1 view` _(used by the skill — phase 3)_

Read live reserves for a token pair from the SaucerSwap REST API.

| Option      | Short | Type   | Required | Default | Description                                      |
| ----------- | ----- | ------ | -------- | ------- | ------------------------------------------------ |
| `--api-key` |       | string | **yes**  | —       | SaucerSwap API key (sent as `x-api-key` header). |
| `--token-a` | `-a`  | string | **yes**  | —       | First token.                                     |
| `--token-b` | `-b`  | string | **yes**  | —       | Second token.                                    |

**Example:**

```
hcli saucerswap-v1 view --api-key "$SAUCERSWAP_API_KEY" -a HBAR -b 0.0.429274 --format json
```

**Output:** `{ network, poolContractId, tokenA, tokenB, reserveA, reserveB, lpTokenId? }`

**How the skill uses it:** Phase 3 reads `reserveA` / `reserveB` (base-unit strings), pipes them into `scripts/implied-price.mjs` together with the decimals cached in phase 2, and writes an `observation` entry to the audit log.

---

### `hcli saucerswap-v1 list` _(used by the skill — phase 3, optional discovery)_

Discover pools via the SaucerSwap REST API, optionally filtered by token ID, symbol, or name substring.

| Option      | Short | Type   | Required | Default | Description                                  |
| ----------- | ----- | ------ | -------- | ------- | -------------------------------------------- |
| `--api-key` |       | string | **yes**  | —       | API key.                                     |
| `--token`   | `-t`  | string | no       | —       | Filter: token ID, symbol, or name substring. |

**Example:**

```
hcli saucerswap-v1 list --api-key "$SAUCERSWAP_API_KEY" --token SAUCE --format json
```

**Output:** `{ network, poolCount, pools: [{ id, contractId, tokenA, tokenB, reserveA, reserveB }] }`

**How the skill uses it:** Only as a fallback when the caller passes a symbol/name instead of an explicit Hedera ID for `tokenA` / `tokenB`.

---

### `hcli saucerswap-v1 swap` [batchify] [scheduled] _(used by the skill — phase 7 when intent is `swap`)_

Exact-input trade: sell exactly `--amount` of `--from`, require at least the slippage-adjusted minimum of `--to`.

| Option          | Short | Type   | Required | Default        | Description                                           |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------- |
| `--from`        | `-f`  | string | **yes**  | —              | Input token.                                          |
| `--to`          | `-t`  | string | **yes**  | —              | Output token.                                         |
| `--amount`      | `-a`  | string | **yes**  | —              | Exact input amount. Display units, or raw with `"t"`. |
| `--min-output`  | `-m`  | string | no       | —              | Explicit minimum output. Overrides slippage when set. |
| `--slippage`    | `-s`  | number | no       | `0.5`          | Slippage %, used when `--min-output` is omitted.      |
| `--deadline`    | `-d`  | number | no       | `180`          | Deadline seconds from now.                            |
| `--gas`         | `-g`  | number | no       | `1_000_000`    | Gas limit for the contract call.                      |
| `--key-manager` | `-k`  | string | no       | config default | `local` or `local_encrypted`.                         |

**Example:**

```
hcli saucerswap-v1 swap --from HBAR --to 0.0.429274 --amount 10 --slippage 0.5 --format json
hcli saucerswap-v1 swap --from 0.0.1183558 --to 0.0.429274 --amount 1000 --min-output 480 --format json
```

**Output:** `{ contractId, network, transactionId, direction, amountIn, amountOutMin }`

`direction` is one of `"HBAR_FOR_TOKEN" | "TOKEN_FOR_HBAR" | "TOKEN_FOR_TOKEN"` and selects the router function under the hood (`swapExactETHForTokens` / `swapExactTokensForETH` / `swapExactTokensForTokens` — see ADR-001 Part 3).

**How the skill uses it:** Phase 7 when the decision emitted `{ action: "swap", amountIn }`. Amounts are base-unit integers; the skill appends a `trade` audit entry with pre/post balances.

---

### `hcli saucerswap-v1 buy` [batchify] [scheduled] _(used by the skill — phase 7 when intent is `buy`)_

Exact-output trade: receive exactly `--amount` of `--to`, spend at most `--max-input`. If `--max-input` is omitted, the plugin derives it via the router's `getAmountsIn` padded by `--slippage`.

| Option          | Short | Type   | Required | Default        | Description                                                                |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------- |
| `--from`        | `-f`  | string | **yes**  | —              | Input token.                                                               |
| `--to`          | `-t`  | string | **yes**  | —              | Output token.                                                              |
| `--amount`      | `-a`  | string | **yes**  | —              | Exact **output** amount.                                                   |
| `--max-input`   | `-m`  | string | no       | derived        | Hard cap on input. If omitted, computed via `getAmountsIn` + `--slippage`. |
| `--slippage`    | `-s`  | number | no       | `0`            | Slippage % used when `--max-input` is omitted.                             |
| `--deadline`    | `-d`  | number | no       | `180`          | Deadline seconds from now.                                                 |
| `--gas`         | `-g`  | number | no       | `1_000_000`    | Gas limit.                                                                 |
| `--key-manager` | `-k`  | string | no       | config default | Key manager.                                                               |

**Example:**

```
hcli saucerswap-v1 buy --from HBAR --to 0.0.1183558 --amount 5000 --max-input 2.6 --slippage 0.5 --format json
hcli saucerswap-v1 buy --from 0.0.1183558 --to HBAR --amount 10 --max-input 6000 --format json
```

**Output:** `{ contractId, network, transactionId, direction, amountOut, amountInMax }`

**How the skill uses it:** Phase 7 when the decision emitted `{ action: "buy", amountOut }`. Phase 5 computes an expected `amountIn` via `scripts/price-impact.mjs` (`mode: "exactOut"`) before committing.

---

### `hcli saucerswap-v1 deposit` [batchify] [scheduled] _(not used by Flow 1)_

Add liquidity to an existing V1 pool.

| Option          | Short | Type   | Required | Default        | Description                            |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------- |
| `--token-a`     | `-a`  | string | **yes**  | —              | First token.                           |
| `--token-b`     | `-b`  | string | **yes**  | —              | Second token.                          |
| `--amount-a`    |       | string | **yes**  | —              | Desired amount of token A.             |
| `--amount-b`    |       | string | **yes**  | —              | Desired amount of token B.             |
| `--slippage`    | `-s`  | number | no       | `0.5`          | Slippage % applied to minimum amounts. |
| `--deadline`    | `-d`  | number | no       | `180`          | Deadline seconds.                      |
| `--gas`         | `-g`  | number | no       | `1_000_000`    | Gas limit.                             |
| `--key-manager` | `-k`  | string | no       | config default | Key manager.                           |

**Output:** `{ contractId, network, transactionId }`

---

### `hcli saucerswap-v1 withdraw` [batchify] [scheduled] _(not used by Flow 1)_

Remove liquidity from an existing V1 pool.

| Option           | Short | Type   | Required | Default        | Description                                                               |
| ---------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------- |
| `--token-a`      | `-a`  | string | **yes**  | —              | First token.                                                              |
| `--token-b`      | `-b`  | string | **yes**  | —              | Second token.                                                             |
| `--liquidity`    | `-l`  | string | **yes**  | —              | LP amount to remove (display units assume 8 decimals, or raw with `"t"`). |
| `--min-amount-a` |       | string | no       | —              | Minimum token A returned.                                                 |
| `--min-amount-b` |       | string | no       | —              | Minimum token B returned.                                                 |
| `--deadline`     | `-d`  | number | no       | `180`          | Deadline seconds.                                                         |
| `--gas`          | `-g`  | number | no       | `2_800_000`    | Gas limit (higher than swap — removing liquidity is heavier).             |
| `--key-manager`  | `-k`  | string | no       | config default | Key manager.                                                              |

**Output:** `{ contractId, network, transactionId, liquidity }`
