# demo-agentic-hedgefund-hedera-cli

A reference demo that extends [hiero-ledger/hiero-cli](https://github.com/hiero-ledger/hiero-cli) with two SaucerSwap DEX plugins, used to drive an **Agentic Hedge Fund** — a set of composable Claude Code agents that use the CLI as their execution layer for DeFi operations on Hedera.

## Plugins

### `saucerswap-v1` — SaucerSwap V1 DEX Plugin

Wraps the SaucerSwap V1 (Uniswap V2-style constant-product AMM) contracts and REST API. Tokens are resolved as Hedera entity references (ID, alias, EVM address, or `HBAR`). Amounts accept display units or raw base units with a `t` suffix.

| Command    | Summary                                           |
| ---------- | ------------------------------------------------- |
| `deposit`  | Add liquidity to an existing V1 pool              |
| `withdraw` | Remove liquidity from a V1 pool                   |
| `swap`     | Swap exact input for at least a minimum output    |
| `buy`      | Swap up to a maximum input for an exact output    |
| `list`     | List V1 pools from the SaucerSwap REST API        |
| `view`     | Show reserves and metadata for a specific V1 pool |

Read-only commands (`list`, `view`) require a `--api-key` (SaucerSwap `x-api-key` header).

See [ADR-001](docs/adr/ADR-001-saucerswap-v1-dex-plugin.md) for full design decisions and contract addresses.

---

### `saucerswap-v2` — SaucerSwap V2 Concentrated Liquidity Plugin

Wraps the SaucerSwap V2 (Uniswap V3-style) contracts. Positions are NFT-based; swaps are routed through fee-tiered pools. Parameters are ABI-encoded and submitted via multicall.

| Command              | Summary                                             |
| -------------------- | --------------------------------------------------- |
| `swap`               | Swap exact input for a minimum output on a V2 pool  |
| `buy`                | Swap up to a maximum input for an exact output (V2) |
| `mint-position`      | Create a new concentrated liquidity position (NFT)  |
| `increase-liquidity` | Add liquidity to an existing V2 position            |
| `decrease-liquidity` | Remove liquidity from a V2 position                 |
| `collect-fees`       | Collect accrued swap fees from a V2 position        |
| `list-pools`         | List V2 pools from the SaucerSwap REST API          |
| `view-pool`          | Resolve and enrich a specific V2 pool               |
| `list-positions`     | List V2 NFT positions held by an account            |

Fee tiers: `500` (0.05%), `1500` (0.15%), `3000` (0.30%), `10000` (1.00%).

Read-only commands (`list-pools`, `view-pool`, `list-positions`) require a `--api-key`.

See [ADR-002](docs/adr/ADR-002-saucerswap-v2-dex-plugin.md) for full design decisions and contract addresses.

---

## SaucerSwap API Key

Several commands query the [SaucerSwap REST API](https://docs.saucerswap.finance/v/developer/rest-api/authentication) and require an `--api-key` argument, which is forwarded as the `x-api-key` request header.

To obtain a key, follow the authentication guide in the SaucerSwap developer documentation:
**<https://docs.saucerswap.finance/v/developer/rest-api/authentication>**

Once you have a key, pass it to any read-only command:

```bash
hcli saucerswap-v1 list --api-key <your-api-key>
hcli saucerswap-v2 list-pools --api-key <your-api-key>
```

---

## Building

**Requirements:** Node.js ≥ 18

```bash
npm install
npm run build
```

The build runs Prettier, compiles TypeScript, and resolves path aliases. Compiled plugins are emitted to `dist/plugins/`.

Other useful scripts:

```bash
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check
```

---

## Adding the Plugins to hiero-cli

After building, register each plugin with the `plugin-management add` command of your local `hcli` installation:

```bash
# SaucerSwap V1
hcli plugin-management add -p dist/plugins/saucerswap-v1/

# SaucerSwap V2
hcli plugin-management add -p dist/plugins/saucerswap-v2/
```

Once registered, the commands are available as subcommands of the plugin name:

```bash
hcli saucerswap-v1 list --api-key <key>
hcli saucerswap-v1 swap --from HBAR --to 0.0.12345 --amount 10

hcli saucerswap-v2 list-pools --api-key <key>
hcli saucerswap-v2 swap --from HBAR --to 0.0.12345 --amount 5 --fee-tier 3000
```

---

## Claude Code Skills (Agentic Hedge Fund)

The `skills/` directory contains Claude Code agent skills that drive the Agentic Hedge Fund scenarios. To activate them, copy the skill directories into your Claude Code skills folder.

> **Scope:** use the global path (`~/.claude/skills/` / `%USERPROFILE%\.claude\skills\`) to make skills available in every project, or the project-local path (`.claude/skills/`) to keep them scoped to this repo only. After copying, restart Claude Code so the new skills are picked up.

### Linux

```bash
# Global
cp -r skills/* ~/.claude/skills/

# Project-local
cp -r skills/* .claude/skills/
```

### macOS

```bash
# Global
cp -r skills/* ~/.claude/skills/

# Project-local
cp -r skills/* .claude/skills/
```

### Windows (PowerShell)

```powershell
# Global
Copy-Item -Recurse skills\* "$env:USERPROFILE\.claude\skills\"

# Project-local
Copy-Item -Recurse skills\* .claude\skills\
```

---

### Available Skills

| Skill                              | Description                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `agentic-hedge-fund-saucerswap`    | Flow 1 — observe a V1/V2 pool, compute an implied price, and execute a risk-checked swap or buy                       |
| `agentic-hedge-fund-rebalance`     | Flow 2 — atomic portfolio rebalance (transfer → swap → deposit) via a HIP-551 batch                                   |
| `agentic-hedge-fund-yield-entry`   | Flow 4 entry — discover the deepest liquidity pool for a pair and enter a yield farming position                      |
| `agentic-hedge-fund-yield-monitor` | Flow 4 monitor — watch an open LP position for impermanent loss and exit automatically when the threshold is exceeded |

Invoke skills inside Claude Code with `/agentic-hedge-fund-saucerswap`, `/agentic-hedge-fund-rebalance`, etc.

---

## Repository Layout

```
src/
├── plugins/
│   ├── saucerswap-v1/   # V1 plugin source
│   └── saucerswap-v2/   # V2 plugin source
└── shared/              # Shared services, schemas, and utilities
docs/
├── adr/                 # Architecture Decision Records
└── PRD-agentic-hedge-fund.md
```
