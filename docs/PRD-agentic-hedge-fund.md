# PRD: Agentic Hedge Fund — Hiero CLI Reference Demo Application

- **Status:** Draft
- **Date:** 2026-04-21
- **Owner:** Hiero CLI Team
- **Related ADRs:** [ADR-001 — SaucerSwap V1 DEX Plugin](adr/ADR-001-saucerswap-v1-dex-plugin.md), [ADR-002 — SaucerSwap V2 DEX Plugin](adr/ADR-002-saucerswap-v2-dex-plugin.md)
- **Host CLI:** `@hiero-ledger/hiero-cli` — the upstream Hiero CLI package this demo depends on (often installed from a tarball or a local fork checkout via `file:` in `package.json`)

---

## 1. Problem & Vision

### What Are We Demonstrating?

The **Hiero CLI** (imported in this repo as `@hiero-ledger/hiero-cli`) is a modular, plugin-based command-line interface for Hedera. Core plugins shipped with the host CLI include **account**, **hbar**, **token**, **contract**, **batch**, **schedule**, **network**, **config**, **credentials**, **topic**, **plugin-management**, **contract-erc20**, **contract-erc721**, and others — each exposing typed commands with structured (Zod-backed) output.

This **demo application** adds **two** first-party DEX plugins documented in **ADR-001** and **ADR-002**:

| Plugin              | Protocol                                                           | Role in DeFi demos                                                                                           |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **`saucerswap-v1`** | Uniswap V2–style AMM (constant product, fungible LP)               | Classic swaps, add/remove liquidity, pool discovery via REST                                                 |
| **`saucerswap-v2`** | Uniswap V3–style concentrated liquidity (NFT positions, fee tiers) | Swaps with `--fee-tier`, NFT-based LP (`mint-position`, `increase-liquidity`, etc.), V2 REST pools/positions |

Both plugins share **`SaucerSwapApiService`** and Zod API schemas under `src/shared/` (see ADRs). Read-only pool listing requires a user-supplied **`--api-key`** (SaucerSwap `x-api-key`).

The **Agentic Hedge Fund** is a reference demo application that answers the question:

> _"What if a hedge fund could run as a set of composable agents using CLI tools as their execution layer?"_

This demo demonstrates that:

1. **AI agents can be first-class actors** that interact with blockchain infrastructure through typed CLI commands
2. **The Hiero CLI plugin model is genuinely extensible** — dedicated DEX plugins (`saucerswap-v1`, `saucerswap-v2`) compose with core plugins without forking the host CLI
3. **Composability across plugins creates emergent capabilities** — batch atomicity, scheduled multi-sig governance, and DEX trading combine into a system that exceeds the sum of its parts
4. **On-chain actions are verifiable and auditable** — every agent action maps to a CLI invocation with structured input and output

### Why a Hedge Fund?

A hedge fund operating on-chain is a high-value, high-complexity scenario that exercises every layer of the CLI:

| Fund Operation           | CLI capability (examples)                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Portfolio observation    | `saucerswap-v1 list` / `view` (with `--api-key`), `saucerswap-v2 list-pools` / `view-pool`, `token view`, `account balance` |
| Trade execution (V1)     | `saucerswap-v1 swap`, `saucerswap-v1 buy`                                                                                   |
| Trade execution (V2)     | `saucerswap-v2 swap`, `saucerswap-v2 buy` (requires `--fee-tier`; single-hop path)                                          |
| V1 liquidity             | `saucerswap-v1 deposit`, `saucerswap-v1 withdraw`                                                                           |
| V2 liquidity             | `saucerswap-v2 mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees`, `list-positions`                 |
| Token allowance / ERC-20 | `contract` / `contract-erc20` (e.g. `approve` patterns as supported by the host CLI)                                        |
| Atomic rebalancing       | `batch create` + commands with `--batch` + `batch execute`                                                                  |
| Multi-sig governance     | `schedule create` + `schedule sign` / `verify` / `delete` + `--scheduled` on supported commands                             |
| Wallet management        | `account create`, `account balance`, `account import`, `hbar transfer`, `token transfer-ft`                                 |

No single plugin demo could showcase this breadth. A hedge fund scenario naturally touches core host plugins and both SaucerSwap plugins.

---

## 2. User Personas

### 2.1 Developer Exploring the Hiero CLI

