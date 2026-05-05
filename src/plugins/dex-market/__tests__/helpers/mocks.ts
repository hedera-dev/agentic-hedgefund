import type { CommandHandlerArgs } from '@hiero-ledger/hiero-cli';

export function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
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
    logger,
    state: {} as unknown as CommandHandlerArgs['state'],
    config: {} as unknown as CommandHandlerArgs['config'],
    args: config.args ?? {},
    hooks: new Map(),
  };
}
