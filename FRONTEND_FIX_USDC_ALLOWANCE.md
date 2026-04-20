# Frontend Fix: USDC Allowance Required

## Problema Identificado

Las transacciones de registro de lender están fallando porque **falta el paso de approve USDC**.

### Transacciones Fallidas
- `0xdc3da2904bc90d6a6d983565c4fdb1f020d053a6d78067abcb1c5447e822ae40` (Apr-19 21:48 UTC)
- `0x16f4a999080f16eb35ab12360b4d039f3121d13c718aa07b210ac93cc379d09f` (Apr-19 23:30 UTC)

### Diagnóstico
```
Smart Account: 0xeD6fE6008D6bbCe64dCCAFBb3E03919ba684F83D

✅ ETH Balance:     0.0148 ETH (suficiente)
✅ USDC Balance:    20 USDC (suficiente)
❌ USDC Allowance:  0 USDC (PROBLEMA!)
```

**Causa:** El contrato `LendiProofGate` intenta hacer `usdc.transferFrom(user, contract, amount)`, pero el usuario nunca aprobó (`approve`) al contrato para mover sus USDC.

---

## Solución Completa

### Direcciones de Contratos

```typescript
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const LENDI_PROOF_GATE = '0x68AE6d292553C0fBa8e797c0056Efe56038227A1';
```

### Implementación en Frontend

#### Opción 1: Approve + Register en 2 Pasos (Recomendado)

```typescript
import { ethers } from 'ethers';

// ABIs mínimas necesarias
const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const GATE_ABI = [
  'function registerLender(uint256 poolAmount, uint256 interestRate)',
];

async function registerLenderWithApprove(
  signer: ethers.Signer,
  poolAmount: bigint,
  interestRate: number
) {
  const userAddress = await signer.getAddress();

  // Contratos
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const gate = new ethers.Contract(LENDI_PROOF_GATE, GATE_ABI, signer);

  // PASO 1: Verificar allowance actual
  const currentAllowance = await usdc.allowance(userAddress, LENDI_PROOF_GATE);
  console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC');

  // PASO 2: Si no hay suficiente allowance, aprobar
  if (currentAllowance < poolAmount) {
    console.log('Approving USDC...');

    // Mostrar al usuario: "Step 1: Approve USDC"
    const approveTx = await usdc.approve(LENDI_PROOF_GATE, ethers.MaxUint256);

    // Esperar confirmación
    console.log('Waiting for approval confirmation...');
    await approveTx.wait();

    console.log('✅ USDC approved!');
  } else {
    console.log('✅ Already approved');
  }

  // PASO 3: Registrar lender
  console.log('Registering lender...');

  // Mostrar al usuario: "Step 2: Register Lender"
  const registerTx = await gate.registerLender(poolAmount, interestRate);

  // Esperar confirmación
  console.log('Waiting for registration confirmation...');
  const receipt = await registerTx.wait();

  console.log('✅ Lender registered!');
  console.log('Transaction:', receipt.hash);

  return receipt;
}

// Uso:
const poolAmount = ethers.parseUnits('100', 6); // 100 USDC
const interestRate = 500; // 5% (500 basis points)

await registerLenderWithApprove(signer, poolAmount, interestRate);
```

#### Opción 2: Approve Infinito al Inicio (Más Simple)

Si prefieres que el usuario apruebe una sola vez y no tener que hacerlo cada vez:

```typescript
async function approveUSDCOnce(signer: ethers.Signer) {
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

  console.log('Approving unlimited USDC...');
  const tx = await usdc.approve(LENDI_PROOF_GATE, ethers.MaxUint256);
  await tx.wait();

  console.log('✅ USDC approved forever!');
}

// Llamar solo una vez cuando el usuario se conecta por primera vez
await approveUSDCOnce(signer);

// Después, puede registrar directamente sin approve:
await gate.registerLender(poolAmount, interestRate);
```

---

## UI/UX Recomendada

### Modal de 2 Pasos

