# saucerswap-v1 plugin (rebalance commands)

Only the commands used by this skill are documented here. For the full plugin reference including `view`, `list`, `buy`, `withdraw` see the `agentic-hedge-fund-saucerswap` skill.

Router contract IDs (spender for `token allowance-ft`):

- Mainnet: `0.0.3045981`
- Testnet: `0.0.19264`

Token references accept: Hedera ID, alias, EVM address, or `HBAR`. Amount flags use display units; append `"t"` for raw base units.

---

### `hcli saucerswap-v1 swap` [batchify] _(used by the skill — phase 3e)_

Exact-input trade: sell exactly `--amount` of `--from`, receive at least the slippage-adjusted minimum of `--to`.

| Option         | Short | Type   | Required | Default     | Description                                           |
| -------------- | ----- | ------ | -------- | ----------- | ----------------------------------------------------- |
| `--from`       | `-f`  | string | **yes**  | —           | Input token.                                          |
| `--to`         | `-t`  | string | **yes**  | —           | Output token.                                         |
| `--amount`     | `-a`  | string | **yes**  | —           | Exact input amount. Display units, or raw with `"t"`. |
| `--min-output` | `-m`  | string | no       | —           | Explicit minimum output. Overrides slippage when set. |
| `--slippage`   | `-s`  | number | no       | `0.5`       | Slippage %, used when `--min-output` is omitted.      |
| `--deadline`   | `-d`  | number | no       | `180`       | Deadline seconds from now.                            |
| `--gas`        | `-g`  | number | no       | `1_000_000` | Gas limit.                                            |
| `--batch`      | `-B`  | string | no       | —           | Batch name — defers execution, adds to batch instead. |

**Example (inside batch):**

```
hcli saucerswap-v1 swap --from HBAR --to SAUCE --amount 2000 --slippage 1.0 --batch rebalance-20260424-101530 --format json
```

**Output:** `{ contractId, network, transactionId, direction, amountIn, amountOutMin }`

When `--batch` is supplied the transaction is staged, not submitted. The command returns immediately with no `transactionId`.

---

### `hcli saucerswap-v1 deposit` [batchify] _(used by the skill — phase 3f)_

Add liquidity to an existing V1 pool. The router accepts desired amounts and adjusts to the current pool ratio; any excess is returned to the caller.

| Option       | Short | Type   | Required | Default     | Description                            |
| ------------ | ----- | ------ | -------- | ----------- | -------------------------------------- |
| `--token-a`  | `-a`  | string | **yes**  | —           | First token.                           |
| `--token-b`  | `-b`  | string | **yes**  | —           | Second token.                          |
| `--amount-a` |       | string | **yes**  | —           | Desired amount of token A.             |
| `--amount-b` |       | string | **yes**  | —           | Desired amount of token B.             |
| `--slippage` | `-s`  | number | no       | `0.5`       | Slippage % applied to minimum amounts. |
| `--deadline` | `-d`  | number | no       | `180`       | Deadline seconds.                      |
| `--gas`      | `-g`  | number | no       | `1_000_000` | Gas limit.                             |
| `--batch`    | `-B`  | string | no       | —           | Batch name — defers execution.         |

**Example (inside batch):**

```
hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC --amount-a 500 --amount-b 1000 --slippage 2.0 --batch rebalance-20260424-101530 --format json
```

**Output:** `{ contractId, network, transactionId }`

**Allowance requirement:** both `--token-a` and `--token-b` must have an active `token allowance-ft` to the router spender (set earlier in the same batch, steps 3b–3c). HBAR sides use `payableAmount` and do not require an allowance.
