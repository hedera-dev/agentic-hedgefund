---
name: agentic-hedge-fund-rebalance
description: Atomic portfolio rebalance on SaucerSwap V1 or V2 using a HIP-551 batch. Optionally transfers tokens from a treasury account, swaps HBAR or a token for another token, and deposits into a liquidity pool (V1 deposit or V2 mint-position) — all in one atomic batch. Use when executing Flow 2 of the hedge fund ("atomic portfolio rebalance") or when any combination of transfer + swap + deposit must succeed or fail together. V2 is selected when the caller provides --fee-tier.
---

# Agentic Hedge Fund — Atomic Portfolio Rebalance (Flow 2)

A five-phase workflow that assembles a HIP-551 atomic batch containing up to three operations — treasury transfer, swap, and liquidity deposit — executes it, and logs the result. The batch is all-or-nothing: any failure reverts the entire rebalance.

Supports both **SaucerSwap V1** (constant-product, `deposit`) and **SaucerSwap V2** (concentrated liquidity, `mint-position`). Version is selected automatically based on whether `--fee-tier` is supplied.

## Core rules

1. **Every `hcli` invocation MUST end with `--format json`.**
2. **Batch name is always auto-generated:** `rebalance-{YYYYMMDD}-{HHmmss}` (UTC). Never accept a batch name from the caller.
3. **At least one step flag must be supplied** (`--with-transfer`, `--with-swap`, or `--with-deposit`). Abort with a validation error if none are present.
4. **Allowances go inside the batch.** Never set token allowances as standalone pre-batch transactions — add them as the first operations in the batch so the entire sequence is atomic.
5. **Associations go outside the batch.** Check each output-token association before creating the batch. Run `token associate` as a standalone transaction only if the token is not yet associated. If association fails, abort.
6. **Token auto-import:** for every token parameter that is a raw Hedera ID (`\d+\.\d+\.\d+`), call `token import -T $ID -n $SYMBOL --format json` in the setup phase using the `symbol` from `token view`. Deduplicate — import each unique ID once. From that point on use the alias.
7. **On `batch execute` failure:** run `batch delete --name $BATCH_NAME --format json`, append an `error` audit entry, then surface the failure to the caller. Never leave an orphaned batch in state.
8. **Never run two write commands in parallel** for the same operator — order matters for the batch key state.

## Version selection

| `--fee-tier` supplied | Protocol used | Swap command | Deposit command |
|---|---|---|---|
| No | SaucerSwap V1 | `saucerswap-v1 swap` | `saucerswap-v1 deposit` |
| Yes (500 / 1500 / 3000 / 10000) | SaucerSwap V2 | `saucerswap-v2 swap --fee-tier` | `saucerswap-v2 mint-position --fee-tier` |

`--with-transfer` is protocol-agnostic and always uses `token transfer-ft`. If `--fee-tier` is present but `--with-swap` and `--with-deposit` are both absent, abort with a validation error — `--fee-tier` is only meaningful alongside a swap or deposit step.

## Caller-supplied inputs

| Input | Step flag | Required | Notes |
|---|---|---|---|
| `treasury` | any | if `--with-transfer` | Account alias or Hedera ID of the source treasury |
| `transfer-token` | `--with-transfer` | yes | Token to move (ID or alias) |
| `transfer-amount` | `--with-transfer` | yes | Display units |
| `swap-from` | `--with-swap` | yes | Input token: Hedera ID, alias, or `HBAR` |
| `swap-to` | `--with-swap` | yes | Output token: Hedera ID, alias, or `HBAR` |
| `swap-amount` | `--with-swap` | yes | Exact input amount, display units |
| `swap-slippage` | `--with-swap` | no | %, default `0.5` |
| `fee-tier` | `--with-swap` or `--with-deposit` | V2 only | `500`, `1500`, `3000`, or `10000` — presence selects V2 |
| `deposit-token-a` | `--with-deposit` | yes | First token of the LP pair |
| `deposit-token-b` | `--with-deposit` | yes | Second token of the LP pair |
| `deposit-amount-a` | `--with-deposit` | yes | Desired amount for token A, display units |
| `deposit-amount-b` | `--with-deposit` | yes | Desired amount for token B, display units |
| `deposit-slippage` | `--with-deposit` | no | %, default `2.0` |
| `deposit-range-percent` | `--with-deposit` | V2 only, no | Symmetric ±% tick range for `mint-position`, default `5` |

