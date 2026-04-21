import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createHandler, sendResponse, type AuthenticatedRequest } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';
import { submitVerificationFeedback } from '../../../src/infrastructure/blockchain/agent0.client.js';
import { getEnv } from '../../../src/core/config.js';

const FeedbackSchema = z.object({
  escrowId: z.string().min(1),
  eligible: z.boolean(),
  x402TxHash: z.string().min(1),
  lenderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const postHandler = createHandler({
  operationName: 'SubmitVerificationFeedback',
  schema: FeedbackSchema,
  execute: async (dto, req) => {
    const authReq = req as AuthenticatedRequest;

    // Verify authenticated user is authorized
    const authenticatedAddress = authReq.authPayload?.walletAddress?.toLowerCase();
    const lenderAddress = dto.lenderAddress.toLowerCase();

    if (authenticatedAddress !== lenderAddress) {
      return Response.forbidden('You can only submit feedback for your own address');
    }

    // Check if AGENT_ID is configured
    const env = getEnv();
    if (!env.AGENT_ID) {
      return Response.ok({
        skipped: true,
        reason: 'AGENT_ID not configured yet',
        message: 'ERC-8004 reputation is not enabled. Register agent first.',
      });
    }

    // Submit feedback to ERC-8004
    try {
      const txHash = await submitVerificationFeedback({
        lenderAddress: dto.lenderAddress,
        escrowId: dto.escrowId,
        eligible: dto.eligible,
        x402TxHash: dto.x402TxHash,
        x402ReceiverAddress: env.BASE_SEPOLIA_RECEIVER_ADDRESS ?? dto.lenderAddress,
      });

      return Response.ok({
        success: true,
        reputationTxHash: txHash,
        network: 'eth-sepolia',
        message: `ERC-8004 reputation updated. View at https://8004scan.io/agents/${env.AGENT_ID}`,
        agentId: env.AGENT_ID,
      });
    } catch (error: any) {
      console.error('[Feedback] Submission failed:', error.message);
      return Response.internalServerError('Feedback submission failed', error.message);
    }
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
