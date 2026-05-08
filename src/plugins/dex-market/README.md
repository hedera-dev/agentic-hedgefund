# Dex Market Plugin

Market data commands for Hedera tokens. The plugin reads pool and price data from DexScreener and resolves Hedera token IDs through Hedera Mirror Node.

## Data sources

- DexScreener public API for prices, pools, pairs, liquidity, volume, and search.
- Hedera Mirror Node for resolving token references to canonical token IDs and EVM addresses.
- DexScreener endpoints used by this plugin do not require an API key.

## Setup

The project currently depends on `@hiero-ledger/hiero-cli` from a local tarball:

```sh
./hiero-ledger-hiero-cli-0.13.0.tgz
```

The tarball must exist before running install commands.

## Commands

### Price

Fetch current price data for one or more tokens.

```sh
hcli dex-market price --token 0.0.731861 --token 0.0.456858
```

`--token` is repeatable. The maximum batch size is 30 tokens.

### Pools

List pools for a token, sorted by liquidity descending.

```sh
hcli dex-market pools --token 0.0.731861 --limit 10
```

Default limit: 15.

### Search

Search DexScreener pairs on Hedera.

```sh
hcli dex-market search --query SAUCE --limit 10
```

Default limit: 20.

### Pair

Fetch details for a specific pair address.

```sh
hcli dex-market pair --pair 0x4A46705176faC8Fd5C8061F94A2C44416e7B20e6
```

### Liquidity

Check liquidity health for a token.

```sh
hcli dex-market liquidity --token 0.0.731861 --min-usd 10000
```

### Quote

Estimate price impact for a USD position size.

```sh
hcli dex-market quote --token 0.0.731861 --size 1000
```

Quote output is a constant-product approximation. It is not a router-grade executable quote.
