import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { z } from 'zod';
import { getEnv } from '../../../src/core/config.js';
import {
  createHandler,
  sendResponse,
  type AuthenticatedRequest,
} from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { withX402 } from '../../../src/interface/middleware/with-x402.js';
import { Response } from '../../../src/interface/response.js';

const VerifyIncomeRequestSchema = z.object({
  escrowId: z.string(),
  workerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

// Arbitrum Sepolia client for reading escrow data
const arbClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.RPC_URL),
});

const LENDI_PROOF_GATE_ABI = [
  {
    name: 'isConditionMet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * POST /api/v1/verify/income
 *
 * x402-protected endpoint - requires $0.001 USDC payment via X-PAYMENT header
 *
 * Returns income verification result (boolean only - FHE privacy preserved)
 *
 * Flow:
 * 1. Client pays $0.001 USDC on Base Sepolia
 * 2. Client includes X-PAYMENT header with tx hash
 * 3. withX402 middleware validates payment
 * 4. Endpoint queries LendiProofGate.isConditionMet()
 * 5. Returns boolean result (income amount NEVER revealed)
 */
const postHandler = createHandler({
  operationName: 'VerifyIncome',
  schema: VerifyIncomeRequestSchema,
  execute: async (dto, req) => {
    const authReq = req as AuthenticatedRequest;
    const workerAddress = dto.workerAddress.toLowerCase();

    // Verify worker is requesting verification for themselves
    const authenticatedAddress = authReq.authPayload?.walletAddress?.toLowerCase();
    if (authenticatedAddress !== workerAddress) {
      return Response.forbidden('You can only verify your own income');
    }

    try {
      const env = getEnv();

      // Query on-chain FHE threshold result
      const passesThreshold = await arbClient.readContract({
        address: env.LENDI_PROOF_GATE_ADDRESS as `0x${string}`,
        abi: LENDI_PROOF_GATE_ABI,
        functionName: 'isConditionMet',
        args: [BigInt(dto.escrowId)],
      });

      return Response.ok({
        escrowId: dto.escrowId,
        workerAddress: dto.workerAddress,
        passesThreshold,
        network: 'arbitrum-sepolia',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[VerifyIncome] On-chain query failed:', error);
      return Response.internalServerError(
        'Failed to verify income',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

// Apply middlewares: CORS → Auth → x402 → Handler
export default withCors(withAuth(withX402(handler)));
