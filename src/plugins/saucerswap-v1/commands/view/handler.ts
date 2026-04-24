import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@hiero-ledger/hiero-cli';
import type { SaucerSwapApiService } from '@/shared/services/saucerswap-api/saucerswap-api-service.interface';
import type { SaucerSwapHelperService } from '@/shared/services/saucerswap-helper/saucerswap-helper-service.interface';
import type { SaucerSwapV1ViewOutput } from './output';

import { NotFoundError } from '@hiero-ledger/hiero-cli';

import { getSaucerSwapV1Config } from '@/plugins/saucerswap-v1/constants';
import { SaucerSwapApiServiceImpl } from '@/shared/services/saucerswap-api/saucerswap-api-service';
import { SaucerSwapHelperServiceImpl } from '@/shared/services/saucerswap-helper/saucerswap-helper-service';

import { SaucerSwapV1ViewInputSchema } from './input';

function normalizeV1TokenId(id: string): string {
  return id.trim().toLowerCase();
}

export class SaucerSwapV1ViewCommand implements Command {
  constructor(
    private readonly saucerSwapApi: SaucerSwapApiService,
    private readonly saucerSwapHelper: SaucerSwapHelperService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = SaucerSwapV1ViewInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapV1Config(network);

    const [tokenA, tokenB] = await Promise.all([
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
    const tokenInfoA = tokenA.tokenInfo;
    const tokenInfoB = tokenB.tokenInfo;

    const idA = String(tokenInfoA.token_id);
    const idB = String(tokenInfoB.token_id);

    const labelA = validArgs.tokenA.value;
    const labelB = validArgs.tokenB.value;

    const pool = await this.saucerSwapApi.findV1PoolForTokenPair(
      config.apiBaseUrl,
      validArgs.apiKey,
      idA,
      idB,
    );

    if (!pool) {
      throw new NotFoundError(
        `No SaucerSwap V1 pool found for ${labelA} / ${labelB} on ${network}`,
        { context: { tokenA: idA, tokenB: idB, network } },
      );
    }

    const userA = normalizeV1TokenId(idA);
    const poolSideA = normalizeV1TokenId(String(pool.tokenA.id));
    const aMatchesApiTokenA = userA === poolSideA;
    const reserveA = aMatchesApiTokenA
      ? pool.tokenReserveA
      : pool.tokenReserveB;
    const reserveB = aMatchesApiTokenA
      ? pool.tokenReserveB
      : pool.tokenReserveA;

    const outputData: SaucerSwapV1ViewOutput = {
      network,
      poolContractId: pool.contractId,
      tokenA: labelA,
      tokenB: labelB,
      reserveA,
      reserveB,
      lpTokenId: pool.lpToken?.id ?? null,
    };

    return { result: outputData };
  }
}

export async function saucerswapV1View(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SaucerSwapV1ViewCommand(
    new SaucerSwapApiServiceImpl(),
    new SaucerSwapHelperServiceImpl(
      args.api.mirror,
      args.api.network,
      args.api.identityResolution,
    ),
  ).execute(args);
}
