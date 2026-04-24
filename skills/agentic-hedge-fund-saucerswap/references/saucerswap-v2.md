# saucerswap-v2 plugin

SaucerSwap V2 (Uniswap V3-style concentrated liquidity) on Hedera: exact-input swaps, exact-output buys, pool observation, and position lifecycle management.

**The skill always passes `--format json` — treat it as implicit on every command below.**

Contract IDs by network:

| Contract         | Mainnet       | Testnet       |
| ---------------- | ------------- | ------------- |
| SwapRouter       | `0.0.3949434` | `0.0.1414040` |
| NFT Position Mgr | `0.0.4053945` | `0.0.1308184` |
| Factory          | `0.0.3946833` | `0.0.1197038` |
| WHBAR            | `0.0.1456986` | `0.0.15058`   |

Token references accept the same forms as V1: Hedera ID (`0.0.X`), account alias, EVM address, or the literal `HBAR`. Amount flags use display units by default; append `"t"` to pass raw base units.

**Fee tier** is required on every V2 command. Valid values: `500` (0.05%), `1500` (0.15%), `3000` (0.3%), `10000` (1%). Use `list-pools` or `view-pool` to confirm which tier a pool exists at before executing.

**Price computation differs from V1.** V2 pools expose `sqrtPriceX96` (a Q64.96 fixed-point number) rather than reserves. Implied price = `(sqrtPriceX96 / 2^96)^2`, adjusted for the difference in token decimals. Pass `sqrtPriceX96`, `tickCurrent`, `decimalsA`, and `decimalsB` into `scripts/implied-price.mjs` — the script detects V2 inputs automatically.

**Allowance strategy** — same `token allowance-ft` pattern as V1, but the spender differs by command type:
- `swap` / `buy` — use the **SwapRouter** contract ID (`0.0.3949434` mainnet / `0.0.1414040` testnet).
- `mint-position` / `increase-liquidity` — use the **NFT Position Manager** contract ID (`0.0.4053945` mainnet / `0.0.1308184` testnet).
- `decrease-liquidity` / `collect-fees` — no allowance needed (caller is the NFT owner).

---

### `hcli saucerswap-v2 view-pool` *(used by the skill — phase 3)*

Resolve a pool on-chain via the Factory and enrich it with the SaucerSwap V2 REST API. Returns the pool's current tick, liquidity, and `sqrtPriceX96` — the inputs the skill needs to compute implied price.

| Option        | Short | Type   | Required | Default | Description                                      |
| ------------- | ----- | ------ | -------- | ------- | ------------------------------------------------ |
| `--api-key`   |       | string | **yes**  | —       | SaucerSwap API key (sent as `x-api-key` header). |
| `--token-a`   | `-a`  | string | **yes**  | —       | First token.                                     |
| `--token-b`   | `-b`  | string | **yes**  | —       | Second token.                                    |
| `--fee-tier`  |       | number | **yes**  | —       | Fee tier: 500, 1500, 3000, or 10000.             |

**Example:**

```
hcli saucerswap-v2 view-pool --api-key "$SAUCERSWAP_API_KEY" -a HBAR -b 0.0.429274 --fee-tier 3000 --format json
```

**Output:** `{ network, poolAddress, tokenA, tokenB, feeTier, tickCurrent, liquidity, sqrtRatioX96 }`

`poolAddress` is `null` if the pool has not yet been deployed. Abort and surface to the caller if `sqrtRatioX96` is `null` (pool exists but has no liquidity).

**How the skill uses it:** Phase 3 reads `sqrtRatioX96`, `tickCurrent`, and derives decimal-adjusted implied price via `scripts/implied-price.mjs`. An `observation` audit entry is appended with `sqrtRatioX96`, `tickCurrent`, `decimalsA`, `decimalsB`, `priceAinB`, `priceBinA`, and `poolAddress`.

---

### `hcli saucerswap-v2 list-pools` *(used by the skill — phase 3, optional discovery)*

Enumerate V2 pools from the SaucerSwap REST API, optionally filtered by token or fee tier.

| Option       | Short | Type   | Required | Default | Description                                          |
| ------------ | ----- | ------ | -------- | ------- | ---------------------------------------------------- |
| `--api-key`  |       | string | **yes**  | —       | API key.                                             |
| `--token`    | `-t`  | string | no       | —       | Filter: token ID, symbol, or name substring.         |
| `--fee-tier` |       | number | no       | —       | Filter by fee tier.                                  |

**Example:**

```
hcli saucerswap-v2 list-pools --api-key "$SAUCERSWAP_API_KEY" --token SAUCE --fee-tier 3000 --format json
```

**Output:** `{ network, poolCount, pools: [{ contractId, tokenA, tokenB, feeTier }] }`

**How the skill uses it:** Fallback in phase 3 when the caller passes a symbol/name instead of an explicit Hedera ID, or when the correct fee tier is unknown. Also used to confirm a pool exists before `view-pool`.

---

### `hcli saucerswap-v2 swap` [batchify] [scheduled] *(used by the skill — phase 7 when intent is `swap`)*

