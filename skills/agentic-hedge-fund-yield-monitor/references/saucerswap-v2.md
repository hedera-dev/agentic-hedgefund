# saucerswap-v2 plugin (yield-monitor commands)

---

### `hcli saucerswap-v2 view-pool` _(phase 2 — observe current V2 pool state)_

| Option       | Short | Required | Description                          |
| ------------ | ----- | -------- | ------------------------------------ |
| `--api-key`  |       | **yes**  | SaucerSwap API key.                  |
| `--token-a`  | `-a`  | **yes**  | First token.                         |
| `--token-b`  | `-b`  | **yes**  | Second token.                        |
| `--fee-tier` |       | **yes**  | Fee tier: 500, 1500, 3000, or 10000. |

**Output:** `{ network, poolAddress, tokenA, tokenB, feeTier, tickCurrent, liquidity, sqrtRatioX96 }`

Pipe `sqrtRatioX96`, `tickCurrent`, `decimalsA`, `decimalsB` into `scripts/implied-price.mjs` to get `currentPriceAinB`. Pass `tickCurrent`, `tickLower`, `tickUpper` into `scripts/il-calculator.mjs` for out-of-range detection.

---

### `hcli saucerswap-v2 list-positions` _(phase 4 — get current liquidity before exit)_

| Option      | Short | Required | Description          |
| ----------- | ----- | -------- | -------------------- |
| `--api-key` |       | **yes**  | API key.             |
| `--account` | `-a`  | **yes**  | Account ID or alias. |

**Output:** `{ network, accountId, positionCount, positions: [{ tokenSN, feeTier, tickLower, tickUpper, liquidity, tokensOwed0, tokensOwed1 }] }`

Filter by `tokenSN` matching the `positionSerial` from the `position-entered` audit entry. Read the current `liquidity` value — it may differ from the entry value if `increase-liquidity` / `decrease-liquidity` was called manually.

---

### `hcli saucerswap-v2 decrease-liquidity` [batchify] _(phase 4 — full V2 exit)_

| Option          | Short | Type    | Required | Default  | Description                                         |
| --------------- | ----- | ------- | -------- | -------- | --------------------------------------------------- |
| `--position`    | `-p`  | number  | **yes**  | —        | NFT serial number.                                  |
| `--liquidity`   | `-l`  | string  | **yes**  | —        | Full liquidity amount from `list-positions`.        |
| `--burn`        |       | boolean | no       | `false`  | Burn NFT after exit. Set to `true` for a full exit. |
| `--unwrap-hbar` |       | boolean | no       | `false`  | Unwrap WHBAR to HBAR on exit.                       |
| `--slippage`    | `-s`  | number  | no       | `0.5`    | Slippage %.                                         |
| `--deadline`    | `-d`  | number  | no       | `180`    | Deadline seconds.                                   |
| `--gas`         | `-g`  | number  | no       | `300000` | Gas limit.                                          |

**Example (full exit with HBAR unwrap):**

```
hcli saucerswap-v2 decrease-liquidity \
  --position $POSITION_SERIAL --liquidity $CURRENT_LIQUIDITY \
  --burn --unwrap-hbar --slippage 2.0 --format json
```

**Output:** `{ contractId, network, transactionId, tokenSN, liquidity, unwrapHbar, burn }`

**Important:** `decrease-liquidity` internally bundles a `collect()` call using `MAX_UINT128`, sweeping both the removed liquidity amounts AND all previously accrued fees in a single transaction. No separate `collect-fees` call is needed.

No allowance required — the caller is the NFT owner.
