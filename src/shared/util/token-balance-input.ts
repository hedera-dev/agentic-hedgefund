import {
  HBAR_DECIMALS,
  TOKEN_BALANCE_LIMIT,
  ValidationError,
} from '@hiero-ledger/hiero-cli';

export function isRawUnits(userAmountInput: string | number): boolean {
  return String(userAmountInput).trim().endsWith('t');
}

function parseWholeNumber(balance: string): bigint {
  const rawValue = balance.slice(0, -1).trim();
  if (!/^[0-9]+$/.test(rawValue)) {
    throw new ValidationError(
      `Invalid raw units: "${balance}". Must be an integer without decimals (fractional raw units not allowed).`,
    );
  }
  return BigInt(rawValue);
}

function parseDecimalNumber(balance: string, decimals: number): bigint {
  if (decimals < 0) {
    throw new ValidationError(
      `Invalid decimals: ${decimals}. Must be a non-negative integer.`,
    );
  }
  if (balance === 'NaN') {
    throw new ValidationError(
      `Unable to parse balance: "${balance}", balance after parsing is Not a Number.`,
    );
  }
  if (balance.startsWith('-')) {
    throw new ValidationError(
      `Invalid balance: "${balance}". Balance cannot be negative.`,
    );
  }
  if (!/^\d+(\.\d+)?$/.test(balance)) {
    throw new ValidationError(`Invalid balance: "${balance}".`);
  }
  const [intPartRaw, fracPartRaw = ''] = balance.split('.');
  if (fracPartRaw.length > decimals) {
    throw new ValidationError(
      `Invalid balance: "${balance}". Too many decimal places.`,
    );
  }
  const fracPadded = fracPartRaw.padEnd(decimals, '0');
  return BigInt(intPartRaw + fracPadded);
}

function processBalanceInput(
  input: string | number,
  decimals: number = HBAR_DECIMALS,
): bigint {
  const inputStr = String(input).trim();
  const hasRawUnitsSuffix = inputStr.endsWith('t');
  return hasRawUnitsSuffix
    ? parseWholeNumber(inputStr)
    : parseDecimalNumber(inputStr, decimals);
}

export function processTokenBalanceInput(
  input: string | number,
  decimals: number = HBAR_DECIMALS,
): bigint {
  const balance = processBalanceInput(input, decimals);
  if (balance > TOKEN_BALANCE_LIMIT) {
    throw new ValidationError(
      `Maximum balance for token exceeded. Token balance cannot be greater than ${TOKEN_BALANCE_LIMIT}`,
    );
  }
  return balance;
}
