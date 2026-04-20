import { useCallback, useState } from 'react'
import { reiineraService } from '@/services/ReinieraService'
import { EscrowService } from '@/services/EscrowService'
import { useWalletStore } from '@/stores/wallet-store'
import { ensureJwt } from '@/hooks/use-auth'
import { usdc } from '@reineira-os/sdk'

export type LoanStep = 'idle' | 'fhe-init' | 'wrapping' | 'submitting' | 'funding' | 'done' | 'error'

export interface LoanFlowParams {
  workerAddress: string
  loanAmount: number   // USDC (human-readable)
  threshold: number    // minimum monthly income in USDC
}

export function useLoanFlow() {
  const [step, setStep] = useState<LoanStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [escrowId, setEscrowId] = useState<bigint | null>(null)

  const execute = useCallback(async ({ workerAddress, loanAmount, threshold }: LoanFlowParams) => {
    setStep('fhe-init')
    setError(null)
    setTxHash(null)
    setEscrowId(null)

    try {
      const address = useWalletStore.getState().address
      if (!address) throw new Error('Wallet no conectada')

      // 1. Initialize Reineira SDK (FHE init ~2-5s)
      await reiineraService.initialize(address)

      // 2. Create off-chain record (backend)
      await ensureJwt()
      const escrow = await EscrowService.createWithClientEncrypt({
        type: 'loan',
        amount: loanAmount,
        currency: { type: 'crypto', code: 'USDC' },
        counterparty: workerAddress,
        metadata: { worker_address: workerAddress, threshold },
      })

      // 3. Wrap USDC → cUSDC, create escrow on-chain, fund with cUSDC
      const { escrowId: id, txHash: hash } = await reiineraService.createLoanEscrow({
        lenderAddress: address,
        workerAddress,
        loanAmount: usdc(loanAmount),
        threshold: BigInt(Math.floor(threshold * 1_000_000)),
        onStep: (step) => {
          if (step === 'wrapping') setStep('wrapping')
          if (step === 'creating') setStep('submitting')
          if (step === 'funding') setStep('funding')
        },
      })

      setTxHash(hash)
      setEscrowId(id)

      // 4. Report tx + on-chain ID to backend (non-fatal)
      try {
        if (hash) {
          await EscrowService.reportTransaction(hash, escrow.public_id, id.toString())
        }
      } catch {
        console.warn('[useLoanFlow] backend reportTransaction failed — non-fatal')
      }

      setStep('done')
      return { txHash: hash, escrowId: id }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando el escrow'
      setError(msg)
      setStep('error')
      throw e
    }
  }, [])

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(null)
    setEscrowId(null)
  }, [])

  return { step, error, txHash, escrowId, execute, reset }
}
