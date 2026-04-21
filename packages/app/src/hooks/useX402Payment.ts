import { useState } from 'react'
import { parseUnits, type Hash } from 'viem'
import { baseSepolia } from 'viem/chains'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

// Base Sepolia USDC (Circle test token)
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

// USDC ERC20 ABI (transfer + approve)
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

interface X402PaymentConfig {
  receiverAddress: string
  amountUsdc: string // e.g., "0.001"
  chainId?: number
}

/**
 * Hook for x402 micropayments on Base Sepolia
 *
 * Usage:
 * ```typescript
 * const { payX402, isPaying } = useX402Payment()
 *
 * const txHash = await payX402({
 *   receiverAddress: '0x...',
 *   amountUsdc: '0.001'
 * })
 * ```
 */
export function useX402Payment() {
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })

  async function payX402(config: X402PaymentConfig): Promise<Hash> {
    if (!address) throw new Error('Wallet not connected')
    if (!walletClient) throw new Error('Wallet client not available')
    if (!publicClient) throw new Error('Public client not available')

    setIsPaying(true)
    setError(null)

    try {
      // Parse USDC amount (6 decimals)
      const amount = parseUnits(config.amountUsdc, 6)

      // Check balance
      const balance = await publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address],
      })

      if (balance < amount) {
        throw new Error(
          `Insufficient USDC balance. Required: ${config.amountUsdc} USDC, Available: ${Number(balance) / 1e6} USDC`
        )
      }

      // Send USDC transfer transaction
      const hash = await walletClient.writeContract({
        address: BASE_SEPOLIA_USDC,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [config.receiverAddress as `0x${string}`, amount],
        chain: baseSepolia,
      })

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      })

      return hash
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setIsPaying(false)
    }
  }

  return {
    payX402,
    isPaying,
    error,
  }
}
