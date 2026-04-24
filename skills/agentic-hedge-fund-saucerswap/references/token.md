# token plugin

Manage HTS tokens: view, associate, transfer, allowance, mint / burn, and more. The skill uses `view`, `associate`, and `allowance-ft` on the happy path, plus `transfer-ft` / `transfer-nft` only as optional remediation.

**The skill always passes `--format json` — treat it as implicit on every command below.**

---

### `hcli token view` *(used by the skill — phase 2)*

View token information. Works for both fungible tokens and NFTs (pass `--serial` to inspect a specific NFT).

| Option     | Short | Type   | Required | Default | Description                                         |
| ---------- | ----- | ------ | -------- | ------- | --------------------------------------------------- |
| `--token`  | `-T`  | string | **yes**  | —       | Token identifier: alias or token ID.                |
| `--serial` | `-S`  | string | no       | —       | Serial number of a specific NFT instance (NFT only).|

**Example:**

```
hcli token view -T 0.0.429274 --format json
hcli token view -T SAUCE -S 42 --format json
```

**Output:** `{ tokenId, name, symbol, type, network, totalSupply, maxSupply, supplyType, decimals?, treasury?, memo?, createdTimestamp?, freezeDefault, autoRenewPeriodSeconds?, autoRenewAccountId?, expirationTime?, adminKey?: { keys[], threshold? }, supplyKey?: { keys[], threshold? }, nftSerial?: { serialNumber, owner (nullable), metadata?, metadataRaw?, createdTimestamp?, deleted } }`

**How the skill uses it:** Phase 2 caches `decimals` and `symbol` per token side. Skip the call for the literal input `"HBAR"` (treat as `decimals=8`, `symbol="HBAR"`).

---

### `hcli token associate` [batchify] [scheduled] *(used by the skill — phase 6)*

Associate a token with an account so the account can receive it.

| Option          | Short | Type   | Required | Default        | Description                                                                                        |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | Token: alias or token ID.                                                                          |
| `--account`     | `-a`  | string | **yes**  | —              | Account to associate. `{accountId}:{privateKey}`, key reference, or account alias.                 |
| `--key-manager` | `-k`  | string | no       | config default | `local` or `local_encrypted`.                                                                      |

**Example:**

```
hcli token associate -T 0.0.429274 -a myOperator --format json
```

**Output:** `{ transactionId?, accountId, tokenId, associated, alreadyAssociated?, network }`

**How the skill uses it:** Phase 6 calls this when `account balance --token $TOUT` returned an empty `tokenBalances[]` for the operator. Skip when `alreadyAssociated` would be `true`.

---

### `hcli token transfer-ft` [batchify] [scheduled] *(optional remediation only)*

Transfer a fungible token between accounts.

| Option          | Short | Type   | Required | Default        | Description                                                                                              |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | Fungible token: alias or token ID.                                                                       |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account (ID or alias).                                                                       |
| `--from`        | `-f`  | string | no       | operator       | Source: `{accountId}:{privateKey}`, key reference, or alias.                                             |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount. Default: display units. Append `"t"` for raw base units (e.g. `"100t"`).                         |
| `--key-manager` | `-k`  | string | no       | config default | Key manager.                                                                                             |

**Output:** `{ transactionId, tokenId, from, to, amount, network }`

---

### `hcli token allowance-ft` [batchify] *(used by the skill — phase 6)*

Approve a HIP-906 fungible-token allowance so a spender (e.g. the SaucerSwap V1 router) can pull tokens from the owner's account.

| Option          | Short | Type   | Required | Default        | Description                                                                                      |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token: alias or token ID (the **input** token to the swap/buy).                                  |
| `--owner`       | `-o`  | string | **yes**  | operator       | Owner: `{accountId}:{privateKey}`, key reference, or alias.                                      |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender: the router contract ID. Testnet `0.0.19264`, mainnet `0.0.3045981` (ADR-001 Part 2).    |
| `--amount`      | `-a`  | string | **yes**  | —              | Allowance. Default: display units. Append `"t"` for raw base units. Set `0` to revoke.           |
| `--key-manager` | `-k`  | string | no       | config default | Key manager.                                                                                     |

**Example:**

```
hcli token allowance-ft -T 0.0.1183558 -o myOperator -s 0.0.19264 -a 1000 --format json
```

**Output:** `{ tokenId, ownerAccountId, spenderAccountId, amount, transactionId, network }`

**How the skill uses it:** Phase 6 grants the router the exact amount needed for the trade (in base units — multiply display × 10^decimals, or append `"t"` and pass the base-unit integer). Skipped when the input side is HBAR.

**Remediation path:** if phase 7 returns `SPENDER_DOES_NOT_HAVE_ALLOWANCE` or `AMOUNT_EXCEEDS_ALLOWANCE`, the skill re-runs this call for the needed amount and retries the original swap/buy once (see [../REFERENCE.md](../REFERENCE.md) §9).

---

### `hcli token transfer-nft` [batchify] [scheduled]

Transfer one or more NFT serials.

