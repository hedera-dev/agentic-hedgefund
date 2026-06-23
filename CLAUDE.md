# Agentic Hedge Fund — Hiero CLI

Reference demo showing how AI agents can act as first-class blockchain actors on Hedera, using three Hiero CLI plugins for DeFi operations on SaucerSwap (V1 and V2) and DEX market data.

## Key rules

- **Use the global `hcli` installation** — never the local build at `~/IdeaProjects/hedera-cli-fork/`
- **Always append `--format json`** to every `hcli` command so skills can parse stdout
- **SaucerSwap API key** should live in `.claude/settings.json` under `SAUCERSWAP_API_KEY`, ask for it if not present — never print it
- **Use current operator account** — read it with `hcli network get-operator --format json`
- **Use skills from this project** (in `.claude/skills/`) for all hedge fund flows

## Setup (one-time, run manually by user)

```bash
hcli network use --global testnet          # or mainnet
hcli network set-operator --operator <accountId>:<privateKey>

# Register plugins after build
hcli plugin-management add -p dist/plugins/saucerswap-v1/
hcli plugin-management add -p dist/plugins/saucerswap-v2/
hcli plugin-management add -p dist/plugins/dex-market/
```

## Build & test

```bash
npm run build           # format + clean + tsc + tsc-alias → dist/
npm run test:unit       # typecheck + jest (with coverage)
npm run lint            # ESLint
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier
npm run typecheck       # tsc --noEmit
```

## Project layout

```
src/plugins/
  saucerswap-v1/    # Constant-product AMM (Uniswap V2 style)
  saucerswap-v2/    # Concentrated liquidity (Uniswap V3 style, NFT positions)
  dex-market/       # Read-only market data via DexScreener
src/shared/
  services/         # SaucerSwap REST client, helper utilities
  schemas/          # Zod validation
  types/            # Shared TypeScript interfaces
  util/             # BigInt math, etc.
skills/             # Claude Code agent skills (also in .claude/skills/)
audit/              # Append-only JSONL audit log (agentic-hedge-fund.jsonl)
docs/               # ADRs and PRD
```

## Plugins

### saucerswap-v1 (6 commands)

All commands require `--api-key "$SAUCERSWAP_API_KEY"` for read operations.

```bash
hcli saucerswap-v1 list    --api-key "$KEY" --format json
hcli saucerswap-v1 view    --api-key "$KEY" -a HBAR -b 0.0.429274 --format json
hcli saucerswap-v1 swap    --from HBAR --to 0.0.12345 --amount 10 --slippage 0.5 --format json
hcli saucerswap-v1 buy     --from HBAR --to 0.0.12345 --amount 5 --format json
hcli saucerswap-v1 deposit --token-a HBAR --token-b 0.0.12345 --amount-a 10 --amount-b 100 --format json
hcli saucerswap-v1 withdraw --token-a HBAR --token-b 0.0.12345 --liquidity 50 --format json
```

Contracts (testnet): Router `0.0.19264`, Factory `0.0.1062784`, WHBAR `0.0.1456986`  
Contracts (mainnet): Router `0.0.3045981`, Factory `0.0.1062784`, WHBAR `0.0.1456986`

### saucerswap-v2 (9 commands)

Fee tiers: `500` (0.05%), `1500` (0.15%), `3000` (0.30%), `10000` (1.00%). `--fee-tier` is required for pool-specific operations.

```bash
hcli saucerswap-v2 list-pools       --api-key "$KEY" --token 0.0.12345 --format json
hcli saucerswap-v2 view-pool        --api-key "$KEY" -a HBAR -b 0.0.12345 --fee-tier 3000 --format json
hcli saucerswap-v2 list-positions   --api-key "$KEY" --account <accountId> --format json
hcli saucerswap-v2 swap             --from HBAR --to 0.0.12345 --amount 10 --fee-tier 3000 --slippage 0.5 --format json
hcli saucerswap-v2 buy              --from HBAR --to 0.0.12345 --amount 5 --max-input 20 --fee-tier 3000 --format json
hcli saucerswap-v2 mint-position    --token-a HBAR --token-b 0.0.12345 --fee-tier 3000 --amount-a 10 --amount-b 100 --range-percent 5 --format json
hcli saucerswap-v2 increase-liquidity --position <serial> --amount-a 5 --amount-b 50 --format json
hcli saucerswap-v2 decrease-liquidity --position <serial> --liquidity <amount> --burn --format json
hcli saucerswap-v2 collect-fees     --position <serial> --format json
```

Contracts (testnet): SwapRouter `0.0.1414040`, NFTPositionManager `0.0.1308184`  
Contracts (mainnet): SwapRouter `0.0.3949434`, NFTPositionManager `0.0.4053945`

### dex-market (6 commands, no API key needed)

```bash
hcli dex-market price     --token 0.0.731861 --token 0.0.456858 --format json
hcli dex-market pools     --token 0.0.731861 --limit 10 --format json
hcli dex-market pair      --pair <evmAddress> --format json
hcli dex-market search    --query SAUCE --limit 10 --format json
hcli dex-market liquidity --token 0.0.731861 --min-usd 10000 --format json
hcli dex-market quote     --token 0.0.731861 --size 1000 --format json
```

## Agent skills

Invoke with the skill name. All skills read/write the audit log at `./audit/agentic-hedge-fund.jsonl`.

| Skill                               | Flow    | When to use                                                                                                               |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/agentic-hedge-fund-saucerswap`    | Flow 1  | Observe a V1 or V2 pool and execute a swap (exact input) or buy (exact output) with risk checks. Use `--fee-tier` for V2. |
| `/agentic-hedge-fund-rebalance`     | Flow 2  | Atomic HIP-551 batch: optional treasury transfer → swap → LP deposit. All-or-nothing. Use `--fee-tier` for V2 deposit.    |
| `/agentic-hedge-fund-yield-entry`   | Flow 4a | Discover the deepest liquidity pool (V1 vs V2) for a token pair and enter an LP position.                                 |
| `/agentic-hedge-fund-yield-monitor` | Flow 4b | Read an open LP position from the audit log, compute impermanent loss, exit automatically if IL ≥ threshold.              |

## Token / amount conventions

- Token IDs: Hedera format `0.0.x`, alias, EVM address, or literal `HBAR`
- Amounts: display units (8 decimals assumed) or raw units with `t` suffix (`100t` = 100 raw units)

## Atomic batching (HIP-551)

```bash
hcli batch create --name myBatch --key <accountId> --format json
hcli <any-command> --batch myBatch --format json   # stage a transaction
hcli batch execute --name myBatch --format json    # submit atomically
```

## Frequently used core hcli commands

```bash
hcli network list              --format json
hcli network get-operator      --format json
hcli account view   -a <id>   --format json
hcli account balance -a <id>  --format json
hcli token view   -T <id>     --format json
hcli token associate -T <id> -a <accountId> --format json
hcli token allowance-ft -T <id> -o <owner> -s <spender> -a <amount> --format json
```
