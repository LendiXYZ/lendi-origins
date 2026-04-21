import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getEnv } from '../../core/config.js';
import type { VercelHandler } from '../handler-factory.js';
import { Response } from '../response.js';
import { sendResponse } from '../handler-factory.js';

// Base Sepolia USDC address (Circle's test USDC)
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const USDC_ABI = [
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * x402 middleware - validates micropayment before allowing request
 *
 * Protocol:
 * 1. Client sends X-PAYMENT header with Base Sepolia tx hash
 * 2. Middleware verifies USDC transfer to BASE_SEPOLIA_RECEIVER_ADDRESS
 * 3. If valid, proceed; if not, return 402 Payment Required
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402
 */
export function withX402(handler: VercelHandler): VercelHandler {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const paymentTxHash = req.headers['x-payment'] as string | undefined;

    if (!paymentTxHash) {
      sendResponse(
        res,
        Response.paymentRequired(
          'Micropayment required',
          'Send $0.001 USDC on Base Sepolia and include X-PAYMENT header with tx hash'
        )
      );
      return;
    }

    try {
      const env = getEnv();
      const expectedAmount = parseUnits(env.X402_PRICE_USDC || '0.001', 6); // USDC has 6 decimals
      const receiverAddress = env.BASE_SEPOLIA_RECEIVER_ADDRESS?.toLowerCase();

      if (!receiverAddress) {
        throw new Error('BASE_SEPOLIA_RECEIVER_ADDRESS not configured');
      }

      // Create Base Sepolia client
      const baseClient = createPublicClient({
        chain: baseSepolia,
        transport: http(env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'),
      });

      // Get transaction receipt
      const receipt = await baseClient.getTransactionReceipt({
        hash: paymentTxHash as `0x${string}`,
      });

      if (!receipt || receipt.status !== 'success') {
        sendResponse(
          res,
          Response.paymentRequired(
            'Invalid payment transaction',
            'Transaction not found or failed'
          )
        );
        return;
      }

      // Find USDC Transfer event
      const transferLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === BASE_SEPOLIA_USDC.toLowerCase() &&
          log.topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
      );

      if (!transferLog) {
        sendResponse(
          res,
          Response.paymentRequired('Invalid payment', 'No USDC transfer found in transaction')
        );
        return;
      }

      // Decode transfer event
      const decodedLog = baseClient.decodeEventLog({
        abi: USDC_ABI,
        data: transferLog.data,
        topics: transferLog.topics,
      });

      const { to, value } = decodedLog.args;

      // Validate recipient and amount
      if (to.toLowerCase() !== receiverAddress) {
        sendResponse(
          res,
          Response.paymentRequired(
            'Invalid payment recipient',
            `Payment must be sent to ${receiverAddress}`
          )
        );
        return;
      }

      if (value < expectedAmount) {
        sendResponse(
          res,
          Response.paymentRequired(
            'Insufficient payment',
            `Required: ${expectedAmount / BigInt(1e6)} USDC, received: ${value / BigInt(1e6)} USDC`
          )
        );
        return;
      }

      // Payment verified ✅ - proceed with request
      return handler(req, res);
    } catch (error) {
      console.error('[x402] Payment verification failed:', error);
      sendResponse(
        res,
        Response.paymentRequired(
          'Payment verification failed',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
      return;
    }
  };
}