**Profile:** A blockchain developer or DevOps engineer evaluating the Hiero CLI for their project. They want to understand the plugin model, see real command examples, and understand how plugins compose.

**Needs:**

- Clear mapping from business concepts (trade, rebalance) to CLI commands
- Runnable examples they can execute on testnet
- Understanding of plugin extensibility — how they could build their own agents or plugins

**How this demo serves them:** The Agentic Hedge Fund provides a complete, end-to-end reference that exercises 6+ plugins in concert. The developer can follow the example flows, modify strategies, and see how the CLI's modular design enables complex applications.

### 2.2 AI Agent (System Actor)

**Profile:** An autonomous or semi-autonomous software agent (LLM-based or algorithmic) that acts as a portfolio manager. It reads market state, decides on actions, and executes them through CLI commands.

**Needs:**

- Structured JSON output from every command (`--format json`)
- Predictable error types with machine-parseable codes
- Idempotent or safely retriable operations
- State persistence (agent can resume after restart)
- Clear separation: agent decides, CLI executes

**How this demo serves them:** The demo defines a clean interface contract — agents invoke CLI commands, parse JSON responses, and log decisions. The CLI handles signing, networking, retries, and state management.

### 2.3 Fund Administrator / Compliance Officer

**Profile:** A human who oversees the fund's operations, approves large trades, and reviews audit logs.

**Needs:**

- Multi-sig approval for large transactions (via scheduled transactions)
- Human-readable output for monitoring (`--format human`)
- Audit trail of all agent actions
- Ability to pause/override agent decisions

**How this demo serves them:** The scheduled transaction flow demonstrates governance. The admin can review pending schedules (`schedule verify`), add their signature (`schedule sign`), or reject (`schedule delete`).

---

## 3. System Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT LAYER (Strategy)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Market     │  │  Strategy    │  │  Risk /      │               │
│  │   Observer   │  │  Engine      │  │  Compliance  │               │
│  │   Agent      │  │  Agent       │  │  Agent       │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                       │
│  ┌──────▼─────────────────▼─────────────────▼─────────────────────┐ │
│  │              ORCHESTRATOR / EXECUTION AGENT                    │ │
│  │  (translates intents → CLI commands, manages retries/logging)  │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  JSON stdin/stdout
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLI EXECUTION LAYER                             │
│                                                                     │
│  ┌────────────┬────────────┬──────────┬──────────┬─────────┬─────┐  │
│  │saucerswap- │saucerswap- │  token   │   hbar   │ schedule│batch│  │
│  │    v1      │    v2      │  plugin  │  plugin  │ plugin  │     │  │
│  └────────────┴────────────┴──────────┴──────────┴─────────┴─────┘  │
│  ┌──────────┬──────────┬──────────────────────────────────────────┐  │
│  │ account  │ contract │  (+ network, config, credentials, …)   │  │
│  └──────────┴──────────┴──────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Core API Services                         │ │
│  │  KeyResolver │ KMS │ MirrorNode │ TxSign │ TxExecute │ State   │ │
│  │  ContractQuery │ IdentityResolution │ (+ batch/schedule hooks) │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN LAYER                                │
│                                                                     │
│    Hedera Network (testnet / mainnet)                               │
│    ┌────────────┐  ┌────────────────┐  ┌──────────────────────┐     │
│    │ Consensus  │  │  Mirror Node   │  │ SaucerSwap V1 / V2   │     │
│    │  Nodes     │  │  REST API      │  │ smart contracts       │     │
│    └────────────┘  └────────────────┘  └──────────────────────┘     │
│                                         ┌──────────────────────┐    │
│                                         │ SaucerSwap REST API  │    │
│                                         │ (V1 /v2 pools, keys)│    │
│                                         └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer                   | Responsibility                                                                              | Technology                                                |
| ----------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Agent Layer**         | Observe market, decide strategy, enforce risk rules                                         | Python/TypeScript scripts, LLM, or algorithmic strategies |
| **CLI Execution Layer** | Parse commands, resolve keys, build/sign/execute transactions, persist state, format output | Hiero CLI (Node.js, Zod, Zustand, Hedera SDK)             |
| **Blockchain Layer**    | Consensus, state, smart contracts, historical data                                          | Hedera network, Mirror Node, SaucerSwap protocol          |

