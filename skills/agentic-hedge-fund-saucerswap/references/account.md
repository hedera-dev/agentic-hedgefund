# account plugin

Manage Hedera accounts: create, import, view, balances, list, update, delete.

**The skill always passes `--format json` — treat it as implicit on every command below.**

---

### `hcli account create` [batchify] [scheduled]

Create a new Hedera account.

| Option                | Short | Type   | Required | Default        | Description                                                                                            |
| --------------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `--balance`           | `-b`  | string | **yes**  | —              | Initial HBAR balance. Default: display units. Add `"t"` for base units.                                |
| `--auto-associations` | `-a`  | number | no       | `0`            | Max number of automatic token associations allowed.                                                    |
| `--name`              | `-n`  | string | no       | —              | Alias for the created account.                                                                         |
| `--key-manager`       | `-k`  | string | no       | config default | `local` or `local_encrypted`.                                                                          |
| `--key-type`          | `-t`  | string | no       | `ecdsa`        | `ecdsa` or `ed25519`. Mutually exclusive with `--key`.                                                 |
| `--key`               | `-K`  | string | no       | —              | Existing key (private/public, key reference `kr_xxx`, or alias). Mutually exclusive with `--key-type`. |

**Example:**

```
hcli account create --balance 10 --name myAccount --key-type ecdsa --format json
```

**Output:** `{ accountId, name?, type, network, transactionId, evmAddress, publicKey }`

---

### `hcli account update` [batchify] [scheduled]

Update an existing account on-chain and/or in local state.

| Option                          | Short | Type    | Required | Default | Description                                           |
| ------------------------------- | ----- | ------- | -------- | ------- | ----------------------------------------------------- |
| `--account`                     | `-a`  | string  | **yes**  | —       | Account ID or alias.                                  |
| `--key`                         | `-K`  | string  | no       | —       | New key (private/public, key reference, or alias).    |
| `--key-manager`                 | `-k`  | string  | no       | —       | Key manager.                                          |
| `--memo`                        | `-m`  | string  | no       | —       | Account memo (max 100 chars). Pass `"null"` to clear. |
| `--max-auto-associations`       |       | number  | no       | —       | `-1` for unlimited, `0` to disable.                   |
| `--staked-account-id`           |       | string  | no       | —       | Stake to an account; `"null"` to clear.               |
| `--staked-node-id`              |       | number  | no       | —       | Stake to a node; `"null"` to clear.                   |
| `--decline-staking-reward`      |       | boolean | no       | —       | Decline staking reward.                               |
| `--auto-renew-period`           |       | number  | no       | —       | Auto-renew period in seconds.                         |
| `--receiver-signature-required` |       | boolean | no       | —       | Require receiver signature for transfers.             |

**Output:** `{ accountId, network, transactionId, updatedFields[] }`

---

### `hcli account balance` _(used by the skill — phases 1, 5, 7)_

Retrieve the balance for an account ID or alias.

| Option        | Short | Type    | Required | Default | Description                              |
| ------------- | ----- | ------- | -------- | ------- | ---------------------------------------- |
| `--account`   | `-a`  | string  | **yes**  | —       | Account ID or alias.                     |
| `--hbar-only` | `-H`  | boolean | no       | `false` | Show only HBAR balance.                  |
| `--token`     | `-t`  | string  | no       | —       | Filter to one token ID or alias.         |
| `--raw`       | `-r`  | boolean | no       | `false` | Raw units (tinybars / base token units). |

**Example:**

```
hcli account balance --account myAccount --format json
hcli account balance --account 0.0.123456 --token 0.0.429274 --format json
```

**Output:** `{ accountId, hbarBalance?, hbarBalanceDisplay?, hbarOnly?, tokenOnly?, raw?, network, tokenBalances?: [{ tokenId, name?, symbol?, alias?, balance, balanceDisplay?, decimals? }] }`

**How the skill uses it:**

- Phase 1: verifies `hbarBalance` ≥ `balanceFloorHbar` (defaults to `1` HBAR).
- Phase 6: queries with `--token $TOUT` — an empty `tokenBalances[]` means the output token is not associated and must be associated first.
- Phase 7: captures `balancesBefore` and `balancesAfter` for the `trade` audit entry.

---

### `hcli account list`

List all accounts stored in the local address book.

| Option      | Short | Type    | Required | Default | Description                                   |
| ----------- | ----- | ------- | -------- | ------- | --------------------------------------------- |
| `--private` | `-p`  | boolean | no       | `false` | Include private-key reference IDs in listing. |

**Output:** `{ accounts[]: [{ name?, accountId, type, network, evmAddress, keyRefId? }], totalCount }`

---

### `hcli account import`

Import an existing Hedera account into local state.

| Option          | Short | Type   | Required | Default        | Description                                                                   |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------------------------- |
| `--key`         | `-K`  | string | **yes**  | —              | Credentials in `accountId:privateKey` format (e.g. `"0.0.123456:abc123..."`). |
| `--name`        | `-n`  | string | no       | —              | Alias for the imported account.                                               |
| `--key-manager` | `-k`  | string | no       | config default | `local` or `local_encrypted`.                                                 |

**Example:**

```
hcli account import --key "0.0.123456:302e020100300506..." --name alice --format json
```

**Output:** `{ accountId, name?, type, network, balance, evmAddress }`

---

### `hcli account view` _(used by the skill — phase 1)_

View detailed information about an account.

| Option      | Short | Type   | Required | Default | Description          |
| ----------- | ----- | ------ | -------- | ------- | -------------------- |
| `--account` | `-a`  | string | **yes**  | —       | Account ID or alias. |

**Example:**

```
hcli account view --account alice --format json
```

**Output:** `{ accountId, balance, evmAddress?, publicKey?, balanceTimestamp, network }`

**How the skill uses it:** Phase 1 liveness probe — a successful response confirms the operator exists on the active network before we touch any SaucerSwap command.

---

### `hcli account delete`

Delete an account (locally, on-chain, or both).

| Option          | Short | Type    | Required | Default | Description                                                                                         |
| --------------- | ----- | ------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `--account`     | `-a`  | string  | **yes**  | —       | Account key (ID, id:privateKey, key reference, alias). With `--state-only`: just local reference.   |
| `--transfer-id` | `-t`  | string  | no       | —       | Receiver of remaining HBAR (Hedera ID or alias). Required for on-chain delete. Exclusive with `-s`. |
| `--state-only`  | `-s`  | boolean | no       | `false` | Remove only from local state; no `AccountDeleteTransaction`. Exclusive with `--transfer-id`.        |

**Output:** `{ deletedAccount: { name?, accountId }, removedAliases?: [], network, transactionId?, stateOnly? }`

---

### `hcli account clear`

Remove **all** accounts from the local address book. Requires confirmation.

**Options:** none.

**Output:** `{ clearedCount }`
