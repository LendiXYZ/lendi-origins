import { z } from 'zod';

/**
 * AI Advisor Response DTO
 * Returns personalized advice in Spanish without revealing income
 */
export const AdvisorResponseSchema = z.object({
  status: z.enum(['ready', 'almost', 'not_ready']),
  message: z.string(),
  nextStep: z.string(),
  creditScore: z.number().int().min(1).max(100),
  encouragement: z.string(),
});

export type AdvisorResponseDto = z.infer<typeof AdvisorResponseSchema>;
