# saucerswap-v2 plugin (rebalance commands)

Commands used by this skill across all rebalance scenarios: `swap`, `mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees`, and `list-positions`. The first two are used in the atomic batch; the remaining four are used as standalone pre- or post-batch operations.

Contract IDs (also in REFERENCE.md §3):

| Contract         | Testnet       | Mainnet       |
| ---------------- | ------------- | ------------- |
| SwapRouter       | `0.0.1414040` | `0.0.3949434` |
| NFT Position Mgr | `0.0.1308184` | `0.0.4053945` |

Token references accept: Hedera ID, alias, EVM address, or `HBAR`. Amount flags use display units; append `"t"` for raw base units.

---

### `hcli saucerswap-v2 swap` [batchify] _(batch step 3e — V2 swap)_

Exact-input trade: sell exactly `--amount` of `--from`, receive at least the slippage-adjusted minimum of `--to` through the specified fee-tier pool.

| Option         | Short | Type   | Required | Default  | Description                                           |
| -------------- | ----- | ------ | -------- | -------- | ----------------------------------------------------- |
| `--from`       | `-f`  | string | **yes**  | —        | Input token.                                          |
| `--to`         | `-t`  | string | **yes**  | —        | Output token.                                         |
| `--amount`     | `-a`  | string | **yes**  | —        | Exact input amount. Display units, or raw with `"t"`. |
| `--fee-tier`   | `-e`  | number | **yes**  | —        | Pool fee tier: `500`, `1500`, `3000`, or `10000`.     |
| `--min-output` | `-o`  | string | no       | —        | Explicit minimum output. Overrides slippage when set. |
| `--slippage`   | `-s`  | number | no       | `0.5`    | Slippage %, used when `--min-output` is omitted.      |
| `--deadline`   | `-d`  | number | no       | `180`    | Deadline seconds from now.                            |
| `--gas`        | `-g`  | number | no       | `300000` | Gas limit.                                            |
| `--batch`      | `-B`  | string | no       | —        | Batch name — defers execution, adds to batch instead. |

**Example (inside batch):**

```
hcli saucerswap-v2 swap --from HBAR --to SAUCE --amount 2000 --fee-tier 3000 --slippage 1.0 --batch rebalance-20260424-101530 --format json
```

**Output:** `{ contractId, network, transactionId, amountIn, amountOutMin, feeTier }`

`contractId` is the SwapRouter. **Allowance requirement:** if `--from` is not HBAR, set `token allowance-ft` → SwapRouter before this step in the same batch (step 3a).

---

### `hcli saucerswap-v2 mint-position` [batchify] _(batch step 3f — open new V2 position)_

Open a new concentrated liquidity position NFT. Tick range auto-computed from `--range-percent` when ticks are omitted.

| Option            | Short | Type   | Required | Default  | Description                                          |
| ----------------- | ----- | ------ | -------- | -------- | ---------------------------------------------------- |
| `--token-a`       | `-a`  | string | **yes**  | —        | First token.                                         |
| `--token-b`       | `-b`  | string | **yes**  | —        | Second token.                                        |
| `--fee-tier`      |       | number | **yes**  | —        | Fee tier: `500`, `1500`, `3000`, or `10000`.         |
| `--amount-a`      |       | string | **yes**  | —        | Desired amount for token A.                          |
| `--amount-b`      |       | string | **yes**  | —        | Desired amount for token B.                          |
| `--range-percent` |       | number | no       | `5`      | Symmetric ±% tick range. Skill uses this by default. |
| `--tick-lower`    |       | number | no       | —        | Explicit lower tick (overrides `--range-percent`).   |
| `--tick-upper`    |       | number | no       | —        | Explicit upper tick (overrides `--range-percent`).   |
| `--slippage`      | `-s`  | number | no       | `0.5`    | Slippage % for minimum amounts.                      |
| `--deadline`      | `-d`  | number | no       | `180`    | Deadline seconds.                                    |
| `--gas`           | `-g`  | number | no       | `900000` | Gas limit (minting is heavier than a swap).          |
| `--batch`         | `-B`  | string | no       | —        | Batch name — defers execution.                       |

**Example (inside batch):**

```
hcli saucerswap-v2 mint-position \
  --token-a SAUCE --token-b USDC --fee-tier 3000 \
  --amount-a 500 --amount-b 1000 --range-percent 5 --slippage 2.0 \
  --batch rebalance-20260424-101530 --format json
```

**Output:** `{ contractId, network, transactionId, feeTier, tickLower, tickUpper, amount0Desired, amount1Desired }`

`contractId` is the NFT Position Manager. The minted serial is not in this output — query `list-positions` post-execution. **Allowance requirement:** both tokens → NFT Position Manager (steps 3b–3c in the batch). HBAR sides use `payableAmount`.

---

### `hcli saucerswap-v2 increase-liquidity` [batchify] _(standalone — add to existing V2 position)_

