import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    name: 'Lendi API',
    version: '0.1.0',
    status: 'operational',
    endpoints: {
      auth: '/api/v1/auth',
      workers: '/api/v1/workers',
      lenders: '/api/v1/lenders',
      escrows: '/api/v1/escrows',
      loans: '/api/v1/loans',
      withdrawals: '/api/v1/withdrawals',
      docs: '/api/v1/docs/openapi.json',
    },
  });
}
