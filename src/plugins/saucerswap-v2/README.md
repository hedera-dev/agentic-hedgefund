# SaucerSwap V2 Plugin

SaucerSwap V2 (Uniswap V3-style concentrated liquidity) commands for Hedera. Positions are NFT-based; swaps are routed through fee-tiered pools. Parameters are ABI-encoded and submitted via multicall.

Tokens are resolved as Hedera entity references (ID, alias, EVM address, or `HBAR`). Amounts accept display units or raw base units with a `t` suffix.

## Data sources

- SaucerSwap V2 Router, Factory, and NonfungiblePositionManager contracts on Hedera for all write operations.
- SaucerSwap REST API for read-only pool and position queries (`list-pools`, `view-pool`, `list-positions`).
- Read-only commands (`list-pools`, `view-pool`, `list-positions`) require a `--api-key` (forwarded as the `x-api-key` request header).

## Setup

```sh
npm install
npm run build
hcli plugin-management add -p dist/plugins/saucerswap-v2/
```

## Fee tiers

| Value   | Rate  |
| ------- | ----- |
| `500`   | 0.05% |
| `1500`  | 0.15% |
| `3000`  | 0.30% |
| `10000` | 1.00% |

## Commands

### swap

V2 `exactInput` swap on a single fee-tiered pool.

```sh
hcli saucerswap-v2 swap \
  --from HBAR \
  --to 0.0.731861 \
  --amount 10 \
  --fee-tier 3000
```

| Option          | Required | Default  | Description                                                |
| --------------- | -------- | -------- | ---------------------------------------------------------- |
| `--from`        | yes      |          | Input token                                                |
| `--to`          | yes      |          | Output token                                               |
| `--amount`      | yes      |          | Exact input amount                                         |
| `--fee-tier`    | yes      |          | Pool fee tier: `500`, `1500`, `3000`, or `10000`           |
| `--min-output`  | no       |          | Minimum output; overrides `--slippage` when set            |
| `--slippage`    | no       | `0.5`    | Slippage tolerance (%) used when `--min-output` is omitted |
| `--deadline`    | no       | `180`    | Deadline in seconds from now                               |
| `--gas`         | no       | `300000` | Gas limit                                                  |
| `--key-manager` | no       |          | Key manager type (defaults to config)                      |

### buy

V2 `exactOutput` swap — buy an exact amount out, cap input at a maximum.

```sh
hcli saucerswap-v2 buy \
  --from HBAR \
  --to 0.0.731861 \
  --amount 100 \
  --max-input 12 \
  --fee-tier 3000
```

| Option          | Required | Default  | Description                           |
| --------------- | -------- | -------- | ------------------------------------- |
| `--from`        | yes      |          | Input token                           |
| `--to`          | yes      |          | Output token                          |
| `--amount`      | yes      |          | Exact output amount                   |
| `--max-input`   | yes      |          | Maximum input to spend                |
| `--fee-tier`    | yes      |          | Pool fee tier                         |
| `--deadline`    | no       | `180`    | Deadline in seconds from now          |
| `--gas`         | no       | `300000` | Gas limit                             |
| `--key-manager` | no       |          | Key manager type (defaults to config) |

### mint-position

Create a new concentrated liquidity position NFT. Tick bounds are derived automatically from `--range-percent` when not provided explicitly.

```sh
hcli saucerswap-v2 mint-position \
  --token-a HBAR \
  --token-b 0.0.731861 \
  --fee-tier 3000 \
  --amount-a 10 \
  --amount-b 50
```

| Option            | Required | Default  | Description                                                   |
| ----------------- | -------- | -------- | ------------------------------------------------------------- |
| `--token-a`       | yes      |          | First token                                                   |
| `--token-b`       | yes      |          | Second token                                                  |
| `--fee-tier`      | yes      |          | Pool fee tier                                                 |
| `--amount-a`      | yes      |          | Desired amount for token A                                    |
| `--amount-b`      | yes      |          | Desired amount for token B                                    |
| `--tick-lower`    | no       |          | Lower tick; auto-computed from `--range-percent` when omitted |
| `--tick-upper`    | no       |          | Upper tick                                                    |
| `--range-percent` | no       | `5`      | Symmetric ±% price range (used when ticks are omitted)        |
| `--slippage`      | no       | `0.5`    | Slippage tolerance (%) for minimum token amounts              |
| `--deadline`      | no       | `180`    | Deadline in seconds from now                                  |
| `--gas`           | no       | `900000` | Gas limit                                                     |
| `--key-manager`   | no       |          | Key manager type (defaults to config)                         |

### increase-liquidity

