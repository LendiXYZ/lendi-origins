import { z } from 'zod';

export const CreateIncomeEventDtoSchema = z.object({
  worker_id: z.string().min(1),
  tx_hash: z.string().min(1),
  source: z.string().min(1),
});
export type CreateIncomeEventDto = z.infer<typeof CreateIncomeEventDtoSchema>;
