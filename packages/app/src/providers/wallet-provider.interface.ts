export interface Call {
  to: string;
  data: string;
  value?: bigint;
}

export interface IWalletProvider {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  signTypedData(typedData: Record<string, unknown>): Promise<string>;
  getAddress(): string | null;
  isConnected(): boolean;
  sendUserOperation(calls: Call[]): Promise<string>;
}
