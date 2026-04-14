import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Try to import and initialize the config
    const { getEnv } = await import('../dist/core/config.js');
    const env = getEnv();

    return res.status(200).json({
      status: 'success',
      message: 'Environment loaded successfully',
      config: {
        DB_PROVIDER: env.DB_PROVIDER,
        JWT_ISSUER: env.JWT_ISSUER,
        ACCESS_TOKEN_TTL: env.ACCESS_TOKEN_TTL,
        REFRESH_TOKEN_TTL: env.REFRESH_TOKEN_TTL,
        CHAIN_ID: env.CHAIN_ID,
        LOG_LEVEL: env.LOG_LEVEL,
        hasJwtSecret: !!env.JWT_SECRET,
        hasRpcUrl: !!env.RPC_URL,
        hasSignerPrivateKey: !!env.SIGNER_PRIVATE_KEY,
        FHE_WORKER_URL: env.FHE_WORKER_URL,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      issues: error.issues || [],
      stack: error.stack,
    });
  }
}
