# token plugin (rebalance commands)

Only the commands used by this skill are documented here.

---

### `hcli token view` _(used by the skill — phase 1)_

| Option    | Short | Type   | Required | Description        |
| --------- | ----- | ------ | -------- | ------------------ |
| `--token` | `-T`  | string | **yes**  | Token ID or alias. |

**Output:** `{ tokenId, name, symbol, decimals, type, network, … }`

**How the skill uses it:** Phase 1 — fetch `symbol` and `decimals` for each raw token ID before importing.

---

### `hcli token import` _(used by the skill — phase 1)_

| Option    | Short | Type   | Required | Description                                      |
| --------- | ----- | ------ | -------- | ------------------------------------------------ |
| `--token` | `-T`  | string | **yes**  | Token ID to import.                              |
| `--name`  | `-n`  | string | no       | Alias to assign (skill uses `symbol` from view). |

**Output:** `{ tokenId, name, symbol, type, network, alias? }`

**How the skill uses it:** Phase 1 — called for every unique raw Hedera ID parameter. Alias collision rule: if `$SYMBOL` is taken by a different token, use `${SYMBOL}_${LAST4}`.

---

### `hcli token associate` [batchify] _(used by the skill — phase 2, standalone)_

| Option          | Short | Type   | Required | Description                 |
| --------------- | ----- | ------ | -------- | --------------------------- |
| `--token`       | `-T`  | string | **yes**  | Token to associate.         |
| `--account`     | `-a`  | string | **yes**  | Account to associate it to. |
| `--key-manager` | `-k`  | string | no       | Key manager.                |

**Output:** `{ transactionId?, accountId, tokenId, associated, alreadyAssociated?, network }`

**How the skill uses it:** Phase 2 — run as a **standalone transaction** (no `--batch`) only when the operator is missing an association. If `alreadyAssociated` is true (or `TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT` error), skip silently.

---

### `hcli token allowance-ft` [batchify] _(used by the skill — phase 3a–c, inside batch)_

| Option      | Short | Type   | Required | Description                                     |
| ----------- | ----- | ------ | -------- | ----------------------------------------------- |
| `--token`   | `-T`  | string | **yes**  | Token to approve.                               |
| `--owner`   | `-o`  | string | **yes**  | Owner account (the operator).                   |
| `--spender` | `-s`  | string | **yes**  | Spender: V1 router contract ID.                 |
| `--amount`  | `-a`  | string | **yes**  | Allowance in display units (or raw with `"t"`). |
| `--batch`   | `-B`  | string | no       | Batch name — stages inside batch.               |

**Output:** `{ tokenId, ownerAccountId, spenderAccountId, amount, transactionId, network }`

**How the skill uses it:** Always added to the batch with `--batch $BATCH_NAME`. Amounts use display units matching the caller's parameter values.

---

### `hcli token transfer-ft` [batchify] _(used by the skill — phase 3d, inside batch)_

| Option     | Short | Type   | Required | Description                                |
| ---------- | ----- | ------ | -------- | ------------------------------------------ |
| `--token`  | `-T`  | string | **yes**  | Fungible token to transfer.                |
| `--from`   | `-f`  | string | **yes**  | Source account (treasury).                 |
| `--to`     | `-t`  | string | **yes**  | Destination account (operator).            |
| `--amount` | `-a`  | string | **yes**  | Amount in display units or raw with `"t"`. |
| `--batch`  | `-B`  | string | no       | Batch name — stages inside batch.          |

**Output:** `{ transactionId, tokenId, from, to, amount, network }`

**How the skill uses it:** Added to the batch with `--batch $BATCH_NAME` as phase 3d.