| Option          | Short | Type   | Required | Default        | Description                                                                                  |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token: alias or token ID.                                                                |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account (ID or alias).                                                           |
| `--from`        | `-f`  | string | no       | operator       | Source: `{accountId}:{privateKey}`, key reference, or alias.                                 |
| `--serials`     | `-s`  | string | **yes**  | —              | Comma-separated serials (e.g. `"1,2,3"`).                                                    |
| `--key-manager` | `-k`  | string | no       | config default | Key manager.                                                                                 |

**Output:** `{ transactionId, tokenId, from, to, serials[], network }`

---

### `hcli token allowance-nft` [batchify]

Approve an NFT allowance (specific serials or all serials).

| Option          | Short | Type    | Required | Default        | Description                                                              |
| --------------- | ----- | ------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string  | **yes**  | —              | NFT token: alias or token ID.                                            |
| `--spender`     | `-s`  | string  | **yes**  | —              | Spender (ID, EVM address, or alias).                                     |
| `--owner`       | `-o`  | string  | no       | operator       | Owner: any key format.                                                   |
| `--serials`     |       | string  | no       | —              | Comma-separated serials to approve. Exclusive with `--all-serials`.      |
| `--all-serials` |       | boolean | no       | —              | Approve the whole collection. Exclusive with `--serials`.                |
| `--key-manager` | `-k`  | string  | no       | config default | Key manager.                                                             |

**Output:** `{ transactionId, tokenId, ownerAccountId, spenderAccountId, serials (nullable), allSerials, network }`

---

### `hcli token create-ft` [batchify] [scheduled]

Create a new fungible token. The skill does not use this directly; included for completeness.

Key options: `--token-name` / `-T` (required), `--symbol` / `-Y` (required), `--treasury` / `-t`, `--decimals` / `-d` (default `0`), `--initial-supply` / `-i` (default `1000000`), `--supply-type` / `-S` (`INFINITE` or `FINITE`), `--max-supply` / `-m`, plus repeatable key options `--admin-key`, `--supply-key`, `--freeze-key`, `--wipe-key`, `--kyc-key`, `--pause-key`, `--fee-schedule-key`, `--metadata-key` (each with a matching `--*-key-threshold` for M-of-N), `--name` / `-n`, `--key-manager` / `-k`, `--memo` / `-M`, `--auto-renew-period` / `-R`, `--auto-renew-account` / `-r`, `--expiration-time` / `-x`.

**Output:** `{ tokenId, name, symbol, treasuryId, decimals, initialSupply, supplyType, transactionId, alias?, network, autoRenewPeriodSeconds?, autoRenewAccountId?, expirationTime? }`

---

### `hcli token list`

List tokens tracked in local state.

| Option   | Short | Type    | Required | Default | Description                                     |
| -------- | ----- | ------- | -------- | ------- | ----------------------------------------------- |
| `--keys` | `-k`  | boolean | no       | `false` | Include admin/supply/wipe/etc. key info.        |

**Output:** `{ tokens[]: [{ tokenId, name, symbol, decimals, supplyType, tokenType, treasuryId, network, keys?, alias?, maxSupply, associationCount }], totalCount, stats? }`

---

### `hcli token import` *(used by the skill — phase 2, alias registration)*

Register an existing on-chain token in local CLI state and optionally assign it a short alias. After import, the alias can be used wherever a token ID is accepted (`token view`, `token associate`, `allowance-ft`, swap commands, etc.).

| Option     | Short | Type   | Required | Default | Description                                                                  |
| ---------- | ----- | ------ | -------- | ------- | ---------------------------------------------------------------------------- |
| `--token`  | `-T`  | string | **yes**  | —       | Token ID to import (e.g. `0.0.429274`).                                      |
| `--name`   | `-n`  | string | no       | —       | Alias to assign. The skill uses the token's `symbol` from `token view`.      |

**Example:**

```
hcli token import -T 0.0.429274 -n USDC --format json
hcli token import -T 0.0.1183558 -n SAUCE --format json
```

**Output:** `{ tokenId, name, symbol, type, network, memo?, adminKeyPresent, supplyKeyPresent, alias? }`

`alias` in the output is the name you passed via `--name`. If the token was already imported under the same alias, the command is idempotent.

**How the skill uses it:** In phase 2, after `token view` returns successfully, the skill checks whether the token reference was a raw Hedera ID. If so, it calls `token import -T $TOKEN_ID -n $SYMBOL --format json` where `$SYMBOL` is the `symbol` field from `token view` (e.g. `USDC`, `SAUCE`, `WHBAR`). All subsequent commands in phases 3–7 then reference the token by alias rather than raw ID.

**Alias collision rule:** If a different token already occupies the `$SYMBOL` alias (detectable because `token view -T $SYMBOL --format json` returns a different `tokenId`), append the last four digits of the token ID to disambiguate — e.g. `USDC_4274`. Surface the chosen alias to the caller before proceeding.

---

### Other token commands (not used by the skill)

Mentioned here so you know the surface area and can reach for them if a workflow extends beyond Flow 1:

`burn-ft`, `burn-nft`, `mint-ft`, `mint-nft`, `airdrop-ft`, `airdrop-nft`, `cancel-airdrop`, `create-nft`, `create-ft-from-file`, `create-nft-from-file`, `delete`, `freeze`, `unfreeze`, `delete-allowance-nft`, `pending-airdrops`, `claim-airdrop`, `reject-airdrop`.

Consult `hcli token <cmd> --help` for flags.
