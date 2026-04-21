import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AdvisorRequestSchema } from '../../src/application/dto/advisor/advisor-request.dto.js';
import { createHandler, sendResponse, type AuthenticatedRequest } from '../../src/interface/handler-factory.js';
import { withAuth } from '../../src/interface/middleware/with-auth.js';
import { withCors } from '../../src/interface/middleware/with-cors.js';
import { Response } from '../../src/interface/response.js';
import { zhipuAdvisorService } from '../../src/infrastructure/ai/zhipu-advisor.service.js';
import { advisorRateLimiter } from '../../src/infrastructure/rate-limiter/simple-rate-limiter.js';

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

    // Get AI advice
    const advice = await zhipuAdvisorService.getAdvice(dto);

    return Response.ok(advice);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
