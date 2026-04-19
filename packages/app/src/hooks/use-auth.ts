import { useAuthStore } from '@/stores/auth-store';
import { useWalletStore } from '@/stores/wallet-store';
import { AuthService } from '@/services/AuthService';

function buildSiweMessage(domain: string, address: string, statement: string, uri: string, nonce: string): string {
  const now = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${import.meta.env.VITE_CHAIN_ID || '421614'}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now}`,
  ].join('\n');
}

/**
 * Performs SIWE to obtain a JWT from the backend.
 * Triggers a WebAuthn prompt (Windows Hello PIN).
 * Call this ONLY when a JWT is actually needed for an API call,
 * NOT immediately after register/login (Windows Hello can't handle
 * two WebAuthn operations in quick succession).
 */
export async function authenticateWithSiwe(address: string) {
  console.log('[auth] SIWE — requestNonce for', address);
  const { nonce } = await AuthService.requestNonce(address);
  console.log('[auth] SIWE — nonce received');

  const domain = window.location.host;
  const origin = window.location.origin;
  const statement = 'Sign in to ReineiraOS';
  const message = buildSiweMessage(domain, address, statement, origin, nonce);

  console.log('[auth] SIWE — signing message (will prompt passkey)');
  const signature = await useWalletStore.getState().signMessage(message);
  console.log('[auth] SIWE — signed, verifying with backend...');

  const tokenResponse = await AuthService.verifyWallet(address, message, signature);
  console.log('[auth] SIWE — JWT obtained');

  useAuthStore.getState().setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
}

/**
 * Standalone version — usable outside React components (e.g. HttpClient, services).
 */
export async function ensureJwt(): Promise<void> {
  if (useAuthStore.getState().hasJwt()) return;
  const address = useWalletStore.getState().address;
  if (!address) throw new Error('Wallet no conectada');
  await authenticateWithSiwe(address);
}

export function useAuth() {
  const walletConnect = useWalletStore((s) => s.connect);
  const walletRegister = useWalletStore((s) => s.register);
  const walletDisconnect = useWalletStore((s) => s.disconnect);
  const authLogout = useAuthStore((s) => s.logout);

  async function login() {
    const address = await walletConnect('zerodev');
    useAuthStore.getState().setWallet(address, 'zerodev');
    console.log('[auth] login OK — address:', address);
  }

  async function register(username: string) {
    const address = await walletRegister(username);
    useAuthStore.getState().setWallet(address, 'zerodev');
    console.log('[auth] register OK — address:', address);
  }

  /**
   * Ensures a valid JWT exists. If not, triggers SIWE (one WebAuthn prompt).
   * Call this before making backend API calls that require authentication.
   */
  async function ensureJwtHook() {
    return ensureJwt();
  }

  async function logout() {
    try {
      if (useAuthStore.getState().hasJwt()) {
        await AuthService.logout();
      }
    } catch {
    } finally {
      authLogout();
      await walletDisconnect();
    }
  }

  return { login, register, logout, ensureJwt: ensureJwtHook };
}
