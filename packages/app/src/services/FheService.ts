import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

interface EncryptedInput {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: string;
}

export interface FheEncryptResult {
  data: string;
  securityZone: number;
  utype: number;
  inputProof: string;
}

class FheService {
  private client: any = null;
  private initPromise: Promise<void> | null = null;
  private currentAddress: string | null = null;
  private adapterPublicClient: any = null;
  private adapterWalletClient: any = null;

  async initialize(walletAddress: string): Promise<void> {
    const normalized = walletAddress.toLowerCase();

    if (this.client && this.currentAddress === normalized) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      if (this.client && this.currentAddress === normalized) {
        return;
      }
    }

    this.initPromise = this.doInitialize(normalized);
    await this.initPromise;
  }

  async encryptAddress(address: string): Promise<FheEncryptResult> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');
    const encryptable = Encryptable.address(address);
    const result = await this.client.encryptInputs([encryptable]).execute();

    if (!result || result.length === 0) {
      throw new Error('Encryption failed: no result returned');
    }

    return this.formatResult(result[0] as EncryptedInput);
  }

  async encryptUint64(value: bigint): Promise<FheEncryptResult> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');
    const encryptable = Encryptable.uint64(value);
    const result = await this.client.encryptInputs([encryptable]).execute();

    if (!result || result.length === 0) {
      throw new Error('Encryption failed: no result returned');
    }

    return this.formatResult(result[0] as EncryptedInput);
  }

  async encryptBatch(
    items: Array<{ type: 'eaddress' | 'euint64'; value: string | bigint }>,
  ): Promise<FheEncryptResult[]> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');

    const encryptables = items.map((item) => {
      if (item.type === 'eaddress') {
        return Encryptable.address(String(item.value));
      }
      return Encryptable.uint64(BigInt(item.value));
    });

    const result = await this.client.encryptInputs(encryptables).execute();

    if (!result) {
      throw new Error('Batch encryption failed: no result returned');
    }

    return (result as EncryptedInput[]).map((enc) => this.formatResult(enc));
  }

  async unsealUint64(handle: bigint): Promise<number> {
    this.assertReady();
    const { FheTypes } = await import('@cofhe/sdk');
    await this.client.permits.getOrCreateSelfPermit();
    const result = await this.client.decryptForView(handle, FheTypes.Uint64).execute();
    return Number(result) / 1_000_000;
  }

  async unsealBool(handle: bigint): Promise<boolean> {
    this.assertReady();
    const { FheTypes } = await import('@cofhe/sdk');
    await this.client.permits.getOrCreateSelfPermit();
    const result = await this.client.decryptForView(handle, FheTypes.Bool).execute();
    return result as boolean;
  }

  isReady(): boolean {
    return this.client !== null;
  }

  private assertReady(): void {
    if (!this.client) {
      throw new Error('FHE service not initialized — call initialize() first');
    }
  }

  private async doInitialize(address: string): Promise<void> {
    try {
      const { createCofheConfig, createCofheClient } = await import('@cofhe/sdk/web');
      const { arbSepolia } = await import('@cofhe/sdk/chains');
      const adapters = await import('@cofhe/sdk/adapters');
      const WagmiAdapter = adapters.WagmiAdapter ?? (adapters as any).default?.WagmiAdapter;

      const rpcUrl = import.meta.env.VITE_COFHE_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

      const viemPublicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
      });

      const viemWalletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: arbitrumSepolia,
        transport: custom({
          async request({ method, params }: { method: string; params?: unknown[] }) {
            if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
              return [address];
            }
            if (method === 'personal_sign') {
              const { useWalletStore } = await import('@/stores/wallet-store');
              const hexMsg = (params?.[0] as string) ?? '';
              const bytes = hexMsg.startsWith('0x')
                ? new Uint8Array(hexMsg.slice(2).match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [])
                : new TextEncoder().encode(hexMsg);
              return useWalletStore.getState().signMessage(new TextDecoder().decode(bytes));
            }
            if (method === 'eth_signTypedData_v4') {
              const { useWalletStore } = await import('@/stores/wallet-store');
              const typedData = JSON.parse((params?.[1] as string) ?? '{}');
              return useWalletStore.getState().signTypedData(typedData);
            }
            if (method === 'eth_sendTransaction') {
              const { useWalletStore } = await import('@/stores/wallet-store');
              const tx = (params?.[0] as { to: string; data?: string; value?: string }) ?? {};
              return useWalletStore.getState().sendUserOperation([{
                to: tx.to,
                data: tx.data ?? '0x',
                value: tx.value ? BigInt(tx.value) : undefined,
              }]);
            }
            throw new Error(`Unsupported method: ${method}`);
          },
        }),
      });

      const sdkConfig = createCofheConfig({
        supportedChains: [arbSepolia],
      });

      this.client = createCofheClient(sdkConfig);

      const { publicClient, walletClient } = await WagmiAdapter(viemWalletClient, viemPublicClient);
      await this.client.connect(publicClient, walletClient);

      this.adapterPublicClient = publicClient;
      this.adapterWalletClient = walletClient;
      this.currentAddress = address;
    } catch (error: any) {
      this.client = null;
      this.initPromise = null;
      this.adapterPublicClient = null;
      this.adapterWalletClient = null;
      const message = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`FHE initialization failed: ${message}`);
    }
  }

  private formatResult(encrypted: EncryptedInput): FheEncryptResult {
    return {
      data: '0x' + encrypted.ctHash.toString(16).padStart(64, '0'),
      securityZone: encrypted.securityZone,
      utype: encrypted.utype,
      inputProof: encrypted.signature,
    };
  }
}

export const fheService = new FheService();
