import type { IWalletProvider, Call } from '../wallet-provider.interface';
import { toWebAuthnKey, WebAuthnMode, type WebAuthnKey } from '@zerodev/webauthn-key';
import { toPasskeyValidator, PasskeyValidatorContractVersion } from '@zerodev/passkey-validator';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, constants } from '@zerodev/sdk';
import type { KernelAccountClient } from '@zerodev/sdk';
import { createPublicClient, http, encodeAbiParameters, type Hex } from 'viem';
import { signMessage as viemSignMessage } from 'viem/actions';
import { arbitrumSepolia } from 'viem/chains';
import { entryPoint07Address } from 'viem/account-abstraction';
import { WindowHelper } from '@/helpers/WindowHelper';

const ENTRY_POINT = { address: entryPoint07Address, version: '0.7' as const };
const KERNEL_VERSION = constants.KERNEL_V3_1;



/**
 * Force the platform authenticator (e.g. Windows Hello) for WebAuthn ceremonies.
 *
 * The on-chain V0_0_3 WebAuthnValidator hardcodes `requireUserVerification = true`
 * and checks the UV flag (bit 2) in the authenticator data. Synced/roaming passkeys
 * (Google Password Manager, iCloud Keychain) may return UV=0 even when the browser
 * requests `userVerification: "required"`, which causes AA24 on-chain.
 *
 * Platform authenticators (Windows Hello, Touch ID) always set UV=1 because they
 * inherently require biometric or PIN verification.
 *
 * This helper temporarily patches `navigator.credentials.create` and
 * `navigator.credentials.get` to enforce `authenticatorAttachment: "platform"`
 * and runs the provided callback within that scope.
 */
async function withPlatformAuthenticator<T>(fn: () => Promise<T>): Promise<T> {
  const origCreate = navigator.credentials.create.bind(navigator.credentials);
  const origGet = navigator.credentials.get.bind(navigator.credentials);

  navigator.credentials.create = async function (opts?: CredentialCreationOptions) {
    if (opts?.publicKey) {
      opts.publicKey.authenticatorSelection = {
        ...opts.publicKey.authenticatorSelection,
        authenticatorAttachment: 'platform',
      };
    }
    return origCreate(opts);
  } as typeof navigator.credentials.create;

  navigator.credentials.get = async function (opts?: CredentialRequestOptions) {
    if (opts?.publicKey) {
      (opts.publicKey as any).authenticatorAttachment = 'platform';
    }
    return origGet(opts);
  } as typeof navigator.credentials.get;

  try {
    return await fn();
  } finally {
    navigator.credentials.create = origCreate;
    navigator.credentials.get = origGet;
  }
}

function getChain() {
  return arbitrumSepolia;
}

function buildPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(import.meta.env.VITE_ZERODEV_BUNDLER_URL),
  });
}

async function buildKernelClient(webAuthnKey: WebAuthnKey): Promise<KernelAccountClient> {
  const publicClient = buildPublicClient();
  const chain = getChain();

  console.log('[ZeroDev] toPasskeyValidator...');
  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  const _origSignUserOp = passkeyValidator.signUserOperation.bind(passkeyValidator);
  passkeyValidator.signUserOperation = async (userOp) => {
    const sig = await _origSignUserOp(userOp);
    return sig;
  };

  console.log('[ZeroDev] toPasskeyValidator OK (V0_0_3)');

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });
  console.log('[ZeroDev] account:', account.address);

  const zerodevRpcUrl = import.meta.env.VITE_ZERODEV_BUNDLER_URL;

  const paymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(zerodevRpcUrl),
  });

  return createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(zerodevRpcUrl),
    paymaster,
  });
}

export class ZeroDevProvider implements IWalletProvider {
  private kernelClient: KernelAccountClient | null = null;
  private webAuthnKeyRef: WebAuthnKey | null = null;
  private _address: string | null = null;

  async connect(): Promise<string> {
    return this.login();
  }

