import type {
  ContractQueryService,
  ContractTransactionService,
} from '@hiero-ledger/hiero-cli';

import { Interface } from 'ethers';

import { ROUTER_ABI } from '@/plugins/saucerswap-v1/abi/router';
import { computeMinOutput } from '@/shared/util/slippage';

export class SaucerSwapV1Helper {
  private readonly routerAbi = new Interface(ROUTER_ABI);

  constructor(
    private readonly contractQuery: ContractQueryService,
    private readonly contractTransaction: ContractTransactionService,
  ) {}

  async getAmountsOut(
    routerContractId: string,
    amountIn: bigint,
    path: string[],
  ): Promise<bigint[]> {
    const result = await this.contractQuery.queryContractFunction({
      abiInterface: this.routerAbi,
      contractIdOrEvmAddress: routerContractId,
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    });
    return result.queryResult[0] as bigint[];
  }

  async computeAmountOutMin(
    routerContractId: string,
    amountIn: bigint,
    path: string[],
    slippagePercent: number,
  ): Promise<bigint> {
    const amounts = await this.getAmountsOut(routerContractId, amountIn, path);
    const expectedOut = amounts[amounts.length - 1];
    console.log(amounts);
    console.log(expectedOut);
    return computeMinOutput(expectedOut, slippagePercent);
  }
}
