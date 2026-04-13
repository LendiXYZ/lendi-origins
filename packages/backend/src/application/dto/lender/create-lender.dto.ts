import { z } from 'zod';

export const CreateLenderDtoSchema = z.object({
  wallet_address: z.string().min(1),
});
export type CreateLenderDto = z.infer<typeof CreateLenderDtoSchema>;
