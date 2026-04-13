import { z } from 'zod';

export const CreateWorkerDtoSchema = z.object({
  wallet_address: z.string().min(1),
});
export type CreateWorkerDto = z.infer<typeof CreateWorkerDtoSchema>;
