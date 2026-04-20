import { z } from 'zod';

/**
 * AI Advisor Request DTO
 * Receives worker data WITHOUT revealing actual income amounts
 */
export const AdvisorRequestSchema = z.object({
  workerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  incomeRecordsCount: z.number().int().min(0),
  passesThreshold: z.boolean(),
  daysActive: z.number().int().min(0),
  platform: z.string().optional(),
  question: z.string().max(500).optional(),
});

export type AdvisorRequestDto = z.infer<typeof AdvisorRequestSchema>;
