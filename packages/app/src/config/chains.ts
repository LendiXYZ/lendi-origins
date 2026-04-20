import { arbitrumSepolia } from 'viem/chains'

export const CHAIN = arbitrumSepolia

export const RPC_URL =
  (import.meta.env.VITE_COFHE_RPC_URL as string | undefined) ??
  'https://sepolia-rollup.arbitrum.io/rpc'
