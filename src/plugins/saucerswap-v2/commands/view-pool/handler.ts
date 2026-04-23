import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapApiService } from '@/shared/services/saucerswap-api/saucerswap-api-service.interface';
import type { SaucerSwapV2ViewPoolOutput } from './output';

import { Interface } from 'ethers';

import { FACTORY_ABI } from '@/plugins/saucerswap-v2/abi/factory';
import { getSaucerSwapV2Config } from '@/plugins/saucerswap-v2/constants';
import { SaucerSwapApiServiceImpl } from '@/shared/services/saucerswap-api/saucerswap-api-service';
import { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';

import { SaucerSwapV2ViewPoolInputSchema } from './input';
import { tokenEvmAddress } from '@/shared/util/token-evm';

export class SaucerSwapV2ViewPoolCommand implements Command {
  constructor(
    private readonly saucerSwapApi: SaucerSwapApiService,
    private readonly saucerSwapHelper: SaucerSwapHelperService,
  ) {}
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV2ViewPoolInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV2Config(network);

    const [tokenAResolved, tokenBResolved] = await Promise.all([
      this.saucerSwapHelper.resolveToken({
        value: validArgs.tokenA.value,
        type: validArgs.tokenA.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
      this.saucerSwapHelper.resolveToken({
        value: validArgs.tokenB.value,
        type: validArgs.tokenB.type,
        whbarTokenId: config.whbarTokenId,
        network,
      }),
    ]);
    const tokenAEvm = tokenEvmAddress(tokenAResolved.tokenInfo.token_id);
    const tokenBEvm = tokenEvmAddress(tokenBResolved.tokenInfo.token_id);

    let poolAddress: string | null = null;
    try {
      const getPool = await api.contractQuery.queryContractFunction({
        abiInterface: new Interface(FACTORY_ABI),
        contractIdOrEvmAddress: config.factoryContractId,
        functionName: 'getPool',
        args: [tokenAEvm, tokenBEvm, validArgs.feeTier],
      });
      const addr = getPool.queryResult[0] as string | undefined;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        poolAddress = addr;
      }
    } catch {
      poolAddress = null;
    }

    const pools = await this.saucerSwapApi.fetchV2Pools(
      config.apiBaseUrl,
      validArgs.apiKey,
    );
    const apiPool = pools.find(
      (p) =>
        Number(p.fee) === validArgs.feeTier &&
        matchesApiPool(p, tokenAEvm, tokenBEvm),
    );

    const outputData: SaucerSwapV2ViewPoolOutput = {
      network,
      poolAddress,
      tokenA: apiPool
        ? `${apiPool.tokenA.symbol} (${apiPool.tokenA.id})`
        : validArgs.tokenA.value,
      tokenB: apiPool
        ? `${apiPool.tokenB.symbol} (${apiPool.tokenB.id})`
        : validArgs.tokenB.value,
      feeTier: validArgs.feeTier,
      tickCurrent: apiPool?.tickCurrent ?? null,
      liquidity: apiPool?.liquidity ?? null,
      sqrtRatioX96: apiPool?.sqrtRatioX96 ?? null,
    };
    return { result: outputData };
  }
}

function matchesApiPool(
  pool: { tokenA: { id: string }; tokenB: { id: string } },
  tokenAEvm: string,
  tokenBEvm: string,
): boolean {
  const a = tokenAEvm.toLowerCase();
  const b = tokenBEvm.toLowerCase();
  const idAEvm = hederaIdToEvmLower(pool.tokenA.id);
  const idBEvm = hederaIdToEvmLower(pool.tokenB.id);
  return (idAEvm === a && idBEvm === b) || (idAEvm === b && idBEvm === a);
}

function hederaIdToEvmLower(id: string): string {
  const match = /^0\.0\.(\d+)$/.exec(id);
  if (!match) return id.toLowerCase();
  const hex = BigInt(match[1]).toString(16).padStart(40, '0');
  return `0x${hex}`;
}

export async function saucerswapV2ViewPool(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV2ViewPoolCommand(
    new SaucerSwapApiServiceImpl(),
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
