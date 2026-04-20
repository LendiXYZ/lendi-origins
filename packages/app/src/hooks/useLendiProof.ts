import { useCallback, useState } from 'react'
import { type Abi, encodeFunctionData, maxUint256 } from 'viem'
import { useContractCall } from '@/hooks/use-contract-call'
import { useCofhe } from '@/hooks/useCofhe'
import { useWalletStore } from '@/stores/wallet-store'
import { publicClient } from '@/lib/viem-clients'
import { CONTRACTS } from '@/config/contracts'
import { IncomeSource } from '@/types/income'
import LENDI_PROOF_ABI from '@/abi/lendi-proof.json'

const ABI = LENDI_PROOF_ABI as Abi

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export type LenderRegistrationStep = 'idle' | 'approving' | 'registering'

export function useLendiProof() {
  const address = useWalletStore((s) => s.address)
  const { executeCall, loading: txLoading, error: txError } = useContractCall()
  const { encryptIncome, unsealIncome, initialized, initializing, error: fheError } = useCofhe()
  const [lenderRegistrationStep, setLenderRegistrationStep] = useState<LenderRegistrationStep>('idle')

  const registerWorker = useCallback(async () => {
    return executeCall(CONTRACTS.lendiProof, ABI, 'registerWorker', [])
  }, [executeCall])

  const isLenderRegistered = useCallback(
    async (addr?: string): Promise<boolean> => {
      const target = (addr ?? address) as `0x${string}`
      if (!target) return false
      const result = await publicClient.readContract({
        address: CONTRACTS.lendiProof,
        abi: ABI,
        functionName: 'registeredLenders',
        args: [target],
      })
      return result as boolean
    },
    [address],
  )

  const registerLender = useCallback(async () => {
    const wallet = useWalletStore.getState()
    const owner = wallet.address as `0x${string}` | null
    if (!owner) throw new Error('Wallet no conectada')

    const fee = (await publicClient.readContract({
      address: CONTRACTS.lendiProof,
      abi: ABI,
      functionName: 'LENDER_REGISTRATION_FEE',
    })) as bigint

    // LendiProof.registerLender pulls USDC via transferFrom(msg.sender, …).
    // Two separate UserOps (approve, then register) match ERC-4337 / bundler behavior
    // better than a single batched call when simulation or paymaster is strict.
    const allowance = (await publicClient.readContract({
      address: CONTRACTS.usdc,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, CONTRACTS.lendiProof],
    })) as bigint

    try {
      if (allowance < fee) {
        setLenderRegistrationStep('approving')
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.lendiProof, maxUint256],
        })
        await wallet.sendUserOperation([{ to: CONTRACTS.usdc, data: approveData }])
      }

      setLenderRegistrationStep('registering')
      const registerData = encodeFunctionData({ abi: ABI, functionName: 'registerLender', args: [] })
      return await wallet.sendUserOperation([{ to: CONTRACTS.lendiProof, data: registerData }])
    } finally {
      setLenderRegistrationStep('idle')
    }
  }, [])

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

  const proveIncome = useCallback(
    async (workerAddr: string, thresholdUsdc: number): Promise<{ txHash: string; handle: bigint }> => {
      if (!address) throw new Error('Wallet no conectada')
      const thresholdRaw = BigInt(Math.floor(thresholdUsdc * 1_000_000))

      // Send tx first so the handle is produced in a confirmed block,
      // which the CoFHE threshold network can verify before decryption.
      const txHash = await executeCall(CONTRACTS.lendiProof, ABI, 'proveIncome', [workerAddr, thresholdRaw])

      // Simulate after confirmation to read the deterministic ebool handle
      // (same inputs → same handle, now backed by a confirmed tx).
      const sim = await publicClient.simulateContract({
        address: CONTRACTS.lendiProof,
        abi: ABI,
        functionName: 'proveIncome',
        args: [workerAddr as `0x${string}`, thresholdRaw],
        account: address as `0x${string}`,
      })
      const handle = BigInt(sim.result as string)

      return { txHash, handle }
    },
    [address, executeCall],
  )

  return {
    registerWorker,
    isWorkerRegistered,
    registerLender,
    lenderRegistrationStep,
    isLenderRegistered,
    recordIncome,
    getMyMonthlyIncome,
    proveIncome,
    txLoading,
    txError,
    fheInitialized: initialized,
    fheInitializing: initializing,
    fheError,
  }
}
