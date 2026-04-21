import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../src/interface/middleware/with-cors.js';
import { sendResponse } from '../../src/interface/handler-factory.js';
import { Response } from '../../src/interface/response.js';

/**
 * Test endpoint to verify CORS headers are working
 * This is a FRESH path to bypass potential cache on /api/v1/* paths
 */
const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'GET' || req.method === 'POST') {
    sendResponse(
      res,
      Response.ok({
        message: 'CORS test endpoint - X-PAYMENT header should be allowed',
        timestamp: new Date().toISOString(),
        requestHeaders: req.headers,
      })
    );
    return;
  }

  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(handler);
