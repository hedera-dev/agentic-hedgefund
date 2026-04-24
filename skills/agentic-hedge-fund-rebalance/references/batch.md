# batch plugin

HIP-551 atomic batch transactions: group multiple signed transactions and execute them all-or-nothing in a single network submission (max 50 transactions per batch).

**The skill always passes `--format json` — treat it as implicit on every command below.**

---

### `hcli batch create` *(used by the skill — phase 3)*

Create a new named batch and register a signing key for it.

| Option          | Short | Type   | Required | Default        | Description                                            |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------ |
| `--name`        | `-n`  | string | **yes**  | —              | Local alias for the batch.                             |
| `--key`         | `-k`  | string | no       | operator       | Key to sign all transactions in the batch.             |
| `--key-manager` | `-m`  | string | no       | config default | Key manager: `local` or `local_encrypted`.             |

**Example:**

```
hcli batch create --name rebalance-20260424-101530 --key fund-operator --format json
```

**Output:** `{ name, keyRefId }`

**How the skill uses it:** Phase 3, step 1. The skill passes `--key $OP` where `$OP` is the operator account ID read in phase 1.

---

### `hcli batch execute` *(used by the skill — phase 4)*

Sign and submit all transactions in a named batch as a single `BatchTransaction`.

| Option   | Short | Type   | Required | Default | Description         |
| -------- | ----- | ------ | -------- | ------- | ------------------- |
| `--name` | `-n`  | string | **yes**  | —       | Batch to execute.   |

**Example:**

```
hcli batch execute --name rebalance-20260424-101530 --format json
```

**Output:** `{ batchName, transactionId, success, network }`

`success` is `true` only when the on-chain `BatchTransaction` receipt status is `SUCCESS`. Parse it explicitly — do not assume success from exit code alone.

**How the skill uses it:** Phase 4. On failure (`success: false` or CLI error), immediately call `batch delete` before appending the error audit entry.

---

### `hcli batch delete` *(used by the skill — on failure)*

Remove a batch and all its staged transactions from local state.

| Option    | Short | Type   | Required | Default | Description                                                        |
| --------- | ----- | ------ | -------- | ------- | ------------------------------------------------------------------ |
| `--name`  | `-n`  | string | **yes**  | —       | Batch to delete.                                                   |
| `--order` | `-o`  | number | no       | —       | If provided, removes only the transaction at that position.        |

**Example:**

```
hcli batch delete --name rebalance-20260424-101530 --format json
```

**Output:** `{ name, order? }`

**How the skill uses it:** Any phase after `batch create` on the failure path. Always delete the full batch (no `--order`).

---

### `hcli batch list` *(diagnostic)*

List all batches currently held in local state.

**Output:** `{ batches: [{ name, transactionCount, keyRefId }] }`

The skill does not call this on the happy path. Use it to investigate leftover batches if an earlier run failed before `batch delete` could execute.