```tsx
function RegisterLenderModal() {
  const [step, setStep] = useState<'approve' | 'register' | 'done'>('approve');
  const [txHash, setTxHash] = useState('');

  const handleRegister = async () => {
    try {
      // Step 1: Approve
      setStep('approve');
      const approveTx = await usdc.approve(LENDI_PROOF_GATE, ethers.MaxUint256);
      await approveTx.wait();

      // Step 2: Register
      setStep('register');
      const registerTx = await gate.registerLender(poolAmount, interestRate);
      const receipt = await registerTx.wait();

      setTxHash(receipt.hash);
      setStep('done');
    } catch (error) {
      console.error('Error:', error);
      // Mostrar error al usuario
    }
  };

  return (
    <div className="modal">
      <h2>Register as Lender</h2>

      <div className="steps">
        <Step
          number={1}
          title="Approve USDC"
          status={step === 'approve' ? 'loading' : 'done'}
        />
        <Step
          number={2}
          title="Register Lender"
          status={
            step === 'approve' ? 'pending' :
            step === 'register' ? 'loading' : 'done'
          }
        />
      </div>

      {step === 'done' && (
        <div className="success">
          <p>✅ Successfully registered!</p>
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`}>
            View transaction
          </a>
        </div>
      )}
    </div>
  );
}
```

### Mensaje de Error Claro

Si el usuario cancela la transacción de approve:

```typescript
try {
  await usdc.approve(LENDI_PROOF_GATE, ethers.MaxUint256);
} catch (error) {
  if (error.code === 'ACTION_REJECTED') {
    // Usuario canceló
    showError('You need to approve USDC to continue');
  } else {
    showError('Failed to approve USDC: ' + error.message);
  }
}
```

---

## Verificación

Para verificar que el allowance está configurado correctamente:

```typescript
async function checkAllowance(userAddress: string) {
  const usdc = new ethers.Contract(
    USDC_ADDRESS,
    ['function allowance(address,address) view returns (uint256)'],
    provider
  );

  const allowance = await usdc.allowance(userAddress, LENDI_PROOF_GATE);
  const allowanceFormatted = ethers.formatUnits(allowance, 6);

  console.log(`Allowance: ${allowanceFormatted} USDC`);

  return allowance > 0n;
}
```

---

## Testing

### Script de Test Manual

```typescript
// test-usdc-approval.ts
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

async function testApproval() {
  console.log('Testing USDC Approval...\n');

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const gate = new ethers.Contract(LENDI_PROOF_GATE, GATE_ABI, wallet);

  const address = await wallet.getAddress();

  // 1. Check balances
  const usdcBalance = await usdc.balanceOf(address);
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');

  // 2. Check current allowance
  let allowance = await usdc.allowance(address, LENDI_PROOF_GATE);
  console.log('Current Allowance:', ethers.formatUnits(allowance, 6), 'USDC\n');

  // 3. Approve
  if (allowance === 0n) {
    console.log('Approving USDC...');
    const tx = await usdc.approve(LENDI_PROOF_GATE, ethers.MaxUint256);
    console.log('Approval tx:', tx.hash);

    await tx.wait();
    console.log('✅ Approved!\n');

    // Verify
    allowance = await usdc.allowance(address, LENDI_PROOF_GATE);
    console.log('New Allowance:', ethers.formatUnits(allowance, 6), 'USDC\n');
  }

  // 4. Register lender
  console.log('Registering lender...');
  const poolAmount = ethers.parseUnits('10', 6); // 10 USDC
  const interestRate = 500; // 5%

  const tx = await gate.registerLender(poolAmount, interestRate);
  console.log('Register tx:', tx.hash);

  const receipt = await tx.wait();
  console.log('✅ Lender registered!');
  console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
}

testApproval()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
```

Ejecutar:
```bash
npx tsx test-usdc-approval.ts
```

---

## Debugging

Si las transacciones siguen fallando después de implementar approve:

```bash
# Verificar allowance actual
npx tsx debug-aa-transaction.ts

# Debería mostrar:
# ✅ USDC allowance: >0 USDC
```

---

## Resumen

**Problema:** Falta approve de USDC
**Solución:** Agregar paso de `usdc.approve()` antes de `gate.registerLender()`
**Contratos:** NO necesitan cambios
**Frontend:** Agregar 2 pasos (approve → register)

**IMPORTANTE:** Este es el flujo estándar de ERC20 y es por seguridad. Todos los proyectos DeFi (Uniswap, Aave, etc.) funcionan igual.
