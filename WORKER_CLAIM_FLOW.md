# Worker Claim Flow — /worker/loans

Documenta el flujo completo que ejecuta el frontend cuando un worker intenta reclamar USDC de un escrow. Incluye rutas relativas de todos los archivos relevantes para revisión.

---

## Resumen del flujo

El claim no es un solo botón — es un flujo de **4 pasos secuenciales** que el worker completa desde la UI. Cada paso es una transacción on-chain separada.

```
[1] Verificar condición
        ↓ si pending_request
[2] Solicitar verificación  →  LendiProofGate.requestVerification(escrowId)
        ↓ si pending_publish
[3] Publicar resultado      →  FHE decrypt + LendiProofGate.publishVerification(escrowId, result, sig)
        ↓ si met
[4] Recibir USDC            →  ConfidentialEscrow.redeemAndUnwrap(escrowId, recipient)
```

---

## Archivos involucrados

| Responsabilidad | Ruta relativa |
|---|---|
| Página de la ruta | `packages/app/src/routes/worker/loans.tsx` |
| Componente UI | `packages/app/src/components/worker/LoanClaim.tsx` |
| Lógica del claim | `packages/app/src/hooks/useRedeemFlow.ts` |
| Configuración de contratos | `packages/app/src/config/contracts.ts` |
| ABI LendiProofGate | `packages/app/src/abi/lendi-proof-gate.json` |
| SDK Reineira (escrow) | `packages/app/src/services/ReinieraService.ts` |
| Wallet / UserOps | `packages/app/src/stores/wallet-store.ts` |
| Provider ZeroDev | `packages/app/src/providers/zerodev/zerodev.provider.ts` |

---

## Contratos on-chain (Arbitrum Sepolia)

```typescript
// packages/app/src/config/contracts.ts
LendiProofGate:     0x06b0523e63FF904d622aa6d125FdEe11201Bf791
ConfidentialEscrow: 0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
USDC (Circle):      0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

---

## Paso 1 — Verificar condición

**UI:** El worker ingresa el Escrow ID y pulsa "Verificar".

**Código:** `packages/app/src/hooks/useRedeemFlow.ts` → función `checkCondition(escrowId)`

```typescript
// Lee el estado on-chain sin transacción
publicClient.readContract({
  address: CONTRACTS.lendiProofGate,      // 0x06b0523e...
  functionName: 'isConditionMet',
  args: [escrowId],
})
```

**Resultados posibles:**

| Resultado | Estado UI | Causa |
|---|---|---|
| `true` | `met` — muestra botón Redimir | Condición cumplida, listo para claim |
| `EscrowNotLinked` (revert) | `pending_request` | El escrow no fue linkado al worker vía `linkEscrow()` |
| `NoVerificationRequested` (revert) | `pending_request` | Nunca se llamó `requestVerification` |
| `VerificationNotReady` (revert) | `pending_publish` | `requestVerification` ok, falta `publishVerification` |
| `false` | `not_met` | Condición evaluada: el ingreso no supera el threshold |

---

## Paso 2 — Solicitar verificación

**UI:** Botón "Solicitar verificación de ingreso" (visible solo si `pending_request`).

**Código:** `packages/app/src/hooks/useRedeemFlow.ts` → función `requestVerification(escrowId)`

```typescript
// Transacción on-chain (UserOperation via ZeroDev)
LendiProofGate.requestVerification(escrowId)
```

**Qué hace el contrato:**
- `LendiProofGate` llama internamente a `LendiProof.proveIncome(worker, threshold)`
- `LendiProof` encripta el resultado de la comparación `monthlyIncome >= threshold` usando CoFHE
- Guarda el handle FHE encriptado (`ebool`) en el estado del contrato
- El handle es necesario para el paso 3

**Prerrequisito crítico:** El escrow debe estar linkado al worker. Esto lo hace el lender al crear el escrow — llama a `LendiProof.linkEscrow(escrowId, workerAddress, threshold)`. Si no se llamó, `requestVerification` revertirá con `EscrowNotLinked`.

---

## Paso 3 — Publicar resultado de verificación

**UI:** Botón "Publicar resultado de verificación" (visible solo si `pending_publish`).

**Código:** `packages/app/src/hooks/useRedeemFlow.ts` → función `publishVerification(escrowId)`

```typescript
// 1. Inicializa CoFHE (si no está inicializado)
await fheService.initialize(workerAddress)

// 2. Lee el handle FHE que guardó requestVerification
const ctHash = publicClient.readContract({
  functionName: 'getEncryptedHandle',
  args: [escrowId],
})

// 3. Descifra via red CoFHE — obtiene valor bool + firma del resultado
const { value: result, signature } = await fheService.decryptBoolForTx(BigInt(ctHash))

