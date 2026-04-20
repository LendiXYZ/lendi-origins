import { create } from 'zustand';
import { fheService } from '@/services/FheService';
import type { TxState } from '@/components/shared/TxStatus';

interface FheState {
  initialized: boolean;
  initializing: boolean;
  error: string | null;

  encryptionStep: TxState;
  lastEncryptedHandle: string | null;
  encryptionError: string | null;

  initialize: (walletAddress: string) => Promise<void>;
  setEncryptionStep: (step: TxState) => void;
  setLastHandle: (handle: string) => void;
  resetEncryption: () => void;
}

export const useFheStore = create<FheState>((set, get) => ({
  initialized: false,
  initializing: false,
  error: null,

  encryptionStep: 'idle',
  lastEncryptedHandle: null,
  encryptionError: null,

  initialize: async (walletAddress) => {
    if (get().initialized || get().initializing) return;

    set({ initializing: true, error: null });

    try {
      await fheService.initialize(walletAddress);
      set({ initialized: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'FHE initialization failed';
      set({ error: message });
    } finally {
      set({ initializing: false });
    }
  },

  setEncryptionStep: (step) => {
    set({
      encryptionStep: step,
      encryptionError: step === 'error' ? get().encryptionError : null,
    });
  },

  setLastHandle: (handle) => {
    set({ lastEncryptedHandle: handle });
  },

  resetEncryption: () => {
    set({
      encryptionStep: 'idle',
      lastEncryptedHandle: null,
      encryptionError: null,
    });
  },
}));
