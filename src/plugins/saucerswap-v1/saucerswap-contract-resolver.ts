import {
  type ContractQueryService,
  type ContractTransactionService,
} from '@hiero-ledger/hiero-cli';
import { Interface } from 'ethers';

import { ROUTER_ABI } from '@/plugins/saucerswap-v1/abi/router';
import { assertAmountsArray } from '@/shared/util/contract-query-result';
import { computeMaxInput, computeMinOutput } from '@/shared/util/slippage';

export class SaucerSwapV1ContractResolver {
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
    return assertAmountsArray(result.queryResult[0], 'getAmountsOut', {
      path,
      amountIn: amountIn.toString(),
    });
  }

  async computeAmountOutMin(
    routerContractId: string,
    amountIn: bigint,
    path: string[],
    slippagePercent: number,
  ): Promise<bigint> {
    const amounts = await this.getAmountsOut(routerContractId, amountIn, path);
    const expectedOut = amounts[amounts.length - 1];
    return computeMinOutput(expectedOut, slippagePercent);
  }

  async getAmountsIn(
    routerContractId: string,
    amountOut: bigint,
    path: string[],
  ): Promise<bigint[]> {
    const result = await this.contractQuery.queryContractFunction({
      abiInterface: this.routerAbi,
      contractIdOrEvmAddress: routerContractId,
      functionName: 'getAmountsIn',
      args: [amountOut, path],
    });
    return assertAmountsArray(result.queryResult[0], 'getAmountsIn', {
      path,
      amountOut: amountOut.toString(),
    });
  }

  async computeAmountInMax(
    routerContractId: string,
    amountOut: bigint,
    path: string[],
    slippagePercent: number,
  ): Promise<bigint> {
    const amounts = await this.getAmountsIn(routerContractId, amountOut, path);
    const expectedIn = amounts[0];
    return computeMaxInput(expectedIn, slippagePercent);
  }
}
