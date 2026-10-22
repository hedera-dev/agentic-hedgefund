import type { CommandHandlerArgs } from '@hiero-ledger/hiero-cli';
import type { ResolvedTokenAddress } from '@/plugins/dex-market/services/token-address.service.interface';

export function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    setLevel: jest.fn(),
  };
}

export function makeTokenAddressService(
  evmAddress: string | Record<string, string>,
) {
  return {
    resolveTokenAddress: jest.fn((input: string) => {
      const resolvedEvmAddress =
        typeof evmAddress === 'string' ? evmAddress : evmAddress[input];
      const resolvedToken: ResolvedTokenAddress = {
        tokenId: input,
        evmAddress: resolvedEvmAddress,
      };

      return Promise.resolve(resolvedToken);
    }),
  };
}

export function makeMarketCommandArgs(
  config: {
    args?: Record<string, unknown>;
  } = {},
): CommandHandlerArgs {
  const logger = makeLogger();

  return {
    api: {
      network: {
        getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
      },
      logger,
      state: {} as unknown as CommandHandlerArgs['api']['state'],
      config: {} as unknown as CommandHandlerArgs['api']['config'],
    } as unknown as CommandHandlerArgs['api'],
    args: config.args ?? {},
    hooks: new Map(),
  };
}
