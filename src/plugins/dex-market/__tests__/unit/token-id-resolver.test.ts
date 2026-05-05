import { ValidationError } from '@hiero-ledger/hiero-cli';
import { resolveToEvmAddress } from '@/plugins/dex-market/utils/token-id-resolver';

describe('resolveToEvmAddress', () => {
  test('0.0.731861 → correct long-zero EVM address', () => {
    const result = resolveToEvmAddress('0.0.731861');
    expect(result).toBe('0x00000000000000000000000000000000000b2ad5');
  });

  test('0x address → lowercase passthrough', () => {
    const result = resolveToEvmAddress(
      '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
    );
    expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  test('trims whitespace', () => {
    const result = resolveToEvmAddress('  0.0.731861  ');
    expect(result).toBe('0x00000000000000000000000000000000000b2ad5');
  });

  test('invalid input → ValidationError', () => {
    expect(() => resolveToEvmAddress('invalid')).toThrow(ValidationError);
  });

  test('empty string → ValidationError', () => {
    expect(() => resolveToEvmAddress('')).toThrow(ValidationError);
  });
});