The critical design principle: **agents never interact with the blockchain directly**. They only interact with the CLI. This provides:

- **Security**: agents reference key aliases, never raw private keys, used keys can be enforced to be encrypted
- **Auditability**: every action is a logged CLI invocation
- **Testability**: agents can be tested against CLI output mocks
- **Portability**: swap the agent framework (LLM, rule engine, RL model) without changing the execution layer

---

## 4. Core Features

### 4.1 Wallet & Account Management

Agents manage fund accounts through the `account` plugin.

| Capability               | Command           | Notes                                         |
| ------------------------ | ----------------- | --------------------------------------------- |
| Create fund accounts     | `account create`  | Operator, treasury, strategy-specific wallets |
| Check balances           | `account balance` | HBAR + token balances via Mirror Node         |
| List managed accounts    | `account list`    | All locally tracked accounts                  |
| Import existing accounts | `account import`  | Bring in pre-existing fund wallets            |
| View account details     | `account view`    | On-chain account state                        |

**Agent pattern:** The orchestrator agent creates dedicated accounts per strategy (isolation) and monitors balances to trigger rebalances.

### 4.2 Market Observation

Agents read DEX and token state through read-only commands.

| Capability             | Command                                                                   | Notes                                                                  |
| ---------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| List V1 pools (REST)   | `saucerswap-v1 list --api-key <key> [--token …]`                          | Optional token filter (ID / symbol / name substring)                   |
| View V1 pair (REST)    | `saucerswap-v1 view --api-key <key> -a <A> -b <B>`                        | Reserves and pool contract id from API (token ids resolved via mirror) |
| List V2 pools (REST)   | `saucerswap-v2 list-pools --api-key <key> [--token …] [--fee-tier …]`     | V2 concentrated-liquidity pools                                        |
| View V2 pool           | `saucerswap-v2 view-pool --api-key <key> -a <A> -b <B> --fee-tier <tier>` | `tier` ∈ {500, 1500, 3000, 10000}; on-chain `getPool` + API enrichment |
| List V2 NFT positions  | `saucerswap-v2 list-positions --api-key <key> [--account …]`              | Positions for operator or given account                                |
| Token information      | `token view` (host CLI)                                                   | Decimals, supply, metadata — see host plugin options                   |
| Account token balances | `account balance` (host CLI)                                              | Current holdings                                                       |

**Agent pattern:** The Market Observer agent polls these commands on an interval, builds a local price/liquidity model, and publishes snapshots to the Strategy Engine. **V1/V2 pool metadata requires a valid SaucerSwap API key** (`--api-key`).

### 4.3 Trade Execution

Agents execute swaps, transfers, and (separately) liquidity operations.

| Capability         | Command                                                                   | Notes                                                       |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| V1 swap (exact in) | `saucerswap-v1 swap --from … --to … --amount …`                           | Slippage / `min-output`, deadline, gas per ADR-001          |
| V1 buy (exact out) | `saucerswap-v1 buy --from … --to … --amount … [--max-input …]`            | Optional max input from router quote                        |
| V2 swap (exact in) | `saucerswap-v2 swap --from … --to … --amount … --fee-tier …`              | Single pool / single fee tier; path encoding in plugin      |
| V2 buy (exact out) | `saucerswap-v2 buy --from … --to … --amount … --max-input … --fee-tier …` | Caps input; payable HBAR path when `from` is HBAR           |
| Transfer HBAR      | `hbar transfer` (host CLI)                                                | Native currency movement                                    |
| Transfer tokens    | `token transfer-ft` (host CLI)                                            | Fungible token movement                                     |
| Associate tokens   | `token associate` (host CLI)                                              | Required before receiving a new token                       |
| ERC-20 allowance   | `contract` / `contract-erc20` (host CLI)                                  | As needed so routers can pull tokens (V1/V2 token-in paths) |

**Agent pattern:** The Execution Agent translates Strategy Engine intents into specific plugin commands with slippage, deadline, **and for V2 an explicit fee tier**. Token references follow host patterns: Hedera ID, alias, EVM address where supported, and `HBAR` / WHBAR id per plugin docs.

### 4.4 Liquidity Management