Exact-input trade: sell exactly `--amount` of `--from`, receive at least `--min-output` (or slippage-derived minimum) of `--to`.

| Option          | Short | Type   | Required | Default       | Description                                                                |
| --------------- | ----- | ------ | -------- | ------------- | -------------------------------------------------------------------------- |
| `--from`        | `-f`  | string | **yes**  | —             | Input token.                                                               |
| `--to`          | `-t`  | string | **yes**  | —             | Output token.                                                              |
| `--amount`      | `-a`  | string | **yes**  | —             | Exact input amount. Display units, or raw with `"t"`.                      |
| `--fee-tier`    | `-F`  | number | **yes**  | —             | Pool fee tier: 500, 1500, 3000, or 10000.                                  |
| `--min-output`  | `-o`  | string | no       | —             | Explicit minimum output. Overrides slippage when set.                      |
| `--slippage`    | `-s`  | number | no       | `0.5`         | Slippage %, used when `--min-output` is omitted.                           |
| `--deadline`    | `-d`  | number | no       | `180`         | Deadline seconds from now.                                                 |
| `--gas`         | `-g`  | number | no       | `300000`      | Gas limit for the contract call.                                           |
| `--key-manager` | `-k`  | string | no       | config default| `local` or `local_encrypted`.                                              |

**Example:**

```
hcli saucerswap-v2 swap --from HBAR --to 0.0.429274 --amount 10 --fee-tier 3000 --slippage 0.5 --format json
hcli saucerswap-v2 swap --from 0.0.1183558 --to 0.0.429274 --amount 1000 --fee-tier 500 --min-output 480 --format json
```

**Output:** `{ contractId, network, transactionId, amountIn, amountOutMin, feeTier }`

`contractId` is the SwapRouter. When `--from HBAR`, the handler wraps HBAR as WHBAR and calls `refundETH` in the same multicall — no manual wrap needed.

**How the skill uses it:** Phase 7 when the decision emitted `{ action: "swap", amountIn }`. Before calling, phase 6 must grant a `token allowance-ft` to the SwapRouter for the input amount (skip if `--from HBAR`). Append a `trade` audit entry with pre/post balances.

---

### `hcli saucerswap-v2 buy` [batchify] [scheduled] *(used by the skill — phase 7 when intent is `buy`)*

Exact-output trade: receive exactly `--amount` of `--to`, spend at most `--max-input` of `--from`.

| Option          | Short | Type   | Required | Default       | Description                                                              |
| --------------- | ----- | ------ | -------- | ------------- | ------------------------------------------------------------------------ |
| `--from`        | `-f`  | string | **yes**  | —             | Input token.                                                             |
| `--to`          | `-t`  | string | **yes**  | —             | Output token.                                                            |
| `--amount`      | `-a`  | string | **yes**  | —             | Exact **output** amount. Display units, or raw with `"t"`.               |
| `--max-input`   | `-i`  | string | **yes**  | —             | Hard cap on input. Display or raw with `"t"`.                            |
| `--fee-tier`    | `-F`  | number | **yes**  | —             | Pool fee tier: 500, 1500, 3000, or 10000.                                |
| `--deadline`    | `-d`  | number | no       | `180`         | Deadline seconds from now.                                               |
| `--gas`         | `-g`  | number | no       | `300000`      | Gas limit.                                                               |
| `--key-manager` | `-k`  | string | no       | config default| Key manager.                                                             |

**Example:**

```
hcli saucerswap-v2 buy --from HBAR --to 0.0.1183558 --amount 5000 --max-input 2.6 --fee-tier 3000 --format json
hcli saucerswap-v2 buy --from 0.0.1183558 --to HBAR --amount 10 --max-input 6000 --fee-tier 500 --format json
```

**Output:** `{ contractId, network, transactionId, amountOut, amountInMax, feeTier }`

Unlike V1, `--max-input` is **required** — the plugin does not derive it from the router. Phase 5 (`scripts/price-impact.mjs` with `mode: "exactOut"`) must compute the expected input before phase 7 can fill this flag.

**How the skill uses it:** Phase 7 when the decision emitted `{ action: "buy", amountOut }`. Phase 6 grants `token allowance-ft` to the SwapRouter for `amountInMax` (skip if `--from HBAR`). Append a `trade` audit entry.

---

### `hcli saucerswap-v2 list-positions` *(not used by Flow 1)*

List V2 LP NFT positions held by an account.

| Option      | Short | Type   | Required | Default | Description                             |
| ----------- | ----- | ------ | -------- | ------- | --------------------------------------- |
| `--api-key` |       | string | **yes**  | —       | API key.                                |
| `--account` | `-a`  | string | **yes**  | —       | Account ID, EVM address, or alias.      |

**Output:** `{ network, accountId, positionCount, positions: [{ tokenSN, feeTier, tickLower, tickUpper, liquidity, tokensOwed0, tokensOwed1 }] }`

---

