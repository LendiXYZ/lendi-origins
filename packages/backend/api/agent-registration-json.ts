import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnv } from '../src/core/config.js';

/**
 * ERC-8004 Agent Registration Endpoint
 * Returns the agent registration with AGENT_ID from env vars
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let agentId = 'AGENT_ID_PLACEHOLDER';

  try {
    const env = getEnv();
    if (env.AGENT_ID) {
      agentId = env.AGENT_ID;
    }
  } catch {
    // Fallback to placeholder if env not configured
  }

  // Return agent registration
  return res.status(200).json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'LendiVerifier',
    registrations: [
      {
        agentId,
        agentRegistry: 'eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e',
      },
    ],
  });
}