| Protocol | Add / remove / fees                                                                       | Notes                                                                                    |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **V1**   | `saucerswap-v1 deposit`, `saucerswap-v1 withdraw`                                         | Constant-product pools; fungible LP (8 decimals in plugin constants)                     |
| **V2**   | `saucerswap-v2 mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees` | NFT positions; ticks, fee tier, optional `unwrap-hbar` / `burn` on decrease per manifest |

**Agent pattern:** V1: classic LP deposit/withdraw. V2: manage NFT serials (`list-positions`), adjust liquidity in-range, collect fees — aligns with ADR-002 concentrated-liquidity model.

### 4.5 Atomic Batch Operations (Rebalancing)

The `batch` plugin enables atomic, multi-step portfolio rebalancing.

| Capability         | Command                                     | Notes                                |
| ------------------ | ------------------------------------------- | ------------------------------------ |
| Create batch       | `batch create --name <name> --key <signer>` | Group of transactions                |
| Add operations     | Any command with `--batch <name>`           | Defer execution                      |
| Execute atomically | `batch execute --name <name>`               | All-or-nothing (HIP-551, max 50 txs) |
| Review pending     | `batch list`                                | See batches before execution         |
| Cancel             | `batch delete --name <name>`                | Discard the batch                    |

**Agent pattern — atomic rebalance:**

```bash
hcli batch create --name rebalance-42 --key fund-operator
hcli saucerswap-v1 withdraw --token-a USDC --token-b HBAR --liquidity 50 --batch rebalance-42
hcli saucerswap-v1 swap --from HBAR --to SAUCE --amount 200 --batch rebalance-42
hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC --amount-a 200 --amount-b 1000 --batch rebalance-42
hcli batch execute --name rebalance-42
```

If any step fails, the entire rebalance reverts. No partial-fill risk.
Need to remember that transactions in the batch must be independent of each other.

### 4.6 Multi-Sig Governance (Scheduled Transactions)

The `schedule` plugin provides deferred, multi-party approval for high-value operations.

| Capability                 | Command                               | Notes                                 |
| -------------------------- | ------------------------------------- | ------------------------------------- |
| Define schedule parameters | `schedule create`                     | Admin key, payer, expiration, memo    |
| Schedule a transaction     | Any command with `--scheduled <name>` | Defers to `ScheduleCreateTransaction` |
| Add signatures             | `schedule sign`                       | Additional key holders approve        |
| Check status               | `schedule verify`                     | Mirror Node execution/deletion state  |
| Reject                     | `schedule delete`                     | Admin cancels the schedule            |

**Agent pattern — large trade approval:**

```bash
# Risk agent defers a large trade
hcli schedule create --name large-swap --admin-key compliance-officer \
    --expiration "2026-04-03T18:00:00.000+02:00"
hcli saucerswap-v1 swap --from HBAR --to USDC --amount 50000 \
    --slippage 1.0 --scheduled large-swap

# Human fund managers approve
hcli schedule sign --schedule large-swap --key portfolio-manager
hcli schedule sign --schedule large-swap --key risk-officer

# Anyone can verify execution
hcli schedule verify --name large-swap
```

---

## 5. Example Flows

### Flow 1: Agent Observes Market and Executes a Swap

**Trigger:** Market Observer detects HBAR/USDC price dip below moving average.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Market    │     │   Strategy   │     │  Execution   │
│   Observer   │────▶│    Engine    │────▶│    Agent     │
│              │     │              │     │              │
│ saucerswap-v1│     │ "Buy 500     │     │ saucerswap-v1│
│ view → JSON  │     │  USDC with   │     │ swap →       │
│              │     │  HBAR"       │     │ JSON result  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Step-by-step:**

1. **Market Observer** runs:

   ```bash
   hcli saucerswap-v1 view --api-key <SAUCERSWAP_API_KEY> -a HBAR -b USDC --format json
   ```

   Parses JSON (shape per `SaucerSwapV1ViewOutputSchema`): e.g. `reserveA`, `reserveB`, `poolContractId`, `tokenA`, `tokenB` — agent may derive an implied price off-chain from reserves and decimals.

2. **Strategy Engine** receives the price snapshot, compares against its 24h moving average, and emits intent:

   ```json
   {
     "action": "swap",
     "tokenIn": "HBAR",
     "tokenOut": "USDC",
     "amountIn": 5000,
     "slippage": 0.5
   }
   ```

3. **Risk Agent** validates:
   - Position size within limits (checks `account balance --format json`)
   - Slippage is acceptable given pool liquidity
   - Approves the intent

