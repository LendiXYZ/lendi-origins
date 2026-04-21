import { SDK } from 'agent0-sdk';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getEnv } from '../../core/config.js';

let sdkInstance: SDK | null = null;

function getSDK(): SDK {
  if (!sdkInstance) {
    const env = getEnv();

    if (!env.ETH_SEPOLIA_PRIVATE_KEY) {
      throw new Error('ETH_SEPOLIA_PRIVATE_KEY not configured');
    }

    if (!env.ETH_SEPOLIA_RPC_URL) {
      throw new Error('ETH_SEPOLIA_RPC_URL not configured');
    }

    const account = privateKeyToAccount(env.ETH_SEPOLIA_PRIVATE_KEY as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(env.ETH_SEPOLIA_RPC_URL),
    });

    sdkInstance = new SDK({ walletClient, chain: 'sepolia' });
  }

  return sdkInstance;
}

export interface FeedbackParams {
  lenderAddress: string;
  escrowId: string;
  eligible: boolean;
  x402TxHash: string;
  x402ReceiverAddress: string;
}

/**
 * Submit ERC-8004 reputation feedback after income verification
 * Closes the loop: x402 payment → verification → on-chain reputation
 */
export async function submitVerificationFeedback(params: FeedbackParams): Promise<string> {
  const sdk = getSDK();
  const env = getEnv();

  if (!env.AGENT_ID) {
    throw new Error('AGENT_ID not configured');
  }

  if (!env.LENDI_VERIFIER_URL) {
    throw new Error('LENDI_VERIFIER_URL not configured');
  }

  const agentId = Number(env.AGENT_ID);

  const feedbackFile = sdk.prepareFeedbackFile({
    agentId,
    agentRegistry: `eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e`,
    clientAddress: `eip155:11155111:${params.lenderAddress}`,
    value: params.eligible ? 100 : 0,
    valueDecimals: 0,
    tag1: 'income_verification',
    tag2: 'fhe_proof',
    endpoint: `${env.LENDI_VERIFIER_URL}/api/v1/verify/income`,
    oasf: {
      skills: ['lending_income_verification'],
      domains: ['finance_and_business/financial_services/lending'],
    },
    // proofOfPayment — canonical ERC-8004 field linking x402 tx to reputation
    proofOfPayment: {
      fromAddress: params.lenderAddress,
      toAddress: params.x402ReceiverAddress,
      chainId: '84532',
      txHash: params.x402TxHash,
    },
  });

  const txHash = await sdk.giveFeedback(feedbackFile);

  console.log(`[Agent0] ERC-8004 reputation updated. TxHash: ${txHash}`);
  return txHash;
}
