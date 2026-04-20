import { createPublicClient, createWalletClient, http, custom, encodeFunctionData, encodePacked } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { ReineiraSDK, walletClientToSigner, publicClientToProvider } from '@reineira-os/sdk';
import { CONTRACTS } from '@/config/contracts';

type LoanEscrowStep = 'wrapping' | 'creating' | 'funding';

interface CreateLoanEscrowParams {
  lenderAddress: string;
  workerAddress: string;
  loanAmount: bigint;   // USDC base units (6 decimals)
  threshold: bigint;    // USDC base units (6 decimals)
  onStep?: (step: LoanEscrowStep) => void;
}

interface LoanEscrowResult {
  escrowId: bigint;
  txHash: string;
}

const ERC20_APPROVE_ABI = [{
  name: 'approve', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const;

const CUSDC_WRAP_ABI = [{
  name: 'wrap', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [],
}] as const;

class ReinieraService {
  private sdk: ReineiraSDK | null = null;
  private initPromise: Promise<void> | null = null;
  private currentAddress: string | null = null;

  async initialize(walletAddress: string, onFHEInit?: (s: 'starting' | 'done' | 'error') => void): Promise<void> {
    const normalized = walletAddress.toLowerCase();
    if (this.sdk && this.currentAddress === normalized) return;

    if (this.initPromise) {
      await this.initPromise;
      if (this.sdk && this.currentAddress === normalized) return;
    }

    this.initPromise = this.doInitialize(normalized, onFHEInit);
    await this.initPromise;
  }

  async createLoanEscrow({ lenderAddress, workerAddress, loanAmount, threshold, onStep }: CreateLoanEscrowParams): Promise<LoanEscrowResult> {
    if (!this.sdk) throw new Error('ReinieraService not initialized');

    // 1. Wrap USDC → cUSDC (batch: approve + wrap in one UserOp)
    onStep?.('wrapping');
    await this.wrapUsdc(loanAmount, lenderAddress);

    // 2. Create escrow — SDK handles FHE encryption internally
    onStep?.('creating');
    // tight-pack: 20 bytes (address) + 8 bytes (uint64) = 28 bytes — matches LendiProofGate.onConditionSet
    const resolverData = encodePacked(
      ['address', 'uint64'],
      [workerAddress as `0x${string}`, threshold],
    );
    const vault = await this.sdk.escrow.create({
      amount: loanAmount,
      owner: workerAddress,
      resolver: CONTRACTS.lendiProofGate,
      resolverData,
    });

    // 3. Fund escrow with cUSDC (autoApprove sets operator on cUSDC first)
    onStep?.('funding');
    await vault.fund(loanAmount, { autoApprove: true });

    return {
      escrowId: vault.id,
      txHash: vault.createTx?.hash ?? '',
    };
  }

  private async wrapUsdc(amount: bigint, toAddress: string): Promise<void> {
    const { useWalletStore } = await import('@/stores/wallet-store');
    const cUSDC = this.sdk!.addresses.confidentialUSDC as `0x${string}`;

    await useWalletStore.getState().sendUserOperation([
      {
        to: CONTRACTS.usdc,
        data: encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [cUSDC, amount],
        }),
      },
      {
        to: cUSDC,
        data: encodeFunctionData({
          abi: CUSDC_WRAP_ABI,
          functionName: 'wrap',
          args: [toAddress as `0x${string}`, amount],
        }),
      },
    ]);
  }

  isReady(): boolean {
    return this.sdk !== null;
  }

  private async doInitialize(address: string, onFHEInit?: (s: 'starting' | 'done' | 'error') => void): Promise<void> {
    try {
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
            if (method === 'eth_chainId') {
              return `0x${arbitrumSepolia.id.toString(16)}`;
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
            // Forward all read-only RPC calls to the public node
            const res = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] }),
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
          },
        }),
      });

      const signer = await walletClientToSigner({
        transport: { url: rpcUrl },
        chain: arbitrumSepolia,
        account: { address },
        request: viemWalletClient.request as (...args: unknown[]) => Promise<unknown>,
      });
      const provider = publicClientToProvider(viemPublicClient);

      this.sdk = ReineiraSDK.create({
        network: 'testnet',
        signer,
        provider,
        onFHEInit,
      });

      await this.sdk.initialize();
      this.currentAddress = address;
    } catch (error: any) {
      this.sdk = null;
      this.initPromise = null;
      throw new Error(`ReinieraService init failed: ${error?.message ?? error}`);
    }
  }
}

export const reiineraService = new ReinieraService();
