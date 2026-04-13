import { create } from 'zustand';
import { WorkerService, type WorkerResponse } from '@/services/WorkerService';

interface WorkerState {
  workers: WorkerResponse[];
  loading: boolean;
  fetchWorkers: () => Promise<void>;
  createWorker: (walletAddress: string) => Promise<WorkerResponse>;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  loading: false,

  fetchWorkers: async () => {
    if (get().workers.length === 0) set({ loading: true });
    try {
      const workers = await WorkerService.list();
      set({ workers });
    } finally {
      set({ loading: false });
    }
  },

  createWorker: async (walletAddress) => {
    const worker = await WorkerService.create(walletAddress);
    set({ workers: [worker, ...get().workers] });
    return worker;
  },
}));
