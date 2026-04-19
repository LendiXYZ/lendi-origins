import { useCallback } from 'react'
import type { Abi } from 'viem'
import { useContractCall } from '@/hooks/use-contract-call'
import { useCofhe } from '@/hooks/useCofhe'
import { useWalletStore } from '@/stores/wallet-store'
import { publicClient } from '@/lib/viem-clients'
import { CONTRACTS } from '@/config/contracts'
import { IncomeSource } from '@/types/income'
import LENDI_PROOF_ABI from '@/abi/lendi-proof.json'

const ABI = LENDI_PROOF_ABI as Abi

export function useLendiProof() {
  const address = useWalletStore((s) => s.address)
  const { executeCall, loading: txLoading, error: txError } = useContractCall()
  const { encryptIncome, unsealIncome, initialized, initializing, error: fheError } = useCofhe()

  const registerWorker = useCallback(async () => {
    return executeCall(CONTRACTS.lendiProof, ABI, 'registerWorker', [])
  }, [executeCall])

  const isWorkerRegistered = useCallback(
    async (addr?: string): Promise<boolean> => {
      const target = (addr ?? address) as `0x${string}`
      if (!target) return false
      const result = await publicClient.readContract({
        address: CONTRACTS.lendiProof,
        abi: ABI,
        functionName: 'registeredWorkers',
        args: [target],
      })
      return result as boolean
    },
    [address],
  )

  const recordIncome = useCallback(
    async (amountUsdc: number, source: IncomeSource = IncomeSource.MANUAL) => {
      const encrypted = await encryptIncome(amountUsdc)
      const encArgs = {
        ctHash:       BigInt(encrypted.data),
        securityZone: encrypted.securityZone,
        utype:        encrypted.utype,
        signature:    encrypted.inputProof as `0x${string}`,
      }
      return executeCall(CONTRACTS.lendiProof, ABI, 'recordIncome', [encArgs, source])
    },
    [encryptIncome, executeCall],
  )

  const getMyMonthlyIncome = useCallback(async (): Promise<number> => {
    if (!address) throw new Error('Wallet no conectada')
    const handle = await publicClient.readContract({
      address: CONTRACTS.lendiProof,
      abi: ABI,
      functionName: 'getMyMonthlyIncome',
      account: address as `0x${string}`,
    }) as bigint
    return unsealIncome(handle)
  }, [address, unsealIncome])

  return {
    registerWorker,
    isWorkerRegistered,
    recordIncome,
    getMyMonthlyIncome,
    txLoading,
    txError,
    fheInitialized: initialized,
    fheInitializing: initializing,
    fheError,
  }
}