4. **Execution Agent** runs:

   ```bash
   hcli saucerswap-v1 swap --from HBAR --to USDC \
       --amount 5000 --slippage 0.5 --format json
   ```

5. **Execution Agent** logs the JSON result (transaction ID, amounts, network) to the audit trail.

### Flow 2: Atomic Portfolio Rebalance

**Trigger:** Strategy Engine determines the portfolio is overweight HBAR and underweight SAUCE/USDC LP.

**Step-by-step:**

1. **Execution Agent** creates a batch:

   ```bash
   hcli batch create --name rebalance-2026-04-02 --key fund-operator --format json
   ```

2. **Execution Agent** adds operations:

   ```bash
   hcli token transfer-ft --token USDC --from fund-treasury --to fund-operator \
       --amount 1000 --batch rebalance-2026-04-02

   hcli saucerswap-v1 swap --from HBAR --to SAUCE \
       --amount 2000 --slippage 1.0 --batch rebalance-2026-04-02

   hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC \
       --amount-a 500 --amount-b 1000 --slippage 2.0 --batch rebalance-2026-04-02
   ```

3. **Execution Agent** executes atomically:

   ```bash
   hcli batch execute --name rebalance-2026-04-02 --format json
   ```

   All three operations succeed or none do.

4. **Results** are logged: transaction ID, success status, post-execution balances queried via `account balance`.

### Flow 3: Governed Large Trade with Multi-Sig Approval

**Trigger:** Strategy Engine wants to execute a trade exceeding the $10,000 threshold, which requires 2-of-3 key holder approval.

**Step-by-step:**

1. **Risk Agent** creates a governed schedule:

   ```bash
   hcli schedule create --name large-trade-001 \
       --admin-key compliance-officer \
       --expiration "2026-04-03T18:00:00.000+02:00" \
       --memo "Large HBAR→USDC swap requiring approval" \
       --format json
   ```

2. **Execution Agent** attaches the trade to the schedule:

   ```bash
   hcli saucerswap-v1 swap --from HBAR --to USDC \
       --amount 50000 --slippage 1.0 \
       --scheduled large-trade-001
   ```

   The `--scheduled` hook wraps the swap in a `ScheduleCreateTransaction`. The trade is **not executed** — it awaits signatures.

3. **Notification** is sent to key holders (out-of-band: email, Slack, dashboard).

4. **Key holders sign:**

   ```bash
   # Portfolio manager approves
   hcli schedule sign --schedule large-trade-001 --key portfolio-manager

   # Risk officer approves
   hcli schedule sign --schedule large-trade-001 --key risk-officer
   ```

   Once the required threshold of signatures is met, Hedera automatically executes the scheduled transaction.

5. **Verification:**
   ```bash
   hcli schedule verify --name large-trade-001 --format json
   ```
   Returns execution status, transaction ID, and whether the schedule was executed or expired.

### Flow 4: Yield Farming Lifecycle

**Trigger:** Strategy Engine identifies a high-APY liquidity pool.

**Step-by-step:**

1. **Discovery:**

   ```bash
   hcli saucerswap-v1 list --api-key <SAUCERSWAP_API_KEY> --token SAUCE --format json
   ```

   Returns all pools with SAUCE, including reserves and implied APY data.

2. **Deposit:**

   ```bash
   hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC \
       --amount-a 1000 --amount-b 500 --slippage 2.0 --format json
   ```

3. **Monitoring (periodic):**

   ```bash
   hcli saucerswap-v1 view --api-key <SAUCERSWAP_API_KEY> -a SAUCE -b USDC --format json
   hcli account balance --account fund-operator --format json
   ```

   The agent tracks impermanent loss vs. fee income.

4. **Withdrawal (when IL exceeds threshold):**
   ```bash
   hcli saucerswap-v1 withdraw --token-a SAUCE --token-b USDC \
       --liquidity 100 --slippage 2.0 --format json
   ```

---

## 6. Architecture Mapping to the Hiero CLI

### 6.1 Plugin Model Usage

The **host** Hiero CLI (`@hiero-ledger/hiero-cli`) supplies core plugins; **this repository** adds `saucerswap-v1` and `saucerswap-v2` as documented in ADR-001 and ADR-002.

**Core host plugins (representative — see fork `src/plugins/*/manifest.ts` for the full command list):**

