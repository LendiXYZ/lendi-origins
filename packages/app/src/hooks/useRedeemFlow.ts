import { useCallback, useState } from 'react'
import { encodeFunctionData } from 'viem'
import { reiineraService } from '@/services/ReinieraService'
import { fheService } from '@/services/FheService'
import { useWalletStore } from '@/stores/wallet-store'
import { publicClient } from '@/lib/viem-clients'
import { CONTRACTS } from '@/config/contracts'

export type RedeemStep = 'idle' | 'checking' | 'requesting' | 'publishing' | 'redeeming' | 'done' | 'error'

export type ConditionStatus =
  | 'unknown'
  | 'pending_request'   // requestVerification not called yet
  | 'pending_publish'   // requestVerification done, awaiting off-chain publish
  | 'met'
  | 'not_met'

const PROOF_GATE_ABI = [
  {
    name: 'isConditionMet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'requestVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'publishVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'result', type: 'bool' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getEncryptedHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  { name: 'EscrowNotLinked',         type: 'error', inputs: [{ name: 'escrowId', type: 'uint256' }] },
  { name: 'NoVerificationRequested', type: 'error', inputs: [{ name: 'escrowId', type: 'uint256' }] },
  { name: 'VerificationNotReady',    type: 'error', inputs: [{ name: 'escrowId', type: 'uint256' }] },
] as const

const ESCROW_ABI = [
  {
    name: 'redeemAndUnwrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
] as const

export function useRedeemFlow() {
  const [step, setStep] = useState<RedeemStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>('unknown')

  const checkCondition = useCallback(async (escrowId: bigint): Promise<ConditionStatus> => {
    console.log(`[RedeemFlow] checkCondition — escrowId=${escrowId} gate=${CONTRACTS.lendiProofGate}`)
    setStep('checking')
    setError(null)
    try {
      const met = await publicClient.readContract({
        address: CONTRACTS.lendiProofGate,
        abi: PROOF_GATE_ABI,
        functionName: 'isConditionMet',
        args: [escrowId],
      }) as boolean
      const status: ConditionStatus = met ? 'met' : 'not_met'
      console.log(`[RedeemFlow] checkCondition OK — met=${met} → status=${status}`)
      setConditionStatus(status)
      setStep('idle')
      return status
    } catch (e: any) {
      // viem wraps: ContractFunctionExecutionError → cause: ContractFunctionRevertedError
      const revertError = e?.cause ?? e
      const errorName: string =
        revertError?.data?.errorName ??   // decoded custom error name
        revertError?.name ??
        ''
      const rawMsg: string = e?.message ?? e?.toString() ?? ''

      console.warn(`[RedeemFlow] checkCondition REVERT — errorName="${errorName}" msg="${rawMsg}"`)

      let status: ConditionStatus
      if (
        errorName === 'EscrowNotLinked' ||
        errorName === 'NoVerificationRequested' ||
        rawMsg.includes('EscrowNotLinked') ||
        rawMsg.includes('NoVerificationRequested')
      ) {
        status = 'pending_request'
      } else if (
        errorName === 'VerificationNotReady' ||
        rawMsg.includes('VerificationNotReady')
      ) {
        status = 'pending_publish'
      } else {
        setError(rawMsg)
        status = 'unknown'
      }
      console.log(`[RedeemFlow] checkCondition → status=${status}`)
      setConditionStatus(status)
      setStep('idle')
      return status
    }
  }, [])

  const requestVerification = useCallback(async (escrowId: bigint): Promise<string> => {
    console.log(`[RedeemFlow] requestVerification — escrowId=${escrowId}`)
    setStep('requesting')
    setError(null)
    try {
      const data = encodeFunctionData({
        abi: PROOF_GATE_ABI,
        functionName: 'requestVerification',
        args: [escrowId],
      })
      const hash = await useWalletStore.getState().sendUserOperation([
        { to: CONTRACTS.lendiProofGate, data },
      ])
      console.log(`[RedeemFlow] requestVerification OK — txHash=${hash}`)
      setTxHash(hash)
      setConditionStatus('pending_publish')
      setStep('idle')
      return hash
    } catch (e: any) {
      const msg = e?.message ?? 'Error solicitando verificación'
      console.error(`[RedeemFlow] requestVerification FAILED — ${msg}`)
      setError(msg)
      setStep('error')
      throw e
    }
  }, [])

  const publishVerification = useCallback(async (escrowId: bigint): Promise<void> => {
    const address = useWalletStore.getState().address
    if (!address) throw new Error('Wallet no conectada')

    console.log(`[RedeemFlow] publishVerification — escrowId=${escrowId} worker=${address}`)
    setStep('publishing')
    setError(null)
    try {
      // FHE init needed for decryptForView
      await fheService.initialize(address)

      // Get the encrypted handle stored after requestVerification
      const ctHash = await publicClient.readContract({
        address: CONTRACTS.lendiProofGate,
        abi: PROOF_GATE_ABI,
        functionName: 'getEncryptedHandle',
        args: [escrowId],
      }) as `0x${string}`

      console.log(`[RedeemFlow] getEncryptedHandle → ctHash=${ctHash}`)

      if (!ctHash || ctHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('No hay handle encriptado — llama requestVerification primero')
      }

      // Decrypt via threshold network — returns plaintext + signature for on-chain submission
      const { value: result, signature } = await fheService.decryptBoolForTx(BigInt(ctHash))
      console.log(`[RedeemFlow] decryptBoolForTx — result=${result} (${result ? 'condición CUMPLIDA ✓' : 'condición NO cumplida ✗'}) sigLen=${signature?.length}`)

      const data = encodeFunctionData({
        abi: PROOF_GATE_ABI,
        functionName: 'publishVerification',
        args: [escrowId, result, signature],
      })
      const txHash = await useWalletStore.getState().sendUserOperation([
        { to: CONTRACTS.lendiProofGate, data },
      ])
      console.log(`[RedeemFlow] publishVerification OK — txHash=${txHash} conditionMet=${result}`)

      setConditionStatus(result ? 'met' : 'not_met')
      setStep('idle')
    } catch (e: any) {
      const msg = e?.message ?? 'Error publicando verificación'
      console.error(`[RedeemFlow] publishVerification FAILED — ${msg}`, e)
      setError(msg)
      setStep('error')
      throw e
    }
  }, [])

  const redeem = useCallback(async (escrowId: bigint): Promise<string> => {
    const address = useWalletStore.getState().address
    if (!address) throw new Error('Wallet no conectada')

    console.log(`[RedeemFlow] redeem — escrowId=${escrowId} recipient=${address}`)
    console.log(`[RedeemFlow] escrow contract=${CONTRACTS.escrow} gate=${CONTRACTS.lendiProofGate}`)

    // Re-check condition right before redeem so we have a fresh log
    try {
      const stillMet = await publicClient.readContract({
        address: CONTRACTS.lendiProofGate,
        abi: PROOF_GATE_ABI,
        functionName: 'isConditionMet',
        args: [escrowId],
      }) as boolean
      console.log(`[RedeemFlow] pre-redeem isConditionMet=${stillMet}`)
      if (!stillMet) {
        console.warn('[RedeemFlow] WARNING: condition is NOT met — redeemAndUnwrap will revert')
      }
    } catch (checkErr: any) {
      console.warn(`[RedeemFlow] pre-redeem isConditionMet REVERT — ${checkErr?.message ?? checkErr}`)
    }

    setStep('redeeming')
    setError(null)
    try {
      await reiineraService.initialize(address)

      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'redeemAndUnwrap',
        args: [escrowId, address as `0x${string}`],
      })
      // redeemAndUnwrap compares stored FHE ciphertexts (FHE.eq on-chain), requiring
      // the live CoFHE coprocessor. ZeroDev's paymaster simulation doesn't have it:
      // zd_sponsorUserOperation returns callGasLimit:0 and signs over that value, so
      // gas overrides are impossible after the fact (paymaster signs over gas fields).
      // skipPaymaster routes through a no-paymaster kernel client; only the bundler
      // simulates, which uses the real Arbitrum Sepolia RPC that has CoFHE support.
      console.log(`[RedeemFlow] sending redeemAndUnwrap UserOp — callGasLimit=3M skipPaymaster=true`)
      const hash = await useWalletStore.getState().sendUserOperation(
        [{ to: CONTRACTS.escrow, data }],
        { callGasLimit: 3_000_000n, verificationGasLimit: 500_000n, preVerificationGas: 200_000n, skipPaymaster: true },
      )
      console.log(`[RedeemFlow] redeemAndUnwrap OK — txHash=${hash}`)
      setTxHash(hash)
      setStep('done')
      return hash
    } catch (e: any) {
      const msg = e?.message ?? 'Error redimiendo escrow'
      console.error(`[RedeemFlow] redeemAndUnwrap FAILED — ${msg}`, e)
      setError(msg)
      setStep('error')
      throw e
    }
  }, [])

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(null)
    setConditionStatus('unknown')
  }, [])

  return { step, error, txHash, conditionStatus, checkCondition, requestVerification, publishVerification, redeem, reset }
}
