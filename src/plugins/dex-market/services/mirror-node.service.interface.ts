export interface MirrorNodeToken {
  token_id: string;
  evm_address?: string | null;
}

export interface MirrorNodeService {
  getToken(tokenId: string, network: string): Promise<MirrorNodeToken>;
}
