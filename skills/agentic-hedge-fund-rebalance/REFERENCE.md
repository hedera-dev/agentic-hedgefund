# Reference — rules, batch assembly, audit format, error handling

## 0. Output format — non-negotiable

Every `hcli` invocation MUST include `--format json`. This applies to every command in every phase including batch sub-commands.

## 1. Per-plugin command reference

| Plugin          | File                                                         | Commands the skill uses                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `batch`         | [`references/batch.md`](references/batch.md)                 | `create`, `execute`, `delete` (phases 3–4); `list` for diagnostics                                                                                                                                 |
| `saucerswap-v1` | [`references/saucerswap-v1.md`](references/saucerswap-v1.md) | `swap` (phase 3e V1), `deposit` (phase 3f V1)                                                                                                                                                      |
| `saucerswap-v2` | [`references/saucerswap-v2.md`](references/saucerswap-v2.md) | `swap` (phase 3e V2), `mint-position` (phase 3f V2); `increase-liquidity`, `decrease-liquidity`, `collect-fees` as standalone pre/post-batch ops; `list-positions` for post-execution verification |
| `token`         | [`references/token.md`](references/token.md)                 | `view` (phase 1), `import` (phase 1), `associate` (phase 2), `allowance-ft` (phase 3a–c), `transfer-ft` (phase 3d)                                                                                 |
| `account`       | [`references/account.md`](references/account.md)             | `balance` (phases 2, 4, 5)                                                                                                                                                                         |
| `network`       | [`references/network.md`](references/network.md)             | `list` (phase 1), `get-operator` (phase 1)                                                                                                                                                         |

## 2. HBAR detection

Input counts as HBAR if `input === "HBAR"` (case-insensitive) or `input === whbarTokenId` for the active network (testnet `0.0.15058`, mainnet `0.0.1456986`). When `swap-from` is HBAR: skip the swap allowance step (3a) and HBAR is paid as `payableAmount` by the plugin.

## 3. Contract IDs for `token allowance-ft` spender

### V1 router

| Network | Contract ID   |
| ------- | ------------- |
| Testnet | `0.0.19264`   |
| Mainnet | `0.0.3045981` |

### V2 SwapRouter (spender for `saucerswap-v2 swap`)

| Network | Contract ID   |
| ------- | ------------- |
| Testnet | `0.0.1414040` |
| Mainnet | `0.0.3949434` |

### V2 NFT Position Manager (spender for `saucerswap-v2 mint-position`)

| Network | Contract ID   |
| ------- | ------------- |
| Testnet | `0.0.1308184` |
| Mainnet | `0.0.4053945` |

## 4. Batch assembly order

Operations must be added in this fixed order. The spender for allowances differs by protocol.

```
Step  Operation                                  Condition                              V1 spender       V2 spender
────  ─────────────────────────────────────────  ─────────────────────────────────────  ───────────────  ──────────────────
1.    token allowance-ft  swap-from → spender    --with-swap AND swap-from ≠ HBAR       V1 router        V2 SwapRouter
2.    token allowance-ft  deposit-token-a         --with-deposit                         V1 router        V2 NFT Manager
3.    token allowance-ft  deposit-token-b         --with-deposit                         V1 router        V2 NFT Manager
4.    token transfer-ft   treasury → operator     --with-transfer                        (same both)      (same both)
5.    saucerswap-v1 swap  OR  saucerswap-v2 swap  --with-swap                            V1               V2 + --fee-tier
6.    saucerswap-v1 deposit  OR  mint-position    --with-deposit                         V1               V2 + --fee-tier
```

The HIP-551 batch executes these in order atomically. Token balances from step 4 (transfer) and step 5 (swap) are available to step 6 (deposit/mint-position) within the same batch execution.

## 5. Token auto-import

For every token parameter that matches `^\d+\.\d+\.\d+$` (raw Hedera ID):

1. `hcli token view -T $ID --format json` → extract `symbol`.
2. Check collision: `hcli token view -T $SYMBOL --format json`. If it returns a different `tokenId`, use `${SYMBOL}_${LAST4}` as the alias (last 4 digits of the token ID).
3. `hcli token import -T $ID -n $ALIAS --format json`.
4. Replace the raw ID with the alias for all subsequent commands.

Deduplicate: if the same raw ID appears in multiple parameters (e.g. `swap-to` and `deposit-token-a`), import it once and reuse the alias.

## 6. Audit log format

Location: `./audit/agentic-hedge-fund.jsonl` (same file as `agentic-hedge-fund-saucerswap`; override with `HEDGE_FUND_AUDIT_LOG`). One JSON object per line.

Common fields on every entry:

```json
{
  "timestamp": "2026-04-24T10:15:30.000Z",
  "network": "testnet",
  "phase": "preflight | batch-assembly | batch-execute | verify | error",
  "batchName": "rebalance-20260424-101530"
}
```

Phase-specific additions:

- `preflight` → `operatorId`, `steps[]` with `{ check, passed, detail? }`.
- `batch-assembly` → `operations[]` with `{ order, command, args }`, `batchName`.
- `batch-execute` → `transactionId`, `success`, `operations[]`, `balancesBefore`, `balancesAfter`.
- `verify` → same as `batch-execute` (this is where balances after are recorded).
- `error` → `phase`, `commandArgs?`, `error` (raw `CliError` envelope: `code`, `message`, `recoverable`, `context`), `batchDeleted` (boolean).

## 7. Error handling

Every error branch appends an `error` audit entry **before** acting. If the batch was created at the time of failure, always run `batch delete` first.

| `code`                                                             | Typical phase | Behaviour                                                   | Retry           |
| ------------------------------------------------------------------ | ------------- | ----------------------------------------------------------- | --------------- |
| `ValidationError`                                                  | 1–2           | Abort; surface the offending flag/field                     | No              |
| `NotFoundError` (account/token)                                    | 1–2           | Abort; check token/account ID                               | No              |
| `AuthorizationError`                                               | 2–4           | Abort; operator cannot sign — escalate                      | No              |
| `NetworkError`                                                     | any           | Exponential backoff `1s → 2s → 4s`                          | ≤ 3             |
| `TransactionPrecheckError` — `INSUFFICIENT_PAYER_BALANCE`          | 4             | Delete batch, abort, instruct caller to top up              | No              |
| `TransactionPrecheckError` — `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT`     | 4             | Delete batch, abort (should have been caught in phase 2)    | No              |
| `TransactionPrecheckError` — `TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT` | 2             | Skip that associate, continue                               | No retry needed |
| `TransactionError` (`recoverable: true`)                           | 4             | Delete batch if needed, backoff, retry **whole batch** once | 1               |
| `TransactionError` (`recoverable: false`)                          | 4             | Delete batch, abort                                         | No              |
| `StateError`                                                       | any           | Abort; advise caller to inspect `hcli` state                | No              |
| Unknown                                                            | any           | Delete batch if created, dump raw error, abort              | No              |
