#!/usr/bin/env node
// il-calculator.mjs
//
// Computes impermanent loss for a constant-product LP position (V1 or V2 in-range).
//
// Reads a JSON object from stdin:
//   {
//     "entryPriceAinB":   "0.06",    // decimal string: price of token-A in token-B at position entry
//     "currentPriceAinB": "0.054",   // decimal string: current price of token-A in token-B
//     "tickCurrent":  -500,          // optional (V2 only): current pool tick
//     "tickLower":   -1000,          // optional (V2 only): position lower tick
//     "tickUpper":    1000           // optional (V2 only): position upper tick
//   }
//
// Writes a JSON object to stdout:
//   {
//     "ilPercent":   "0.0031",   // positive decimal string — magnitude of IL (e.g. 0.0031 = 0.31%)
//     "priceRatio":  "0.9",      // currentPrice / entryPrice
//     "outOfRange":  false       // V2 only: true when tickCurrent is outside [tickLower, tickUpper]
//   }
//
// Formula (constant-product IL):
//   r   = currentPrice / entryPrice
//   IL  = 1 - 2*sqrt(r) / (1 + r)   (always ≥ 0)
//
// For V2 in-range positions this is an accurate approximation.
// When outOfRange is true the position is single-sided (100% in one token);
// the formula still runs but may understate actual loss — the caller should note this.

import { readFileSync } from 'node:fs';

function parseDecimal(value, field) {
  const n = parseFloat(value);
  if (!isFinite(n) || n <= 0) {
    throw new Error(
      `${field} must be a positive finite number (got ${JSON.stringify(value)})`,
    );
  }
  return n;
}

function formatDecimal(n, digits = 8) {
  // Remove trailing zeros after decimal point
  return n.toFixed(digits).replace(/\.?0+$/, '') || '0';
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);

  const entryPrice = parseDecimal(input.entryPriceAinB, 'entryPriceAinB');
  const currentPrice = parseDecimal(input.currentPriceAinB, 'currentPriceAinB');

  const r = currentPrice / entryPrice;
  const sqrtR = Math.sqrt(r);
  const ilPercent = 1 - (2 * sqrtR) / (1 + r);

  const result = {
    ilPercent: formatDecimal(ilPercent),
    priceRatio: formatDecimal(r),
  };

  // V2 out-of-range detection
  if (
    input.tickCurrent !== undefined &&
    input.tickLower !== undefined &&
    input.tickUpper !== undefined
  ) {
    const outOfRange =
      input.tickCurrent < input.tickLower ||
      input.tickCurrent > input.tickUpper;
    result.outOfRange = outOfRange;
  }

  process.stdout.write(JSON.stringify(result) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(`il-calculator: ${err.message}\n`);
  process.exit(1);
}