  async register(username: string): Promise<string> {
    await WindowHelper.ensureFocus();
    console.log('[ZeroDev] register() — username:', username);

    // ── Probe the passkey server and validate rp.id vs current origin ──────
    const passkeyServerUrl = import.meta.env.VITE_ZERODEV_PASSKEY_SERVER_URL;
    try {
      const url = `${passkeyServerUrl}/register/options`;
      console.log('[ZeroDev] probing', url);
      const probe = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const probeJson = await probe.json();
      console.log('[ZeroDev] /register/options status:', probe.status, 'body:', JSON.stringify(probeJson));

      const rpId = probeJson?.options?.rp?.id as string | undefined;
      const hostname = window.location.hostname;
      if (rpId && hostname !== rpId && !hostname.endsWith(`.${rpId}`)) {
        console.error(`[ZeroDev] rp.id mismatch: server expects "${rpId}" but current hostname is "${hostname}"`);
        throw new Error(
          `No puedes registrar passkeys desde "${hostname}". ` +
          `El proyecto ZeroDev está configurado para "${rpId}". ` +
          `Abre la app en https://${rpId} o configura el proyecto ZeroDev para tu dominio actual.`
        );
      }
    } catch (probeErr) {
      if (probeErr instanceof Error && probeErr.message.includes('No puedes registrar')) throw probeErr;
      console.error('[ZeroDev] /register/options fetch failed:', probeErr);
    }
    // ───────────────────────────────────────────────────────────────────────

    let webAuthnKey: WebAuthnKey;
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WebAuthn timeout — cerrá el diálogo de Windows y probá de nuevo')), 90_000)
      );
      webAuthnKey = await Promise.race([
        withPlatformAuthenticator(() =>
          toWebAuthnKey({
            passkeyName: username,
            passkeyServerUrl: passkeyServerUrl,
            mode: WebAuthnMode.Register,
            passkeyServerHeaders: {},
          }),
        ),
        timeout,
      ]);
      console.log('[ZeroDev] register toWebAuthnKey OK');
    } catch (e) {
      const name = (e as Error)?.name
      const msg  = (e as Error)?.message ?? ''
      const serialized = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)) } catch { return String(e) } })()
      console.error('[ZeroDev] register toWebAuthnKey FAILED — name:', name, '— message:', msg, '— full:', serialized)

      if (name === 'InvalidStateError' || (e as {code?:string})?.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
        throw new Error('Ya existe una passkey guardada para este usuario. Ve a Configuración → Cuentas → Claves de acceso y elimina la de lendi-origin.vercel.app, luego intenta de nuevo.')
      }
      if (name === 'SecurityError') {
        throw new Error(
          `Error de seguridad WebAuthn: el dominio actual (${window.location.hostname}) no coincide con el rp.id del servidor de passkeys. Prueba desde https://lendi-origin.vercel.app`
        )
      }
      if (name === 'NotAllowedError') {
        throw new Error('La operación fue cancelada o el autenticador no respondió. Intenta de nuevo.')
      }
      throw e;
    }

    try {
      this.kernelClient = await buildKernelClient(webAuthnKey);
    } catch (e) {
      const serialized = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)) } catch { return String(e) } })()
      console.error('[ZeroDev] register buildKernelClient FAILED — name:', (e as Error)?.name, '— message:', (e as Error)?.message, '— full:', serialized)
      throw e;
    }

    this.webAuthnKeyRef = webAuthnKey;

    if (!this.kernelClient.account) {
      throw new Error('Kernel account not found');
    }

    this._address = this.kernelClient.account.address;
    console.log('[ZeroDev] register OK — address:', this._address);
    return this._address;
  }

  async login(): Promise<string> {
    await WindowHelper.ensureFocus();
    const passkeyServerUrl = import.meta.env.VITE_ZERODEV_PASSKEY_SERVER_URL;
    console.log('[ZeroDev] login() — passkeyServerUrl:', passkeyServerUrl);

    let webAuthnKey: WebAuthnKey;
    try {
      webAuthnKey = await withPlatformAuthenticator(() =>
        toWebAuthnKey({
          passkeyName: '',
          passkeyServerUrl: passkeyServerUrl,
          mode: WebAuthnMode.Login,
          passkeyServerHeaders: {},
        }),
      );
      console.log('[ZeroDev] login toWebAuthnKey OK');
    } catch (e) {
      const name = (e as Error)?.name
      const serialized = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)) } catch { return String(e) } })()
      console.error('[ZeroDev] login toWebAuthnKey FAILED — name:', name, '— message:', (e as Error)?.message, '— full:', serialized)
      if (name === 'SecurityError') {
        throw new Error(
          `Error de seguridad WebAuthn: el dominio actual (${window.location.hostname}) no coincide con el rp.id del servidor de passkeys. Prueba desde https://lendi-origin.vercel.app`
        )
      }
      if (name === 'NotAllowedError') {
        throw new Error('La operación fue cancelada o no se encontró una passkey para este sitio. ¿Ya tienes cuenta?')
      }
      throw e;
    }

    try {
      this.kernelClient = await buildKernelClient(webAuthnKey);
    } catch (e) {
      const serialized = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)) } catch { return String(e) } })()
      console.error('[ZeroDev] login buildKernelClient FAILED — name:', (e as Error)?.name, '— message:', (e as Error)?.message, '— full:', serialized)
      throw e;
    }

    this.webAuthnKeyRef = webAuthnKey;

    if (!this.kernelClient.account) {
      throw new Error('Kernel account not found');
    }

    this._address = this.kernelClient.account.address;
    console.log('[ZeroDev] login OK — address:', this._address);
    return this._address;
  }

  async disconnect(): Promise<void> {
    this.kernelClient = null;
    this.webAuthnKeyRef = null;
    this._address = null;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.kernelClient?.account) throw new Error('Not connected');
    await WindowHelper.ensureFocus();
    return withPlatformAuthenticator(() =>
      viemSignMessage(this.kernelClient!, {
        account: this.kernelClient!.account!,
        message,
      })
    );
  }

  async signTypedData(typedData: Record<string, unknown>): Promise<string> {
    if (!this.kernelClient?.account) throw new Error('Not connected');
    await WindowHelper.ensureFocus();
    return withPlatformAuthenticator(() =>
      this.kernelClient!.signTypedData({
        account: this.kernelClient!.account!,
        domain: typedData.domain as any,
        types: typedData.types as any,
        primaryType: typedData.primaryType as string,
        message: typedData.message as any,
      })
    );
  }

  getAddress(): string | null {
    return this._address;
  }

  isConnected(): boolean {
    return this._address !== null && this.kernelClient !== null;
  }

  async sendUserOperation(calls: Call[]): Promise<string> {
    if (!this.kernelClient?.account) throw new Error('Not connected');
    await WindowHelper.ensureFocus();

    const mappedCalls = calls.map((c) => ({
      to: c.to as Hex,
      data: c.data as Hex,
      value: c.value ?? 0n,
    }));

    console.log('[ZeroDev] sendUserOperation — calls:', mappedCalls.length, 'sender:', this._address);

    const callData = await this.kernelClient.account.encodeCalls(mappedCalls);

    try {
      const userOpHash = await withPlatformAuthenticator(() =>
        this.kernelClient!.sendUserOperation({ callData })
      );
      console.log('[ZeroDev] userOp sent — hash:', userOpHash);
      const receipt = await this.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
      console.log('[ZeroDev] userOp confirmed — txHash:', receipt.receipt.transactionHash);
      return receipt.receipt.transactionHash;
    } catch (e) {
      const serialized = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)) } catch { return String(e) } })()
      console.error('[ZeroDev] sendUserOperation FAILED:', serialized);
      throw e;
    }
  }
}
