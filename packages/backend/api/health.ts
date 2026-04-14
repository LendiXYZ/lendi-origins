import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasRpcUrl: !!process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      dbProvider: process.env.DB_PROVIDER,
    },
  });
}
