import { z } from 'zod';

/**
 * AI Advisor Request DTO
 * Receives worker data WITHOUT revealing actual income amounts
 *
 * monthlyIncomeUSDC: Optional. When provided, worker has decrypted their FHE income
 * in-browser and passed it ephemerally for personalized advice. NEVER logged or stored.
 */
export const AdvisorRequestSchema = z.object({
  workerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  incomeRecordsCount: z.number().int().min(0),
  passesThreshold: z.boolean(),
  daysActive: z.number().int().min(0),
  platform: z.string().optional(),
  question: z.string().max(500).optional(),
  monthlyIncomeUSDC: z.number().positive().optional(),
});

export type AdvisorRequestDto = z.infer<typeof AdvisorRequestSchema>;
