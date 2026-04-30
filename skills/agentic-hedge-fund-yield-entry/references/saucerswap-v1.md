# saucerswap-v1 plugin (yield-entry commands)

Router contract IDs (spender for `token allowance-ft`): Testnet `0.0.19264`, Mainnet `0.0.3045981`.

---

### `hcli saucerswap-v1 list` _(phase 2 — V1 discovery)_

| Option      | Short | Required | Description                                    |
| ----------- | ----- | -------- | ---------------------------------------------- |
| `--api-key` |       | **yes**  | SaucerSwap API key.                            |
| `--token`   | `-t`  | no       | Filter by token ID, symbol, or name substring. |

**Example:**

```
hcli saucerswap-v1 list --api-key "$API_KEY" --token SAUCE --format json
```

**Output:** `{ network, poolCount, pools: [{ id, contractId, tokenA, tokenB, reserveA, reserveB }] }`

Filter pools matching both `tokenA` and `tokenB`. Use `reserveA` as the V1 depth metric.

---

### `hcli saucerswap-v1 view` _(phase 5 — LP token ID retrieval)_

| Option      | Short | Required | Description   |
| ----------- | ----- | -------- | ------------- |
| `--api-key` |       | **yes**  | API key.      |
| `--token-a` | `-a`  | **yes**  | First token.  |
| `--token-b` | `-b`  | **yes**  | Second token. |

**Output:** `{ network, poolContractId, tokenA, tokenB, reserveA, reserveB, lpTokenId }`

Used post-deposit to get `lpTokenId` for the `position-entered` audit entry.

---

### `hcli saucerswap-v1 deposit` [batchify] _(phase 4 — V1 deposit)_

| Option       | Short | Required | Default   | Description                 |
| ------------ | ----- | -------- | --------- | --------------------------- |
| `--token-a`  | `-a`  | **yes**  | —         | First token.                |
| `--token-b`  | `-b`  | **yes**  | —         | Second token.               |
| `--amount-a` |       | **yes**  | —         | Desired amount for token A. |
| `--amount-b` |       | **yes**  | —         | Desired amount for token B. |
| `--slippage` | `-s`  | no       | `0.5`     | Slippage %.                 |
| `--deadline` | `-d`  | no       | `180`     | Deadline seconds.           |
| `--gas`      | `-g`  | no       | `1000000` | Gas limit.                  |

**Output:** `{ contractId, network, transactionId }`

**Allowance requirement:** both tokens → V1 router as standalone `token allowance-ft` calls before this command (phase 3).