// 4. Publica on-chain
LendiProofGate.publishVerification(escrowId, result, signature)
```

**Qué hace el contrato:** Valida la firma del threshold network de CoFHE y guarda `result` como la condición evaluada. Después de esto, `isConditionMet(escrowId)` devuelve `true` o `false`.

**Nota:** Este paso tarda 10–30 segundos por las operaciones FHE (normal).

---

## Paso 4 — Redimir y recibir USDC

**UI:** Botón "Redimir y recibir USDC" (visible solo si `met`).

**Código:** `packages/app/src/hooks/useRedeemFlow.ts` → función `redeem(escrowId)`

```typescript
// Transacción on-chain (UserOperation via Pimlico bundler, sin paymaster)
ConfidentialEscrow.redeemAndUnwrap(escrowId, workerAddress)
```

**Qué hace el contrato (internamente):**
1. Verifica FHE que `msg.sender == escrow.owner` (comparación sobre ciphertexts — requiere CoFHE coprocessor)
2. Verifica FHE que `paidAmount >= escrowAmount`
3. Verifica FHE que `!isRedeemed`
4. Llama a `LendiProofGate.isConditionMet(escrowId)` — si devuelve false, revierte
5. Transfiere cUSDC al contrato mismo
6. Llama a `cUSDC.unwrap(address(this), recipient, amount)` — convierte cUSDC → USDC
7. El recipient (worker) recibe USDC plaintext

**Fallo silencioso importante:** Si el `owner` encriptado del escrow no coincide con `msg.sender`, el contrato NO revierte — transfiere 0 tokens sin error. Por eso es crítico que el lender haya creado el escrow con `owner = workerAddress`.

**Detalles de la UserOperation:**
```
callGasLimit:        3_000_000  (alto por CoFHE on-chain)
verificationGasLimit:  500_000
preVerificationGas:    200_000
skipPaymaster:        true      (usa Pimlico bundler, sin ZeroDev paymaster)
```

**Por qué skipPaymaster:** El paymaster de ZeroDev simula las txs internamente pero su entorno no tiene el CoFHE coprocessor, devuelve `callGasLimit: 0` firmado, que no puede sobreescribirse. Pimlico acepta cuentas auto-financiadas y simula contra Arbitrum Sepolia real (que sí tiene CoFHE).

---

## Prerrequisitos para que el claim funcione

### Del lado del lender (al crear el escrow)

```typescript
// packages/app/src/services/ReinieraService.ts → createLoanEscrow()

// 1. El escrow debe crearse con owner = workerAddress (NO lenderAddress)
sdk.escrow.create({
  owner: workerAddress,      // ← quien puede redimir
  resolver: CONTRACTS.lendiProofGate,
  resolverData: encodePacked(['address', 'uint64'], [workerAddress, threshold]),
})

// 2. El lender debe linkear el escrow al worker
LendiProof.linkEscrow(escrowId, workerAddress, threshold)
// Nota: esto lo hace el ProofGate en onConditionSet — verificar si el contrato lo llama automáticamente
```

### Del lado del worker (cuenta smart account ZeroDev)

- Tener ETH en Arbitrum Sepolia para pagar el gas del paso 4 (≈ 0.001 ETH)
- Haber registrado ingreso previamente (`LendiProof.recordIncome`) para que `proveIncome` tenga datos

### Del lado del escrow

- Estar completamente fondeado (`paidAmount >= escrowAmount`)
- `owner` encriptado = dirección del worker

---

## Errores conocidos y sus causas

| Error | Causa | Solución |
|---|---|---|
| `EscrowNotLinked` | El lender no linkó el escrow al worker | El lender debe llamar `linkEscrow` o el ProofGate debe hacerlo en `onConditionSet` |
| `NoVerificationRequested` | Nunca se llamó requestVerification | El worker debe pulsar "Solicitar verificación" |
| `VerificationNotReady` | requestVerification ok, falta publish | El worker debe pulsar "Publicar resultado" |
| `success: False` (UserOp) | Condición no cumplida o owner incorrecto en escrow | Verificar que owner=workerAddress y condición publicada |
| `callGasLimit: 0` | ZeroDev paymaster simulation falla para CoFHE | Resuelto: usamos Pimlico con skipPaymaster |
| `AA21 didn't pay prefund` | Bundler requiere paymaster o cuenta sin ETH | Resuelto: Pimlico acepta cuentas auto-financiadas |
| Fallo silencioso (0 USDC) | owner del escrow ≠ msg.sender (worker) | Re-crear el escrow con owner=workerAddress |

---

## Pregunta para el backend

El frontend llama `LendiProof.linkEscrow(escrowId, workerAddress, threshold)` — ¿este paso lo hace automáticamente el contrato `LendiProofGate.onConditionSet()` cuando el lender crea el escrow? O ¿el lender debe llamarlo manualmente como transacción separada?

Esto es clave porque si `linkEscrow` no se llama, `requestVerification` siempre revertirá con `EscrowNotLinked` y el worker no puede completar el claim.
