import { create } from 'zustand';
import { LoanService, type LoanResponse } from '@/services/LoanService';

interface LoanState {
  loans: LoanResponse[];
  loading: boolean;
  fetchLoans: () => Promise<void>;
  createLoan: (workerId: string, lenderId: string) => Promise<LoanResponse>;
}

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: [],
  loading: false,

  fetchLoans: async () => {
    if (get().loans.length === 0) set({ loading: true });
    try {
      const loans = await LoanService.list();
      set({ loans });
    } finally {
      set({ loading: false });
    }
  },

  createLoan: async (workerId, lenderId) => {
    const loan = await LoanService.create(workerId, lenderId);
    set({ loans: [loan, ...get().loans] });
    return loan;
  },
}));
