export interface Call {
  to: string;
  data: string;
  value?: bigint;
}

export interface GasOverride {
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
  // When true, bypasses ZeroDev paymaster (account pays own gas).
  // Required for CoFHE ops: paymaster simulation doesn't have the live coprocessor
  // and overwrites callGasLimit with 0 when simulation fails.
  skipPaymaster?: boolean;
}

export interface IWalletProvider {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  signTypedData(typedData: Record<string, unknown>): Promise<string>;
  getAddress(): string | null;
  isConnected(): boolean;
  sendUserOperation(calls: Call[], gasOverride?: GasOverride): Promise<string>;
}
