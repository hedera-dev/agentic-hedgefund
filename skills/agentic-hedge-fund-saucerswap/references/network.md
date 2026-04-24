# network plugin

Inspect and switch the active Hedera network, and set / get the operator that signs transactions.

**The skill always passes `--format json` — except on `network use` and `network set-operator`, which are one-shot setup commands the caller runs manually during Prerequisites.**

---

### `hcli network list` *(used by the skill — phase 1)*

Inspect available networks and the active one.

**Options:** none.

**Example:**

```
hcli network list --format json
```

**Output (`list`-style):** `{ networks[]: [{ name, isActive, mirrorNodeUrl, rpcUrl, operatorId?, mirrorNodeHealth?, rpcHealth? }], activeNetwork }`

**How the skill uses it:** Phase 1 reads `activeNetwork` and aborts unless it equals `"testnet"`.

---

### `hcli network list`

Same as `view` in current versions — returns the full network table.

**Options:** none.

**Output:** `{ networks[]: [...], activeNetwork }`

---

### `hcli network use` *(caller runs once in Prerequisites)*

Switch the global active network.

| Option      | Short | Type   | Required | Default | Description                                   |
| ----------- | ----- | ------ | -------- | ------- | --------------------------------------------- |
| `--global`  | `-g`  | string | **yes**  | —       | `testnet`, `mainnet`, `previewnet`, `localnet`. |

**Example:**

```
hcli network use --global testnet
```

**Output:** `{ activeNetwork }`

**How the skill uses it:** the skill never invokes this itself. It is documented so the caller can satisfy the Prerequisites section of [../SKILL.md](../SKILL.md).

---

### `hcli network set-operator` *(caller runs once in Prerequisites)*

Register the operator account + key for the active network.

| Option          | Short | Type   | Required | Default | Description                                                                |
| --------------- | ----- | ------ | -------- | ------- | -------------------------------------------------------------------------- |
| `--operator`    | `-o`  | string | **yes**  | —       | `accountId:privateKey` pair, key reference, or account alias.              |
| `--key-manager` | `-k`  | string | no       | —       | `local` or `local_encrypted`.                                              |

**Example:**

```
hcli network set-operator --operator 0.0.5000001:302e0201003005...
```

**Output:** `{ network, operator: { accountId, keyRefId, publicKey? } }`

**How the skill uses it:** Same as `network use` — called manually by the caller, documented here as reference. The skill never silently rewrites the operator.

---

### `hcli network get-operator`

Return the operator currently registered for the active network.

**Options:** none.

**Output:** `{ network, operator?: { accountId, keyRefId, publicKey? } }`
