# saucerswap-v2 plugin (yield-entry commands)

NFT Position Manager (allowance spender for `mint-position`): Testnet `0.0.1308184`, Mainnet `0.0.4053945`.

---

### `hcli saucerswap-v2 list-pools` _(phase 2 — V2 discovery)_

| Option       | Short | Required | Description                          |
| ------------ | ----- | -------- | ------------------------------------ |
| `--api-key`  |       | **yes**  | SaucerSwap API key.                  |
| `--token`    | `-t`  | no       | Filter by token ID, symbol, or name. |
| `--fee-tier` |       | no       | Filter by fee tier.                  |

**Output:** `{ network, poolCount, pools: [{ contractId, tokenA, tokenB, feeTier }] }`

Does not include liquidity. Call `view-pool` for each matching fee tier to get depth data.

---

### `hcli saucerswap-v2 view-pool` _(phase 2 — V2 depth measurement)_

| Option       | Short | Required | Description                          |
| ------------ | ----- | -------- | ------------------------------------ |
| `--api-key`  |       | **yes**  | API key.                             |
| `--token-a`  | `-a`  | **yes**  | First token.                         |
| `--token-b`  | `-b`  | **yes**  | Second token.                        |
| `--fee-tier` |       | **yes**  | Fee tier: 500, 1500, 3000, or 10000. |

**Output:** `{ network, poolAddress, tokenA, tokenB, feeTier, tickCurrent, liquidity, sqrtRatioX96 }`

Skip pools where `poolAddress`, `liquidity`, or `sqrtRatioX96` is `null`. Compute V2 depth: `virtualReserve0 = liquidity * 2^96 / sqrtRatioX96` (BigInt math).

---

### `hcli saucerswap-v2 mint-position` [batchify] _(phase 4 — V2 deposit)_

| Option            | Short | Required | Default  | Description                 |
| ----------------- | ----- | -------- | -------- | --------------------------- |
| `--token-a`       | `-a`  | **yes**  | —        | First token.                |
| `--token-b`       | `-b`  | **yes**  | —        | Second token.               |
| `--fee-tier`      |       | **yes**  | —        | Fee tier.                   |
| `--amount-a`      |       | **yes**  | —        | Desired amount for token A. |
| `--amount-b`      |       | **yes**  | —        | Desired amount for token B. |
| `--range-percent` |       | no       | `5`      | Symmetric ±% tick range.    |
| `--slippage`      | `-s`  | no       | `0.5`    | Slippage %.                 |
| `--deadline`      | `-d`  | no       | `180`    | Deadline seconds.           |
| `--gas`           | `-g`  | no       | `900000` | Gas limit.                  |

**Output:** `{ contractId, network, transactionId, feeTier, tickLower, tickUpper, amount0Desired, amount1Desired }`

The NFT serial is **not** in this output. Call `list-positions` in phase 5 to retrieve it.

**Allowance requirement:** both tokens → NFT Position Manager as standalone `token allowance-ft` before this call (phase 3).

---

### `hcli saucerswap-v2 list-positions` _(phase 5 — NFT serial retrieval)_

| Option      | Short | Required | Description          |
| ----------- | ----- | -------- | -------------------- |
| `--api-key` |       | **yes**  | API key.             |
| `--account` | `-a`  | **yes**  | Account ID or alias. |

**Output:** `{ network, accountId, positionCount, positions: [{ tokenSN, feeTier, tickLower, tickUpper, liquidity, tokensOwed0, tokensOwed1 }] }`

Match the new position by `feeTier`, `tickLower`, `tickUpper` from the mint output. Record `tokenSN` and `liquidity` in the `position-entered` audit entry.
