import { z } from 'zod';

export const CreateLoanDtoSchema = z.object({
  worker_id: z.string().min(1),
  lender_id: z.string().min(1),
});
export type CreateLoanDto = z.infer<typeof CreateLoanDtoSchema>;