| Plugin                                               | Role in the fund                       | Representative commands                                                                  |
| ---------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| **account**                                          | Wallets, balances                      | `create`, `balance`, `list`, `import`, `view`, `update`, `delete`, `clear`               |
| **hbar**                                             | Native transfers                       | `transfer`                                                                               |
| **token**                                            | HTS fungible/non-fungible ops          | `transfer-ft`, `transfer-nft`, `associate`, `create-ft`, `mint-ft`, `burn-ft`, `view`, … |
| **contract**                                         | Generic contract calls / deploy flows  | As exposed by host CLI                                                                   |
| **contract-erc20** / **contract-erc721**             | ERC-style helpers                      | As exposed by host CLI                                                                   |
| **batch**                                            | HIP-551 atomic batches                 | `create`, `execute`, `list`, `delete` (+ `batchify-*` hook commands)                     |
| **schedule**                                         | Scheduled / multi-party txs            | `create`, `sign`, `delete`, `verify` (+ `scheduled` hook)                                |
| **network**                                          | Network selection / config             | As exposed by host CLI                                                                   |
| **config** / **credentials** / **plugin-management** | CLI configuration and plugin lifecycle | As exposed by host CLI                                                                   |

**First-party DEX plugins (this repo):**

| Plugin            | Role                                    | Commands                                                                                                                                |
| ----------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **saucerswap-v1** | Uniswap V2–style AMM (constant product) | `swap`, `buy`, `deposit`, `withdraw`, `list`, `view`                                                                                    |
| **saucerswap-v2** | V3-style concentrated liquidity         | `swap`, `buy`, `mint-position`, `increase-liquidity`, `decrease-liquidity`, `collect-fees`, `list-pools`, `view-pool`, `list-positions` |

Transactional DEX commands are implemented to align with host patterns (**`BaseTransactionCommand`**, Zod inputs, structured outputs) and are candidates for **`--batch`** / **`--scheduled`** where the host hook registration matches other transaction plugins (see ADR-001 / ADR-002).

### 6.2 Core API Services Leveraged

Each CLI command handler receives `CoreApi` via dependency injection. The fund leverages:

