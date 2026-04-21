import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ERC-8004 Agent Metadata Endpoint
 * Serves agent.json for LendiVerifier registration
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return agent metadata
  return res.status(200).json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'LendiVerifier',
    description:
      'Privacy-first income verifier for informal workers in Latin America. Prove what you earn. Reveal nothing.',
    image: 'https://lendi-origin.vercel.app/logo.png',
    services: [
      {
        name: 'A2A',
        endpoint: 'https://lendi-origins.vercel.app/agent.json',
        version: '0.3.0',
      },
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation', 'crypto-economic'],
  });
}
