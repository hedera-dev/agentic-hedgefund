import { SwapDirection } from '@/plugins/saucerswap-v1/commands/swap';
import { isHbar } from '@/shared/util/hbar-detection';

function tokenRefString(ref: string | { value: string }): string {
  return typeof ref === 'string' ? ref : ref.value;
}

export function resolveSwapDirection(
  from: string | { value: string },
  to: string | { value: string },
  whbarTokenId: string,
): SwapDirection {
  if (isHbar(tokenRefString(from), whbarTokenId)) {
    return SwapDirection.HBAR_FOR_TOKEN;
  }
  if (isHbar(tokenRefString(to), whbarTokenId)) {
    return SwapDirection.TOKEN_FOR_HBAR;
  }
  return SwapDirection.TOKEN_FOR_TOKEN;
}
