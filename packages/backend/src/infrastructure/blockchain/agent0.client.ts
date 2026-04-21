import { SDK } from 'agent0-sdk';
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

    sdkInstance = new SDK({
      chainId: 11155111, // Ethereum Sepolia
      rpcUrl: env.ETH_SEPOLIA_RPC_URL,
      privateKey: env.ETH_SEPOLIA_PRIVATE_KEY,
    });
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

  // Agent ID format: "chainId:agentId"
  const agentIdString = `11155111:${env.AGENT_ID}`;

  // Prepare optional off-chain feedback file with rich metadata
  const feedbackFile = sdk.prepareFeedbackFile({
    text: params.eligible ? 'Income verification passed' : 'Income verification failed',
    // proofOfPayment — canonical ERC-8004 field linking x402 tx to reputation
    proofOfPayment: {
      fromAddress: params.lenderAddress,
      toAddress: params.x402ReceiverAddress,
      chainId: '84532', // Base Sepolia
      txHash: params.x402TxHash,
    },
  });

  // Give feedback (on-chain + off-chain metadata)
  const tx = await sdk.giveFeedback(
    agentIdString,
    params.eligible ? 100 : 0, // value
    'income_verification', // tag1
    'fhe_proof', // tag2
    `${env.LENDI_VERIFIER_URL}/api/v1/verify/income`, // endpoint
    feedbackFile // off-chain file with proofOfPayment
  );

  // Wait for confirmation
  const { receipt } = await tx.waitConfirmed({ timeoutMs: 180000 });

  console.log(`[Agent0] ERC-8004 reputation updated. TxHash: ${receipt.transactionHash}`);
  return receipt.transactionHash;
}
