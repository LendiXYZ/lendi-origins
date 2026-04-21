import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { AdvisorRequestSchema } from '../../src/application/dto/advisor/advisor-request.dto.js';
import { createHandler, sendResponse, type AuthenticatedRequest } from '../../src/interface/handler-factory.js';
import { withAuth } from '../../src/interface/middleware/with-auth.js';
import { withCors } from '../../src/interface/middleware/with-cors.js';
import { Response } from '../../src/interface/response.js';
import { zhipuAdvisorService } from '../../src/infrastructure/ai/zhipu-advisor.service.js';
import { advisorRateLimiter } from '../../src/infrastructure/rate-limiter/simple-rate-limiter.js';
import { getEnv } from '../../src/core/config.js';

// Arbitrum Sepolia client for on-chain FHE threshold checks
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
 * Get REAL on-chain threshold result from LendiProofGate
 * Returns boolean only — income amount is NEVER revealed (FHE privacy guarantee)
 */
async function getOnChainThreshold(escrowId?: string): Promise<boolean> {
  if (!escrowId) return false; // no escrow yet → not ready

  try {
    const env = getEnv();
    const result = await arbClient.readContract({
      address: env.LENDI_PROOF_GATE_ADDRESS as `0x${string}`,
      abi: LENDI_PROOF_GATE_ABI,
      functionName: 'isConditionMet',
      args: [BigInt(escrowId)],
    });
    return result;
  } catch (error) {
    console.warn(`[Advisor] isConditionMet() failed for escrow ${escrowId}:`, error);
    return false; // graceful fallback
  }
}

const postHandler = createHandler({
  operationName: 'GetAIAdvisorAdvice',
  schema: AdvisorRequestSchema,
  execute: async (dto, req) => {
    const authReq = req as AuthenticatedRequest;
    const workerAddress = dto.workerAddress.toLowerCase();

    // Verify worker is requesting advice for themselves
    const authenticatedAddress = authReq.authPayload?.walletAddress?.toLowerCase();
    if (authenticatedAddress !== workerAddress) {
      return Response.forbidden('You can only request advice for your own address');
    }

    // Check rate limit (5 requests per hour per worker)
    const rateLimitKey = `advisor:${workerAddress}`;
    if (!advisorRateLimiter.check(rateLimitKey)) {
      const resetAt = advisorRateLimiter.getResetAt(rateLimitKey);
      const resetIn = resetAt ? Math.ceil((resetAt - Date.now()) / 1000 / 60) : 60;

      return Response.tooManyRequests(
        `Has alcanzado el límite de consultas. Intenta de nuevo en ${resetIn} minutos.`
      );
    }

    // Get REAL on-chain FHE threshold result (if escrowId provided)
    // Income amount is NEVER revealed — only boolean (FHE design)
    const passesThreshold = await getOnChainThreshold(dto.escrowId);

    // Override dto.passesThreshold with real on-chain result
    const requestWithRealThreshold = {
      ...dto,
      passesThreshold,
    };

    // Get AI advice
    const advice = await zhipuAdvisorService.getAdvice(requestWithRealThreshold);

    return Response.ok(advice);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