Add liquidity to an existing position NFT. Use when the rebalance adds to a position the operator already holds rather than opening a fresh one.

| Option          | Short | Type   | Required | Default  | Description                                              |
| --------------- | ----- | ------ | -------- | -------- | -------------------------------------------------------- |
| `--position`    | `-p`  | number | **yes**  | —        | LP position NFT serial (tokenId).                        |
| `--amount-a`    |       | string | **yes**  | —        | Amount for pool token0.                                  |
| `--amount-b`    |       | string | **yes**  | —        | Amount for pool token1.                                  |
| `--hbar-amount` |       | string | no       | —        | Payable HBAR (display or raw `"t"`) for WHBAR-side adds. |
| `--slippage`    | `-s`  | number | no       | `0.5`    | Slippage %.                                              |
| `--deadline`    | `-d`  | number | no       | `180`    | Deadline seconds.                                        |
| `--gas`         | `-g`  | number | no       | `330000` | Gas limit.                                               |
| `--batch`       | `-B`  | string | no       | —        | Batch name — defers execution.                           |

**Example (standalone, before batch):**

```
hcli saucerswap-v2 increase-liquidity --position 42 --amount-a 500 --amount-b 1000 --slippage 2.0 --format json
```

**Output:** `{ contractId, network, transactionId, tokenSN, amount0Desired, amount1Desired }`

**Allowance requirement:** both pool tokens → NFT Position Manager via standalone `token allowance-ft` calls before this command.

---

### `hcli saucerswap-v2 decrease-liquidity` [batchify] _(standalone — remove from V2 position before rebalancing)_

Remove liquidity from an existing position. Optionally unwrap WHBAR and burn the NFT on full exit.

| Option          | Short | Type    | Required | Default  | Description                         |
| --------------- | ----- | ------- | -------- | -------- | ----------------------------------- |
| `--position`    | `-p`  | number  | **yes**  | —        | NFT serial number.                  |
| `--liquidity`   | `-l`  | string  | **yes**  | —        | Liquidity amount to remove.         |
| `--unwrap-hbar` |       | boolean | no       | `false`  | Unwrap WHBAR to HBAR after removal. |
| `--burn`        |       | boolean | no       | `false`  | Burn the NFT after a full exit.     |
| `--slippage`    | `-s`  | number  | no       | `0.5`    | Slippage %.                         |
| `--deadline`    | `-d`  | number  | no       | `180`    | Deadline seconds.                   |
| `--gas`         | `-g`  | number  | no       | `300000` | Gas limit.                          |
| `--batch`       | `-B`  | string  | no       | —        | Batch name — defers execution.      |

**Example:**

```
hcli saucerswap-v2 decrease-liquidity --position 42 --liquidity 1000000 --unwrap-hbar --format json
```

**Output:** `{ contractId, network, transactionId, tokenSN, liquidity, unwrapHbar, burn }`

No allowance required — the caller is the NFT owner.

---

### `hcli saucerswap-v2 collect-fees` [batchify] _(standalone — harvest fees before rebalancing)_

Collect accrued swap fees from an existing position without removing liquidity. Run before a rebalance to capture outstanding earnings.

| Option          | Short | Type    | Required | Default  | Description                    |
| --------------- | ----- | ------- | -------- | -------- | ------------------------------ |
| `--position`    | `-p`  | number  | **yes**  | —        | NFT serial number.             |
| `--unwrap-hbar` |       | boolean | no       | `false`  | Unwrap WHBAR to HBAR.          |
| `--gas`         | `-g`  | number  | no       | `300000` | Gas limit.                     |
| `--batch`       | `-B`  | string  | no       | —        | Batch name — defers execution. |

**Example:**

```
hcli saucerswap-v2 collect-fees --position 42 --unwrap-hbar --format json
```

**Output:** `{ contractId, network, transactionId, tokenSN, unwrapHbar }`

No allowance required — the caller is the NFT owner.

---

### `hcli saucerswap-v2 list-positions` _(standalone — post-execution verification)_

List V2 NFT positions held by an account. Use after `mint-position` or `increase-liquidity` to verify the position was created and get its serial.

| Option      | Short | Type   | Required | Description                        |
| ----------- | ----- | ------ | -------- | ---------------------------------- |
| `--api-key` |       | string | **yes**  | SaucerSwap API key (`x-api-key`).  |
| `--account` | `-a`  | string | **yes**  | Account ID, EVM address, or alias. |

**Example:**

```
hcli saucerswap-v2 list-positions --api-key "$SAUCERSWAP_API_KEY" --account $OP --format json
```

**Output:** `{ network, accountId, positionCount, positions: [{ tokenSN, feeTier, tickLower, tickUpper, liquidity, tokensOwed0, tokensOwed1 }] }`

Note: `list-positions` requires `--api-key`. It is the only command in this skill that does.
