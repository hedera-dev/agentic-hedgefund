# hbar plugin

Transfer native HBAR between accounts. Single command.

**The skill always passes `--format json` — treat it as implicit below.**

---

### `hcli hbar transfer` [batchify] [scheduled] *(optional remediation only)*

Transfer HBAR between two accounts.

| Option          | Short | Type   | Required | Default        | Description                                                                                          |
| --------------- | ----- | ------ | -------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount. Default: display units. Append `"t"` for tinybars. Example: `"1"` = 1 HBAR, `"100t"` = 100 tinybar. |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account ID or alias.                                                                     |
| `--from`        | `-f`  | string | no       | operator       | Source: `accountId:privateKey`, key reference, or alias.                                             |
| `--memo`        | `-m`  | string | no       | —              | Transfer memo.                                                                                       |
| `--key-manager` | `-k`  | string | no       | config default | `local` or `local_encrypted`.                                                                        |

**Example:**

```
hcli hbar transfer --to myOperator --amount 25 --memo "topup for swap" --format json
```

**Output:** `{ transactionId, fromAccountId, toAccountId, amountTinybar, network, memo?, status? }`

**How the skill uses it:** Never automatically. Phase 1 may *suggest* this command when the operator's HBAR balance is below the caller-supplied floor, but the skill will not fire it without explicit caller consent — topping up the operator is a governance action, not a retry.
