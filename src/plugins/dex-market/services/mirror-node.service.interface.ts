export interface MirrorNodeToken {
  token_id: string;
  evm_address?: string | null;
}

export interface MirrorNodeService {
  getToken(tokenReference: string, network: string): Promise<MirrorNodeToken>;
}