The operator is always read from hcli state (`network get-operator --format json`) — never supplied by the caller.

## Workflow checklist

Run phases in order. Do not proceed to phase 3 if phase 2 fails. Every `hcli` command must include `--format json`.

### Phase 1 — Setup

1. `hcli network list --format json` — confirm network, then cache contract IDs for the active network:
   - **V1** `routerContractId`: testnet `0.0.19264`, mainnet `0.0.3045981`
   - **V2** `swapRouterContractId`: testnet `0.0.1414040`, mainnet `0.0.3949434`
   - **V2** `nftManagerContractId`: testnet `0.0.1308184`, mainnet `0.0.4053945`
2. `hcli network get-operator --format json` — cache `operatorAccountId`.
3. Collect all unique raw token IDs from the supplied parameters (skip `HBAR` and already-aliased references).
4. For each unique token ID: `hcli token view -T $ID --format json` → cache `symbol`, `decimals`. Then `hcli token import -T $ID -n $SYMBOL --format json` to register the alias. Replace raw IDs with aliases for all subsequent commands.
5. Generate batch name: `rebalance-$(date -u +%Y%m%d-%H%M%S)`. Cache as `$BATCH_NAME`.

### Phase 2 — Pre-flight

Run all checks before touching the batch. Append a `preflight` audit entry on completion (pass or fail).

1. **HBAR balance** (if `--with-swap` and `swap-from` is HBAR): `hcli account balance -a $OP --format json`. Confirm `hbar` ≥ `swap-amount` + 1 HBAR floor. Abort if not.
2. **Treasury token balance** (if `--with-transfer`): `hcli account balance -a $TREASURY --format json`. Confirm the transfer-token balance ≥ `transfer-amount`. Abort if not.
3. **Association checks** — for each token the operator will *receive* (swap-to if `--with-swap`; transfer-token if `--with-transfer`; deposit-token-a and deposit-token-b if `--with-deposit`):
   - `hcli account balance -a $OP --format json` → check `tokens[]` for the token.
   - If missing: `hcli token associate -T $TOKEN -a $OP --format json`. Abort if this fails.

### Phase 3 — Batch assembly

