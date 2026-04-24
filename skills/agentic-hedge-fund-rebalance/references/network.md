# network plugin (rebalance commands)

### `hcli network list` *(used by the skill — phase 1)*

No options required.

**Output:** `{ network, … }`

**How the skill uses it:** Phase 1 — confirm active network (`testnet` or `mainnet`) and derive the V1 router contract ID.

---

### `hcli network get-operator` *(used by the skill — phase 1)*

No options required.

**Output:** `{ operatorAccountId, network }`

**How the skill uses it:** Phase 1 — read the operator account ID automatically. Never prompt the caller for the operator.
