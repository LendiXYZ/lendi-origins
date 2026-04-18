import { z } from 'zod';
import { IncomeSource } from '../../../domain/income-event/model/income-event.js';

export const CreateIncomeEventDtoSchema = z.object({
  worker_id: z.string().min(1),
  tx_hash: z.string().min(1),
  source: z.nativeEnum(IncomeSource),
});
export type CreateIncomeEventDto = z.infer<typeof CreateIncomeEventDtoSchema>;