1. `hcli batch create --name $BATCH_NAME --key $OP --format json` — abort if this fails.
2. Add operations to the batch **in this fixed order** (skip steps that don't apply). The spender for allowances depends on the version — see REFERENCE.md §3.

   **a. Swap allowance** (if `--with-swap` AND `swap-from` is not HBAR):
   ```
   # V1: spender = $V1_ROUTER
   hcli token allowance-ft -T $SWAP_FROM -o $OP -s $V1_ROUTER -a $SWAP_AMOUNT --batch $BATCH_NAME --format json
   # V2: spender = $V2_SWAP_ROUTER
   hcli token allowance-ft -T $SWAP_FROM -o $OP -s $V2_SWAP_ROUTER -a $SWAP_AMOUNT --batch $BATCH_NAME --format json
   ```

   **b. Deposit token-A allowance** (if `--with-deposit`):
   ```
   # V1: spender = $V1_ROUTER
   hcli token allowance-ft -T $DEPOSIT_TOKEN_A -o $OP -s $V1_ROUTER -a $DEPOSIT_AMOUNT_A --batch $BATCH_NAME --format json
   # V2: spender = $V2_NFT_MANAGER
   hcli token allowance-ft -T $DEPOSIT_TOKEN_A -o $OP -s $V2_NFT_MANAGER -a $DEPOSIT_AMOUNT_A --batch $BATCH_NAME --format json
   ```

   **c. Deposit token-B allowance** (if `--with-deposit`):
   ```
   # V1: spender = $V1_ROUTER
   hcli token allowance-ft -T $DEPOSIT_TOKEN_B -o $OP -s $V1_ROUTER -a $DEPOSIT_AMOUNT_B --batch $BATCH_NAME --format json
   # V2: spender = $V2_NFT_MANAGER
   hcli token allowance-ft -T $DEPOSIT_TOKEN_B -o $OP -s $V2_NFT_MANAGER -a $DEPOSIT_AMOUNT_B --batch $BATCH_NAME --format json
   ```

   **d. Treasury transfer** (if `--with-transfer`) — same for V1 and V2:
   ```
   hcli token transfer-ft --token $TRANSFER_TOKEN --from $TREASURY --to $OP --amount $TRANSFER_AMOUNT --batch $BATCH_NAME --format json
   ```

   **e. Swap** (if `--with-swap`):
   ```
   # V1
   hcli saucerswap-v1 swap --from $SWAP_FROM --to $SWAP_TO --amount $SWAP_AMOUNT --slippage $SWAP_SLIPPAGE --batch $BATCH_NAME --format json
   # V2
   hcli saucerswap-v2 swap --from $SWAP_FROM --to $SWAP_TO --amount $SWAP_AMOUNT --fee-tier $FEE_TIER --slippage $SWAP_SLIPPAGE --batch $BATCH_NAME --format json
   ```

   **f. Deposit / mint-position** (if `--with-deposit`):
   ```
   # V1
   hcli saucerswap-v1 deposit --token-a $DEPOSIT_TOKEN_A --token-b $DEPOSIT_TOKEN_B --amount-a $DEPOSIT_AMOUNT_A --amount-b $DEPOSIT_AMOUNT_B --slippage $DEPOSIT_SLIPPAGE --batch $BATCH_NAME --format json
   # V2
   hcli saucerswap-v2 mint-position --token-a $DEPOSIT_TOKEN_A --token-b $DEPOSIT_TOKEN_B --fee-tier $FEE_TIER --amount-a $DEPOSIT_AMOUNT_A --amount-b $DEPOSIT_AMOUNT_B --range-percent $DEPOSIT_RANGE_PERCENT --slippage $DEPOSIT_SLIPPAGE --batch $BATCH_NAME --format json
   ```

3. Append a `batch-assembly` audit entry listing all operations added, the batch name, and the protocol version (`v1` or `v2`).

### Phase 4 — Execute

1. `hcli account balance -a $OP --format json` — capture `balancesBefore`.
2. `hcli batch execute --name $BATCH_NAME --format json`
   - On **success**: capture `transactionId`. Proceed to phase 5.
   - On **failure**: `hcli batch delete --name $BATCH_NAME --format json`, append `error` audit entry with the raw error envelope and `balancesBefore`, surface to caller. **Stop.**

### Phase 5 — Verify

1. `hcli account balance -a $OP --format json` — capture `balancesAfter`.
2. Append a `batch-execute` audit entry: `batchName`, `transactionId`, `operations[]`, `balancesBefore`, `balancesAfter`, `network`.

## Error handling

See [REFERENCE.md](REFERENCE.md) for the full error-code → behaviour table. Highlights:

- `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` in phase 2 → already handled by the association check. If it fires in phase 4 (unexpected), the batch atomically reverts — run `batch delete`, append error, abort.
- `SPENDER_DOES_NOT_HAVE_ALLOWANCE` in phase 4 → the batch atomically reverts (allowances are set inside the batch). Run `batch delete`, append error, abort. This should not occur if phases 2–3 ran correctly.
- `NetworkError` → exponential backoff `1s → 2s → 4s`, up to 3 attempts per command.
- Any other error → `batch delete` (if batch was created), append error, surface to caller.

## More

- Cross-cutting rules, batch assembly order, audit log format, full error table: [REFERENCE.md](REFERENCE.md)
- Per-plugin command reference:
  - [`references/batch.md`](references/batch.md) — `create`, `execute`, `delete`, `list`
  - [`references/saucerswap-v1.md`](references/saucerswap-v1.md) — `swap`, `deposit` (V1 path)
  - [`references/saucerswap-v2.md`](references/saucerswap-v2.md) — `swap`, `mint-position` (V2 path)
  - [`references/token.md`](references/token.md) — `view`, `import`, `associate`, `allowance-ft`, `transfer-ft`
  - [`references/account.md`](references/account.md) — `balance`, `view`
  - [`references/network.md`](references/network.md) — `list`, `get-operator`
