import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapV1ViewOutput } from './output';

import { Interface } from 'ethers';

import { FACTORY_ABI } from '@/plugins/saucerswap-v1/abi/factory';
import { PAIR_ABI } from '@/plugins/saucerswap-v1/abi/pair';
import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { isHbar } from '@/shared/util/hbar-detection';
import {
  resolveTokenToEvm,
  tokenEvmAddress,
} from '@/shared/util/token-resolver';

import { SaucerSwapV1ViewInputSchema } from './input';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class SaucerSwapV1ViewCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV1ViewInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const whbar = tokenEvmAddress(config.whbarTokenId);
    const tokenAEvm = isHbar(validArgs.tokenA, config.whbarTokenId)
      ? whbar
      : resolveTokenToEvm(api, validArgs.tokenA, network, config.whbarTokenId)
          .evmAddress;
    const tokenBEvm = isHbar(validArgs.tokenB, config.whbarTokenId)
      ? whbar
      : resolveTokenToEvm(api, validArgs.tokenB, network, config.whbarTokenId)
          .evmAddress;

    const factoryAbi = new Interface(FACTORY_ABI);
    const getPairResult = await api.contractQuery.queryContractFunction({
      abiInterface: factoryAbi,
      contractIdOrEvmAddress: config.factoryContractId,
      functionName: 'getPair',
      args: [tokenAEvm, tokenBEvm],
    });

    const pairAddress = getPairResult.queryResult[0] as string | undefined;
    if (!pairAddress || pairAddress === ZERO_ADDRESS) {
      const outputData: SaucerSwapV1ViewOutput = {
        network,
        poolContractId: null,
        tokenA: validArgs.tokenA,
        tokenB: validArgs.tokenB,
        reserveA: null,
        reserveB: null,
        lpTokenId: null,
      };
      return { result: outputData };
    }

    const pairAbi = new Interface(PAIR_ABI);

    const [token0Result, reservesResult] = await Promise.all([
      api.contractQuery.queryContractFunction({
        abiInterface: pairAbi,
        contractIdOrEvmAddress: pairAddress,
        functionName: 'token0',
      }),
      api.contractQuery.queryContractFunction({
        abiInterface: pairAbi,
        contractIdOrEvmAddress: pairAddress,
        functionName: 'getReserves',
      }),
    ]);

    const token0 = (token0Result.queryResult[0] as string).toLowerCase();
    const reserve0 = reservesResult.queryResult[0] as bigint;
    const reserve1 = reservesResult.queryResult[1] as bigint;

    const aIsToken0 = tokenAEvm.toLowerCase() === token0;
    const reserveA = aIsToken0 ? reserve0 : reserve1;
    const reserveB = aIsToken0 ? reserve1 : reserve0;
    const poolContractId = evmAddressToHederaId(pairAddress);

    const outputData: SaucerSwapV1ViewOutput = {
      network,
      poolContractId,
      tokenA: validArgs.tokenA,
      tokenB: validArgs.tokenB,
      reserveA: reserveA.toString(),
      reserveB: reserveB.toString(),
      lpTokenId: poolContractId,
    };

    return { result: outputData };
  }
}

function evmAddressToHederaId(evmAddress: string): string {
  const num = BigInt(evmAddress);
  return `0.0.${num}`;
}

export async function saucerswapV1View(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1ViewCommand().execute(args);
}
