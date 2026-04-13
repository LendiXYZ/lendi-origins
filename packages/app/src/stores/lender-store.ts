import { create } from 'zustand';
import { LenderService, type LenderResponse } from '@/services/LenderService';

interface LenderState {
  lenders: LenderResponse[];
  loading: boolean;
  fetchLenders: () => Promise<void>;
  createLender: (walletAddress: string) => Promise<LenderResponse>;
}

export const useLenderStore = create<LenderState>((set, get) => ({
  lenders: [],
  loading: false,

  fetchLenders: async () => {
    if (get().lenders.length === 0) set({ loading: true });
    try {
      const lenders = await LenderService.list();
      set({ lenders });
    } finally {
      set({ loading: false });
    }
  },

  createLender: async (walletAddress) => {
    const lender = await LenderService.create(walletAddress);
    set({ lenders: [lender, ...get().lenders] });
    return lender;
  },
}));
