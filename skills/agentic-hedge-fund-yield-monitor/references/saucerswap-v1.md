# saucerswap-v1 plugin (yield-monitor commands)

---

### `hcli saucerswap-v1 view` _(phase 2 — observe current pool state)_

| Option      | Short | Required | Description         |
| ----------- | ----- | -------- | ------------------- |
| `--api-key` |       | **yes**  | SaucerSwap API key. |
| `--token-a` | `-a`  | **yes**  | First token.        |
| `--token-b` | `-b`  | **yes**  | Second token.       |

**Output:** `{ network, poolContractId, tokenA, tokenB, reserveA, reserveB, lpTokenId }`

Pipe `reserveA`, `reserveB`, `decimalsA`, `decimalsB` into `scripts/implied-price.mjs` to get `currentPriceAinB`.

---

### `hcli saucerswap-v1 withdraw` [batchify] _(phase 4 — full V1 exit)_

| Option           | Short | Required | Default   | Description                                                                |
| ---------------- | ----- | -------- | --------- | -------------------------------------------------------------------------- |
| `--token-a`      | `-a`  | **yes**  | —         | First token.                                                               |
| `--token-b`      | `-b`  | **yes**  | —         | Second token.                                                              |
| `--liquidity`    | `-l`  | **yes**  | —         | LP amount to remove (display uses 8 decimals, or raw with `"t"`).          |
| `--min-amount-a` |       | no       | —         | Minimum token A returned.                                                  |
| `--min-amount-b` |       | no       | —         | Minimum token B returned.                                                  |
| `--slippage`     | `-s`  | no       | `0.5`     | Slippage % (used to derive min amounts when min-amount flags are omitted). |
| `--deadline`     | `-d`  | no       | `180`     | Deadline seconds.                                                          |
| `--gas`          | `-g`  | no       | `2800000` | Gas limit (higher than swap — removal is heavier).                         |

**Example (full exit):**

```
hcli saucerswap-v1 withdraw --token-a SAUCE --token-b USDC \
  --liquidity $LP_BALANCE --slippage 2.0 --format json
```

**Output:** `{ contractId, network, transactionId, liquidity }`

`$LP_BALANCE` comes from `account balance` filtered by `lpTokenId` from the `position-entered` audit entry. LP tokens have 8 decimals — pass the display amount (e.g. `"50.12345678"`) or append `"t"` for raw base units.
