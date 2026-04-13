import { z } from 'zod';
import { isAddress, getAddress } from 'viem';

// Custom Zod refinement for Ethereum addresses using viem
const ethereumAddress = () =>
  z.string().refine(
    (val): val is string => {
      if (!isAddress(val)) return false;
      // Validate checksum if mixed case (EIP-55)
      if (val !== val.toLowerCase() && val !== val.toUpperCase()) {
        try {
          return getAddress(val) === val;
        } catch {
          return false;
        }
      }
      return true;
    },
    { message: 'Invalid Ethereum address' },
  );

export const CreateLoanDtoSchema = z.object({
  worker_id: z.string().min(1),
  lender_id: z.string().min(1),
  loan_amount_usdc: z.number().positive(),
  beneficiary: ethereumAddress(),
  worker_address: ethereumAddress(),
  threshold_usdc: z.number().positive(),
});
export type CreateLoanDto = z.infer<typeof CreateLoanDtoSchema>;
