export const CHAIN_ID = 421614

export const EXPLORER_URL = 'https://sepolia.arbiscan.io'

export const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`

export const USDC_DECIMALS = 6

// CoFHE async UX — FHE operations take 10–30 seconds on Arbitrum Sepolia
export const COFHE_EXPECTED_MS = 30_000

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://lendi-backend.vercel.app/api'