| Service                              | Usage                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.keyResolver`                    | Resolve agent key aliases → signing credentials without exposing private keys                                                                                           |
| `api.kms`                            | Encrypted key storage (`local_encrypted` key manager for production)                                                                                                    |
| `api.mirror`                         | Read account info, token info, scheduled transaction state from Mirror Node                                                                                             |
| `api.txSign` / `api.txExecute`       | Build, sign, and submit Hedera transactions                                                                                                                             |
| `api.state`                          | Persist fund state: batch definitions, schedule records, plugin-specific data                                                                                           |
| `api.network`                        | Network resolution (testnet for dev, mainnet for production)                                                                                                            |
| `api.config`                         | Runtime options (key manager type, log level, skip confirmations)                                                                                                       |
| `api.schedule`                       | Build `ScheduleCreate`, `ScheduleSign`, `ScheduleDelete` transactions                                                                                                   |
| `api.batch`                          | Build atomic `BatchTransaction` from collected transaction bytes                                                                                                        |
| `api.contract` / `api.contractQuery` | Contract writes/queries — V1 router/factory via SDK parameters; V2 swap/NFPM often builds raw calldata (`ContractExecuteTransaction.setFunctionParameters`) per ADR-002 |
| `api.identityResolution`             | Resolve token/account references to entity IDs and EVM addresses                                                                                                        |

### 6.3 Hook System Integration

The fund relies on two hooks:

**`batchify` hook** (from `batch` plugin):

- Injected via `--batch <name>` on any supported command
- Intercepts at `preExecuteTransactionHook`: serializes the signed transaction, adds it to batch state, returns `breakFlow: true`
- Enables atomic rebalancing (Flow 2)

**`scheduled` hook** (from `schedule` plugin):

- Injected via `--scheduled <name>` on any supported command
- Intercepts at `preSignTransactionHook`: wraps the inner transaction in `ScheduleCreateTransaction`, signs with admin/payer keys, executes once, returns `breakFlow: true`
- Enables governed trading (Flow 3)

Both hooks follow the same architectural pattern: they declare options in their plugin manifest, commands opt in via `registeredHooks`, and the CLI framework merges the hook options and runs the hook lifecycle automatically. **No agent code changes are needed to use batch or scheduled modes** — the agent simply adds `--batch` or `--scheduled` to its existing commands.

### 6.4 Extensibility Points

The plugin architecture enables future fund capabilities without modifying existing code:

| Extension                                       | How                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| **New DEX protocol** (e.g., Pangolin, HeliSwap) | New plugin, same command patterns as SaucerSwap                                    |
| **Lending/borrowing**                           | New plugin with `deposit`, `borrow`, `repay` commands                              |
| **Oracle price feeds**                          | New plugin wrapping oracle contract reads                                          |
| **Staking**                                     | New plugin for native HBAR staking or liquid staking protocols                     |
| **Custom strategy hooks**                       | New hook that intercepts commands for strategy-specific logic (e.g., auto-hedging) |
| **Notification plugin**                         | Post-output hook that sends Slack/email on trade execution                         |
| **Portfolio analytics**                         | Read-only plugin that aggregates state across plugins and outputs reports          |

Each extension follows the same pattern: publish a `PluginManifest`, implement command handlers that receive `CoreApi`, and optionally define hooks. The fund's agent layer doesn't change — it just gets new CLI commands to invoke.

### 6.5 Output Contract

All commands return `CommandResult`:

```typescript
interface CommandResult {
  result: object; // Zod-validated structured output
  overrideSchema?: ZodType; // Optional schema override (hook short-circuits)
  overrideHumanTemplate?: string;
}
```

The CLI formats output based on `--format`:

- **`json`** (agent consumption): raw JSON of the `result` object, machine-parseable
- **`human`** (admin monitoring): Handlebars template rendering with hashscan links, emoji status indicators

Agents always use `--format json`. Administrators use default human output or dashboards fed by JSON.

### 6.6 Error Handling Contract

All errors extend `CliError` with a typed `code`, optional `context`, and `recoverable` flag:

| Error Type                           | Agent Response                               |
| ------------------------------------ | -------------------------------------------- |
| `ValidationError`                    | Fix parameters and retry                     |
| `TransactionError` (recoverable)     | Retry with backoff                           |
| `TransactionError` (non-recoverable) | Log, alert, skip                             |
| `TransactionPrecheckError`           | Check balances/allowances, adjust parameters |
| `NetworkError`                       | Retry with exponential backoff               |
| `NotFoundError`                      | Stale reference — refresh state              |
| `AuthorizationError`                 | Key mismatch — escalate to admin             |
| `StateError`                         | Corrupted local state — reset and reimport   |

The Execution Agent parses the exit code and JSON error output to decide on retries vs. escalation.

---

## 7. Scope & Boundaries

### In Scope (Demo v1)

- [ ] **Agent scripts** (TypeScript or Python) implementing the four flows described above
- [ ] **SaucerSwap V1 plugin** per ADR-001: `swap`, `buy`, `list`, `view`, `deposit`, `withdraw` (plus shared `SaucerSwapApiService` / `--api-key` for REST)
- [ ] **SaucerSwap V2 plugin** per ADR-002: swaps, concentrated-liquidity lifecycle, V2 REST list/view/positions
- [ ] **Example strategy**: simple mean-reversion or rebalancing strategy
- [ ] **Testnet deployment**: all demo operations on Hedera testnet
- [ ] **Audit logging**: agent logs every CLI invocation with input/output to a local file
- [ ] **README / walkthrough**: step-by-step guide to run the demo
- [ ] **Docker compose** or equivalent for easy local setup (CLI + agent)

### Out of Scope (v1)

- Production-grade AI/ML strategy (demo uses rule-based or simple logic)
- Real funds or mainnet deployment
- Frontend dashboard (agents are CLI-only for v1)
- Advanced risk models (demo uses simple threshold checks)
- Hot-reload or live agent management
- Cross-chain operations
- MEV protection beyond slippage settings

---

## 8. Technical Requirements

### 8.1 SaucerSwap plugins (prerequisite)

Implementation is defined in **ADR-001** (V1) and **ADR-002** (V2). Summary:

**V1 (`saucerswap-v1`)** — Uniswap V2–style router/factory; `swap` / `buy` use `ContractFunctionParameters` and path `address[]`. **`list`** / **`view`** use **`SaucerSwapApiService.fetchAllPools`** / **`findV1PoolForTokenPair`** with user **`--api-key`**. **`deposit`** / **`withdraw`** call `addLiquidity*` / `removeLiquidity*`.

**V2 (`saucerswap-v2`)** — SwapRouter / NonfungiblePositionManager / Factory; **ABI-encoded structs** and **`multicall`** per ADR-002. **`swap`** / **`buy`** require **`--fee-tier`**. Read-only **`list-pools`**, **`view-pool`**, **`list-positions`** use V2 REST endpoints via the same shared API service (**`--api-key`**).

**Shared:** `src/shared/services/saucerswap-api/`, `SaucerSwapApiKeySchema` and API payload schemas in `src/shared/schemas/schemas.ts`, shared utils under `src/shared/util/`.

Transactional commands should follow host conventions for **`batchify`** and **`scheduled`** hooks where registered (same pattern as **hbar**, **token**, **account** commands in the fork).

### 8.2 Agent Framework

- Language: TypeScript (preferred, for type sharing with CLI)
- Communication: shell invocation of `hcli` binary with `--format json`, parse stdout
- Concurrency: single-agent execution per strategy (no concurrent state mutations on same batch/schedule)
- Configuration: environment variables or config file for strategy parameters (thresholds, intervals, slippage defaults)

### 8.3 State & Persistence

- CLI state persists in `~/.hiero-cli/state/` (Zustand file-backed stores)
- Agent decision logs persist in a configurable directory
- Each agent run is idempotent or safely resumable (check state before acting)

### 8.4 Testing Strategy

| Level           | What                           | How                                         |
| --------------- | ------------------------------ | ------------------------------------------- |
| **Unit**        | Individual CLI plugin commands | Jest mocks for CoreApi (existing patterns)  |
| **Integration** | Agent → CLI → testnet          | End-to-end scripts on Hedera testnet        |
| **Strategy**    | Agent decision logic           | Unit tests with mocked market data          |
| **Demo**        | Full walkthrough               | Scripted scenario on testnet with seed data |

---

## 9. Success Criteria

1. **End-to-end demo runs on testnet** with at least the four flows described in Section 5
2. **All CLI invocations use `--format json`** and agents successfully parse every response
3. **Atomic rebalance** (Flow 2) demonstrates that a multi-step portfolio change either fully succeeds or fully reverts
4. **Multi-sig governance** (Flow 3) demonstrates that a large trade requires multiple human approvals before execution
5. **No private keys are exposed** to agent code — all signing uses key aliases resolved by the CLI
6. **A new developer can run the demo** in under 15 minutes using the provided README
7. **The demo showcases multiple host plugins plus both SaucerSwap plugins** working together in a single scenario (e.g. account + token + hbar + batch + schedule + `saucerswap-v1` and/or `saucerswap-v2`)

---

## 10. Glossary

| Term                    | Definition                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Agent**               | An autonomous software component that makes decisions and invokes CLI commands                 |
| **Orchestrator**        | The top-level agent that coordinates sub-agents and translates intents to CLI calls            |
| **Intent**              | A high-level action description (e.g., "swap 500 HBAR to USDC") emitted by the Strategy Engine |
| **CLI Execution Layer** | The Hiero CLI and its plugins, acting as the bridge between agents and the blockchain          |
| **Batch**               | A group of transactions executed atomically via `batch create` + `batch execute` (HIP-551)     |
| **Schedule**            | A deferred transaction requiring multi-party signatures before execution                       |
| **Slippage**            | Maximum acceptable price deviation for DEX operations                                          |
| **LP Token**            | Liquidity Provider token received when depositing into a DEX pool                              |
| **WHBAR**               | Wrapped HBAR (ERC-20 representation used by SaucerSwap for HBAR pairs)                         |
| **saucerswap-v1**       | First-party CLI plugin: SaucerSwap constant-product AMM (ADR-001)                              |
| **saucerswap-v2**       | First-party CLI plugin: SaucerSwap concentrated liquidity / V3-style protocol (ADR-002)        |
| **Fee tier (V2)**       | Pool fee level (e.g. 500 = 0.05%, 10000 = 1%); required for V2 swaps and pool view             |
| **Mirror Node**         | Hedera's read-only API for historical and current chain state                                  |
| **CoreApi**             | The dependency-injected service container available to all CLI command handlers                |
