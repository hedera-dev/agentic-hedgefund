# Reference — pool comparison, allowances, audit schema, error handling

## 0. Output format

Every `hcli` invocation MUST include `--format json`.

## 1. Per-plugin command reference

| Plugin          | File                                                         | Commands the skill uses                                                                              |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `saucerswap-v1` | [`references/saucerswap-v1.md`](references/saucerswap-v1.md) | `list` (phase 2), `view` (phase 5), `deposit` (phase 4)                                              |
| `saucerswap-v2` | [`references/saucerswap-v2.md`](references/saucerswap-v2.md) | `list-pools` (phase 2), `view-pool` (phase 2), `mint-position` (phase 4), `list-positions` (phase 5) |
| `token`         | [`references/token.md`](references/token.md)                 | `view` (phase 1), `import` (phase 1), `associate` (phase 3), `allowance-ft` (phase 3)                |
| `account`       | [`references/account.md`](references/account.md)             | `balance` (phases 3, 5)                                                                              |
| `network`       | [`references/network.md`](references/network.md)             | `list` (phase 1), `get-operator` (phase 1)                                                           |

## 2. HBAR detection

Input counts as HBAR if `input === "HBAR"` (case-insensitive) or equals the WHBAR token ID (testnet `0.0.15058`, mainnet `0.0.1456986`). Skip `token allowance-ft` for HBAR sides.

## 3. Contract IDs

| Contract              | Testnet       | Mainnet       |
| --------------------- | ------------- | ------------- |
| V1 Router (allowance) | `0.0.19264`   | `0.0.3045981` |
| V2 SwapRouter         | `0.0.1414040` | `0.0.3949434` |
| V2 NFT Position Mgr   | `0.0.1308184` | `0.0.4053945` |

Allowances for `deposit` use the V1 router. Allowances for `mint-position` use the V2 NFT Manager.

## 4. Pool depth comparison

V1 and V2 pools use different liquidity metrics. To compare on the same basis:

```
V1 depth  = reserveA          (base-unit integer, from saucerswap-v1 list)
V2 depth  = liquidity * 2^96 / sqrtRatioX96   (BigInt division, virtual token-a reserve)
```

Use integer (BigInt) arithmetic for V2 depth. The pool with the larger depth value is selected. If both protocols have no valid pools for the pair, abort with `no-pools-found`.

Fee tier note for V2: `list-pools` may return multiple fee tiers for the same token pair. Call `view-pool` for each and compute depth per tier. Pick the tier with the highest depth.

## 5. Audit log

Location: `./audit/agentic-hedge-fund.jsonl` (shared with all hedge fund skills; override with `HEDGE_FUND_AUDIT_LOG`).

**`discovery` entry:**

```json
{
  "timestamp": "...", "network": "testnet", "phase": "discovery",
  "pair": "HBAR/USDC",
  "v1Pools": [{ "contractId": "...", "reserveA": "...", "reserveB": "...", "depth": "..." }],
  "v2Pools": [{ "contractId": "...", "feeTier": 3000, "liquidity": "...", "sqrtRatioX96": "...", "virtualReserve0": "..." }],
  "selectedProtocol": "v1" | "v2",
  "selectedPool": { "contractId": "...", "feeTier": 3000 },
  "entryPriceAinB": "0.06"
}
```

**`position-entered` entry:**

```json
{
  "timestamp": "...", "network": "testnet", "phase": "position-entered",
  "pair": "HBAR/USDC",
  "protocol": "v1" | "v2",
  "poolContractId": "0.0.1234567",
  "feeTier": 3000,
  "tickLower": -887220,
  "tickUpper": 887220,
  "entryPriceAinB": "0.06",
  "amountA": "1000",
  "amountB": "500",
  "transactionId": "...",
  "lpTokenId": "0.0.999999",
  "lpBalance": "50.00000000",
  "positionSerial": 42,
  "positionLiquidity": "1234567890",
  "balancesAfter": { "hbar": "...", "tokens": [...] }
}
```

V1 uses `lpTokenId` + `lpBalance`. V2 uses `positionSerial` + `positionLiquidity`. Fields for the unused protocol are omitted.

## 6. Error handling

| `code`                               | Phase | Behaviour                                                                   |
| ------------------------------------ | ----- | --------------------------------------------------------------------------- |
| `ValidationError`                    | 1–2   | Abort; surface the offending field                                          |
| `NotFoundError` (pool)               | 2     | Continue with the other protocol; abort with `no-pools-found` if both empty |
| `NetworkError`                       | any   | Exponential backoff `1s → 2s → 4s`, ≤ 3 retries                             |
| `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT`    | 4     | Should be caught in phase 3; abort + error entry                            |
| `SPENDER_DOES_NOT_HAVE_ALLOWANCE`    | 4     | Re-run allowance for the needed amount, retry once                          |
| `TransactionError` (recoverable)     | 4     | Backoff + retry once                                                        |
| `TransactionError` (non-recoverable) | 4     | Abort + error entry                                                         |
| Unknown                              | any   | Abort + error entry                                                         |
