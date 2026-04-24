# account plugin (rebalance commands)

### `hcli account balance` *(used by the skill — phases 2, 4, 5)*

| Option      | Short | Type   | Required | Description                          |
| ----------- | ----- | ------ | -------- | ------------------------------------ |
| `--account` | `-a`  | string | **yes**  | Account ID or alias to query.        |

**Output:** `{ accountId, hbar, tokens: [{ tokenId, balance }], network }`

**How the skill uses it:**
- Phase 2: checks HBAR balance (for swap pre-flight) and token balances (for association checks and treasury transfer validation).
- Phase 4: captures `balancesBefore` immediately before `batch execute`.
- Phase 5: captures `balancesAfter` immediately after successful execution.

---

### `hcli account view` *(diagnostic)*

| Option      | Short | Type   | Required | Description                |
| ----------- | ----- | ------ | -------- | -------------------------- |
| `--account` | `-a`  | string | **yes**  | Account ID or alias.       |

**Output:** `{ accountId, evmAddress, balance, network, … }`

Not called on the happy path. Use to inspect account state when pre-flight fails.