### `hcli saucerswap-v2 mint-position` [batchify] [scheduled] *(not used by Flow 1)*

Mint a new concentrated liquidity position NFT. Ticks can be supplied explicitly or auto-computed from `--range-percent`.

| Option           | Short | Type   | Required | Default | Description                                                           |
| ---------------- | ----- | ------ | -------- | ------- | --------------------------------------------------------------------- |
| `--token-a`      | `-a`  | string | **yes**  | —       | First token.                                                          |
| `--token-b`      | `-b`  | string | **yes**  | —       | Second token.                                                         |
| `--fee-tier`     |       | number | **yes**  | —       | Fee tier (500, 1500, 3000, 10000).                                    |
| `--amount-a`     |       | string | **yes**  | —       | Desired amount for token A (display or raw `"t"`).                    |
| `--amount-b`     |       | string | **yes**  | —       | Desired amount for token B (display or raw `"t"`).                    |
| `--tick-lower`   |       | number | no       | —       | Lower tick (optional; auto-computed from `--range-percent`).          |
| `--tick-upper`   |       | number | no       | —       | Upper tick (optional).                                                |
| `--range-percent`|       | number | no       | `5`     | Symmetric ±% range when ticks are omitted.                            |
| `--slippage`     | `-s`  | number | no       | `0.5`   | Slippage %.                                                           |
| `--deadline`     | `-d`  | number | no       | `180`   | Deadline seconds.                                                     |
| `--gas`          | `-g`  | number | no       | `900000`| Gas limit (higher — minting is heavier than a swap).                  |
| `--key-manager`  | `-k`  | string | no       | —       | Key manager.                                                          |

**Output:** `{ contractId, network, transactionId, feeTier, tickLower, tickUpper, amount0Desired, amount1Desired }`

Allowance spender: **NFT Position Manager** (`0.0.4053945` mainnet / `0.0.1308184` testnet).

---

### `hcli saucerswap-v2 increase-liquidity` [batchify] [scheduled] *(not used by Flow 1)*

Add liquidity to an existing position NFT.

| Option          | Short | Type   | Required | Default  | Description                                                            |
| --------------- | ----- | ------ | -------- | -------- | ---------------------------------------------------------------------- |
| `--position`    | `-p`  | number | **yes**  | —        | LP position NFT serial (tokenId).                                      |
| `--amount-a`    |       | string | **yes**  | —        | Amount for pool token0.                                                |
| `--amount-b`    |       | string | **yes**  | —        | Amount for pool token1.                                                |
| `--hbar-amount` |       | string | no       | —        | Payable HBAR in tinybars for WHBAR-side adds.                          |
| `--slippage`    | `-s`  | number | no       | `0.5`    | Slippage %.                                                            |
| `--deadline`    | `-d`  | number | no       | `180`    | Deadline seconds.                                                      |
| `--gas`         | `-g`  | number | no       | `330000` | Gas limit.                                                             |
| `--key-manager` | `-k`  | string | no       | —        | Key manager.                                                           |

**Output:** `{ contractId, network, transactionId, tokenSN, amount0Desired, amount1Desired }`

---

### `hcli saucerswap-v2 decrease-liquidity` [batchify] [scheduled] *(not used by Flow 1)*

Remove liquidity from a position; optionally unwrap WHBAR and burn the NFT.

| Option          | Short | Type    | Required | Default  | Description                         |
| --------------- | ----- | ------- | -------- | -------- | ----------------------------------- |
| `--position`    | `-p`  | number  | **yes**  | —        | NFT serial number.                  |
| `--liquidity`   | `-l`  | string  | **yes**  | —        | Liquidity amount to remove.         |
| `--unwrap-hbar` |       | boolean | no       | `false`  | Unwrap WHBAR to HBAR.               |
| `--burn`        |       | boolean | no       | `false`  | Burn NFT after full exit.           |
| `--slippage`    | `-s`  | number  | no       | `0.5`    | Slippage %.                         |
| `--deadline`    | `-d`  | number  | no       | `180`    | Deadline seconds.                   |
| `--gas`         | `-g`  | number  | no       | `300000` | Gas limit.                          |
| `--key-manager` | `-k`  | string  | no       | —        | Key manager.                        |

**Output:** `{ contractId, network, transactionId, tokenSN, liquidity, unwrapHbar, burn }`

---

### `hcli saucerswap-v2 collect-fees` [batchify] [scheduled] *(not used by Flow 1)*

Claim accrued swap fees from an existing position without removing liquidity.

| Option          | Short | Type    | Required | Default  | Description          |
| --------------- | ----- | ------- | -------- | -------- | -------------------- |
| `--position`    | `-p`  | number  | **yes**  | —        | NFT serial number.   |
| `--unwrap-hbar` |       | boolean | no       | `false`  | Unwrap WHBAR.        |
| `--gas`         | `-g`  | number  | no       | `300000` | Gas limit.           |
| `--key-manager` | `-k`  | string  | no       | —        | Key manager.         |

**Output:** `{ contractId, network, transactionId, tokenSN, unwrapHbar }`
