import { createPublicClient, http } from 'viem'
import { CHAIN, RPC_URL } from '@/config/chains'

/**
 * Read-only client for on-chain view calls and event logs.
 * Write operations (transactions) go through ZeroDev via useWalletStore.sendUserOperation.
 */
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
})
