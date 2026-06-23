# SaucerSwap V1 Plugin

SaucerSwap V1 (Uniswap V2-style constant-product AMM) commands for Hedera. Tokens are resolved as Hedera entity references (ID, alias, EVM address, or `HBAR`). Amounts accept display units or raw base units with a `t` suffix.

## Data sources

- SaucerSwap V1 Router and Factory contracts on Hedera for all write operations.
- SaucerSwap REST API for read-only pool discovery (`list`, `view`).
- Read-only commands (`list`, `view`) require a `--api-key` (forwarded as the `x-api-key` request header).

## Setup

```sh
npm install
npm run build
hcli plugin-management add -p dist/plugins/saucerswap-v1/
```

## Commands

### deposit

Add liquidity to an existing V1 pool.

```sh
hcli saucerswap-v1 deposit \
  --token-a HBAR \
  --token-b 0.0.731861 \
  --amount-a 10 \
  --amount-b 50
```

| Option          | Required | Default   | Description                                      |
| --------------- | -------- | --------- | ------------------------------------------------ |
| `--token-a`     | yes      |           | First token (ID, alias, EVM address, or `HBAR`)  |
| `--token-b`     | yes      |           | Second token (ID, alias, EVM address, or `HBAR`) |
| `--amount-a`    | yes      |           | Desired amount of token A                        |
| `--amount-b`    | yes      |           | Desired amount of token B                        |
| `--slippage`    | no       | `0.5`     | Slippage tolerance (%)                           |
| `--deadline`    | no       | `180`     | Deadline in seconds from now                     |
| `--gas`         | no       | `1000000` | Gas limit                                        |
| `--key-manager` | no       |           | Key manager type (defaults to config)            |

### withdraw

Remove liquidity from a V1 pool. LP amount display units assume 8 decimals; use a `t` suffix for raw units.

```sh
hcli saucerswap-v1 withdraw \
  --token-a HBAR \
  --token-b 0.0.731861 \
  --liquidity 1.5
```

| Option           | Required | Default   | Description                           |
| ---------------- | -------- | --------- | ------------------------------------- |
| `--token-a`      | yes      |           | First token                           |
| `--token-b`      | yes      |           | Second token                          |
| `--liquidity`    | yes      |           | LP amount to remove                   |
| `--min-amount-a` | no       |           | Minimum token A returned              |
| `--min-amount-b` | no       |           | Minimum token B returned              |
| `--deadline`     | no       | `180`     | Deadline in seconds from now          |
| `--gas`          | no       | `2800000` | Gas limit                             |
| `--key-manager`  | no       |           | Key manager type (defaults to config) |

### swap

Swap an exact input amount for at least a minimum output. HBAR is routed via WHBAR automatically.

```sh
hcli saucerswap-v1 swap \
  --from HBAR \
  --to 0.0.731861 \
  --amount 10
```

| Option          | Required | Default   | Description                                     |
| --------------- | -------- | --------- | ----------------------------------------------- |
| `--from`        | yes      |           | Input token                                     |
| `--to`          | yes      |           | Output token                                    |
| `--amount`      | yes      |           | Exact input amount                              |
| `--min-output`  | no       |           | Minimum output; overrides `--slippage` when set |
| `--slippage`    | no       | `0.5`     | Slippage tolerance (%)                          |
| `--deadline`    | no       | `180`     | Deadline in seconds from now                    |
| `--gas`         | no       | `1000000` | Gas limit                                       |
| `--key-manager` | no       |           | Key manager type (defaults to config)           |

### buy

Buy an exact output amount by spending up to a maximum input. When `--max-input` is omitted, it is derived via `getAmountsIn` on the router using the slippage tolerance.

```sh
hcli saucerswap-v1 buy \
  --from HBAR \
  --to 0.0.731861 \
  --amount 100 \
  --max-input 12
```

| Option          | Required | Default   | Description                                                      |
| --------------- | -------- | --------- | ---------------------------------------------------------------- |
| `--from`        | yes      |           | Input token                                                      |
| `--to`          | yes      |           | Output token                                                     |
| `--amount`      | yes      |           | Exact output amount                                              |
| `--max-input`   | no       |           | Maximum input to spend; computed via `getAmountsIn` when omitted |
| `--slippage`    | no       | `0`       | Slippage tolerance (%)                                           |
| `--deadline`    | no       | `180`     | Deadline in seconds from now                                     |
| `--gas`         | no       | `1000000` | Gas limit                                                        |
| `--key-manager` | no       |           | Key manager type (defaults to config)                            |

### list

List pools from the SaucerSwap V1 REST API, optionally filtered by token.

```sh
hcli saucerswap-v1 list --api-key <key>
hcli saucerswap-v1 list --api-key <key> --token SAUCE
```

| Option      | Required | Description                                   |
| ----------- | -------- | --------------------------------------------- |
| `--api-key` | yes      | SaucerSwap API key (`x-api-key` header)       |
| `--token`   | no       | Filter by token ID, symbol, or name substring |

### view

Show reserves and metadata for a specific V1 pool identified by its token pair.

```sh
hcli saucerswap-v1 view \
  --api-key <key> \
  --token-a HBAR \
  --token-b 0.0.731861
```

| Option      | Required | Description                             |
| ----------- | -------- | --------------------------------------- |
| `--api-key` | yes      | SaucerSwap API key (`x-api-key` header) |
| `--token-a` | yes      | First token                             |
| `--token-b` | yes      | Second token                            |

## Amount syntax

| Input       | Interpretation                                    |
| ----------- | ------------------------------------------------- |
| `10`        | 10 display units (scaled by token decimals)       |
| `10000000t` | 10,000,000 raw base units (tinybars / tinyTokens) |

## Batch support

Write commands (`deposit`, `withdraw`, `swap`, `buy`) register `batchify` hooks and can be composed into a HIP-551 atomic batch.
