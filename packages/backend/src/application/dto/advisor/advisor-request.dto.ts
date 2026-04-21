import { z } from 'zod';

/**
 * AI Advisor Request DTO
 * Receives worker data WITHOUT revealing actual income amounts
 *
 * escrowId: Optional. When provided, calls LendiProofGate.isConditionMet() for real on-chain threshold check.
 * passesThreshold: DEPRECATED. Ignored if escrowId is provided. Will use on-chain FHE result instead.
 * monthlyIncomeUSDC: Optional. When provided, worker has decrypted their FHE income
 * in-browser and passed it ephemerally for personalized advice. NEVER logged or stored.
 */
export const AdvisorRequestSchema = z.object({
  workerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  incomeRecordsCount: z.number().int().min(0),
  passesThreshold: z.boolean().optional(), // DEPRECATED - use escrowId instead
  escrowId: z.string().optional(), // NEW - if provided, calls isConditionMet() on-chain
  daysActive: z.number().int().min(0),
  platform: z.string().optional(),
  question: z.string().max(500).optional(),
  monthlyIncomeUSDC: z.number().positive().optional(),
});

export type AdvisorRequestDto = z.infer<typeof AdvisorRequestSchema>;
