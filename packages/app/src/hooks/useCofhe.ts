import { useCallback } from 'react';
import { fheService, type FheEncryptResult } from '@/services/FheService';
import { useFheStore } from '@/stores/fhe-store';
import { useWalletStore } from '@/stores/wallet-store';

export function useCofhe() {
  const initialized = useFheStore((s) => s.initialized);
  const initializing = useFheStore((s) => s.initializing);
  const error = useFheStore((s) => s.error);
  const storeInit = useFheStore((s) => s.initialize);
  const setStep = useFheStore((s) => s.setEncryptionStep);
  const setHandle = useFheStore((s) => s.setLastHandle);

  const initialize = useCallback(async () => {
    const address = useWalletStore.getState().address;
    if (!address) throw new Error('Wallet no conectada');
    await storeInit(address);
  }, [storeInit]);

  const encryptIncome = useCallback(
    async (amountUSDC: number): Promise<FheEncryptResult> => {
      if (!fheService.isReady()) {
        await initialize();
      }
      setStep('encrypting');
      try {
        const raw = BigInt(Math.floor(amountUSDC * 1_000_000));
        const result = await fheService.encryptUint64(raw);
        setHandle(result.data);
        setStep('done');
        return result;
      } catch (e) {
        setStep('error');
        throw e;
      }
    },
    [initialize, setStep, setHandle],
  );

  const unsealIncome = useCallback(
    async (handle: bigint): Promise<number> => {
      if (!fheService.isReady()) {
        await initialize();
      }
      return fheService.unsealUint64(handle);
    },
    [initialize],
  );

  const unsealBool = useCallback(
    async (handle: bigint): Promise<boolean> => {
      if (!fheService.isReady()) {
        await initialize();
      }
      return fheService.unsealBool(handle);
    },
    [initialize],
  );

  return {
    initialized,
    initializing,
    error,
    initialize,
    encryptIncome,
    unsealIncome,
    unsealBool,
  };
}