Add liquidity to an existing V2 position (identified by its NFT serial number).

```sh
hcli saucerswap-v2 increase-liquidity \
  --position 42 \
  --amount-a 5 \
  --amount-b 25
```

| Option          | Required | Default  | Description                                                            |
| --------------- | -------- | -------- | ---------------------------------------------------------------------- |
| `--position`    | yes      |          | LP position NFT serial number                                          |
| `--amount-a`    | yes      |          | Amount for pool token0                                                 |
| `--amount-b`    | yes      |          | Amount for pool token1                                                 |
| `--hbar-amount` | no       |          | Payable HBAR in tinybars (display or raw `t`) for HBAR/WHBAR-side adds |
| `--slippage`    | no       | `0.5`    | Slippage tolerance (%)                                                 |
| `--deadline`    | no       | `180`    | Deadline in seconds from now                                           |
| `--gas`         | no       | `330000` | Gas limit                                                              |
| `--key-manager` | no       |          | Key manager type (defaults to config)                                  |

### decrease-liquidity

Remove liquidity from a V2 position. Optionally unwrap WHBAR to HBAR and burn the NFT after a full exit.

```sh
hcli saucerswap-v2 decrease-liquidity \
  --position 42 \
  --liquidity 1000000 \
  --unwrap-hbar
```

| Option          | Required | Default  | Description                           |
| --------------- | -------- | -------- | ------------------------------------- |
| `--position`    | yes      |          | NFT serial number                     |
| `--liquidity`   | yes      |          | Liquidity amount to remove            |
| `--unwrap-hbar` | no       | `false`  | Unwrap WHBAR to HBAR after removal    |
| `--burn`        | no       | `false`  | Burn the NFT after a full exit        |
| `--slippage`    | no       | `0.5`    | Slippage tolerance (%)                |
| `--deadline`    | no       | `180`    | Deadline in seconds from now          |
| `--gas`         | no       | `300000` | Gas limit                             |
| `--key-manager` | no       |          | Key manager type (defaults to config) |

### collect-fees

Collect accrued swap fees from an existing V2 position without removing liquidity.

```sh
hcli saucerswap-v2 collect-fees --position 42
hcli saucerswap-v2 collect-fees --position 42 --unwrap-hbar
```

| Option          | Required | Default  | Description                           |
| --------------- | -------- | -------- | ------------------------------------- |
| `--position`    | yes      |          | NFT serial number                     |
| `--unwrap-hbar` | no       | `false`  | Unwrap WHBAR to HBAR                  |
| `--gas`         | no       | `300000` | Gas limit                             |
| `--key-manager` | no       |          | Key manager type (defaults to config) |

### list-pools

List V2 pools from the SaucerSwap REST API, optionally filtered by token or fee tier.

```sh
hcli saucerswap-v2 list-pools --api-key <key>
hcli saucerswap-v2 list-pools --api-key <key> --token SAUCE --fee-tier 3000
```

| Option       | Required | Description                                   |
| ------------ | -------- | --------------------------------------------- |
| `--api-key`  | yes      | SaucerSwap API key (`x-api-key` header)       |
| `--token`    | no       | Filter by token ID, symbol, or name substring |
| `--fee-tier` | no       | Filter by fee tier                            |

### view-pool

Resolve a pool on-chain via `Factory.getPool` and enrich it with SaucerSwap V2 REST API data.

```sh
hcli saucerswap-v2 view-pool \
  --api-key <key> \
  --token-a HBAR \
  --token-b 0.0.731861 \
  --fee-tier 3000
```

| Option       | Required | Description                             |
| ------------ | -------- | --------------------------------------- |
| `--api-key`  | yes      | SaucerSwap API key (`x-api-key` header) |
| `--token-a`  | yes      | First token                             |
| `--token-b`  | yes      | Second token                            |
| `--fee-tier` | yes      | Fee tier                                |

### list-positions

List V2 NFT positions held by an account.

```sh
hcli saucerswap-v2 list-positions \
  --api-key <key> \
  --account 0.0.12345
```

| Option      | Required | Description                             |
| ----------- | -------- | --------------------------------------- |
| `--api-key` | yes      | SaucerSwap API key (`x-api-key` header) |
| `--account` | yes      | Account ID, EVM address, or alias       |

## Amount syntax

| Input       | Interpretation                                    |
| ----------- | ------------------------------------------------- |
| `10`        | 10 display units (scaled by token decimals)       |
| `10000000t` | 10,000,000 raw base units (tinybars / tinyTokens) |

## Batch support

Write commands (`swap`, `buy`, `mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees`) register `batchify` hooks and can be composed into a HIP-551 atomic batch.
