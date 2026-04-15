# QuickNode Stream Configuration — Lendi Backend

## Paso 8: Configurar QuickNode Webhook Stream

Este documento explica cómo configurar QuickNode para monitorear eventos de LendiProof y enviarlos al backend.

---

## Prerequisites

- ✅ Backend deployed en Vercel (https://lendi-origins.vercel.app)
- ✅ Webhook handler implementado (`/api/v1/webhooks/quicknode`)
- ✅ LendiProof contract deployed en Arbitrum Sepolia
- 🔲 QuickNode account (free tier works)

---

## Step-by-Step Configuration

### 1. Create QuickNode Account

1. Go to https://www.quicknode.com/
2. Sign up for free account
3. Verify email

### 2. Create Stream

1. Go to **Streams** → **Create Stream**
2. Select **Blockchain**: `Arbitrum`
3. Select **Network**: `Sepolia Testnet`
4. Click **Continue**

### 3. Configure Stream Settings

**Stream Name:**
```
Lendi Income Events - Arbitrum Sepolia
```

**Description:**
```
Monitor LendiProof contract for income recording, proof requests, and escrow linking events
```

### 4. Add Contract Address to Monitor

**Contract Address:**
```
0x809B8FC3C0e12f8F1b280E8A823294F98760fad4
```

**Contract Name:** `LendiProof`

**Network:** Arbitrum Sepolia

### 5. Select Events to Monitor

Add these three events:

#### Event 1: IncomeRecorded
```
Event Signature: IncomeRecorded(address,uint256)
```

Event Parameters:
- `worker` (address) - Worker wallet address
- `timestamp` (uint256) - Block timestamp when income was recorded

**Purpose:** Log when a worker records income on-chain (encrypted amount stored in contract state)

---

#### Event 2: ProofRequested
```
Event Signature: ProofRequested(address,address,uint64)
```

Event Parameters:
- `lender` (address) - Lender requesting proof
- `worker` (address) - Worker being verified
- `threshold` (uint64) - Income threshold in USDC (6 decimals)

**Purpose:** Log when a lender requests income verification

---

#### Event 3: EscrowLinked
```
Event Signature: EscrowLinked(uint256,address,uint64)
```

Event Parameters:
- `escrowId` (uint256) - ReinieraOS escrow ID
- `worker` (address) - Worker linked to escrow
- `threshold` (uint64) - Threshold requirement in USDC (6 decimals)

**Purpose:** Confirm escrow was successfully linked to worker on-chain

---

### 6. Configure Webhook Destination

**Webhook URL:**
```
https://lendi-origins.vercel.app/api/v1/webhooks/quicknode
```

**HTTP Method:** `POST`

**Content Type:** `application/json`

**Authentication:** HMAC Signature (automatically handled by QuickNode)

---

### 7. Generate Webhook Secret

QuickNode will generate a webhook secret automatically.

1. Click **Generate Secret**
2. Copy the secret (you'll only see it once!)
3. Store it securely

**Add to Vercel Environment Variables:**

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add new variable:
   ```
   Key:   QUICKNODE_WEBHOOK_SECRET
   Value: <paste_secret_here>
   ```
3. Redeploy backend to apply

---

### 8. Test Webhook

QuickNode provides a test function:

1. Click **Test Webhook**
2. Select sample event: `IncomeRecorded`
3. Click **Send Test**

Expected response from backend:
```json
{
  "processed": 1,
  "escrow_events": 0,
  "lendi_proof_events": 1
}
```

Status: `200 OK`

---

### 9. Activate Stream

1. Review all settings
2. Click **Create Stream**
3. Stream will start monitoring immediately

---

## Webhook Payload Format

QuickNode sends events in this format:

```json
[
  {
    "event_type": "IncomeRecorded",
    "contract_address": "0x809B8FC3C0e12f8F1b280E8A823294F98760fad4",
    "tx_hash": "0xabc123...",
    "block_number": "12345678",
    "block_timestamp": "2024-04-14T02:30:00Z",
    "worker": "0x1234...",
    "timestamp": "1713063000"
  }
]
```

---

## Backend Webhook Handler

The backend automatically:

1. ✅ Verifies HMAC signature using `QUICKNODE_WEBHOOK_SECRET`
2. ✅ Parses events and separates by type
3. ✅ Processes LendiProof events:
   - **IncomeRecorded**: Updates worker's `updatedAt` timestamp (NO amounts stored)
   - **ProofRequested**: Marks loan as `verification_pending`
   - **EscrowLinked**: Confirms escrow-worker link on-chain
4. ✅ Returns success response

**Endpoint:** `/api/v1/webhooks/quicknode`
**File:** `packages/backend/api/v1/webhooks/quicknode.ts`
**Use Case:** `src/application/use-case/webhook/process-lendi-proof-event.use-case.ts`

---

## Monitoring & Debugging

### View Stream Logs

1. Go to QuickNode Dashboard → Streams
2. Click on "Lendi Income Events"
3. View **Activity Log**

You'll see:
- Events received
- Webhook delivery attempts
- Success/failure status
- Response codes

### Check Backend Logs

Vercel deployment logs:
```bash
vercel logs --follow
```

Search for:
- `Processing LendiProof events`
- `Processing IncomeRecorded event`
- `Processing ProofRequested event`
- `Processing EscrowLinked event`

---

## Common Issues

### Issue: Webhook returns 401 Unauthorized

**Cause:** Invalid or missing HMAC signature

**Solution:**
1. Verify `QUICKNODE_WEBHOOK_SECRET` is set in Vercel
2. Redeploy backend after adding secret
3. Regenerate secret in QuickNode if needed

---

### Issue: Events not being processed

**Cause:** Stream not monitoring correct contract address

**Solution:**
1. Verify contract address in stream: `0x809B8FC3C0e12f8F1b280E8A823294F98760fad4`
2. Check network is **Arbitrum Sepolia**
3. Verify events are being emitted on-chain (check block explorer)

---

### Issue: "Worker not found in DB"

**Cause:** Worker hasn't been created in backend database

**Solution:**
1. Worker must first register via `POST /api/v1/workers`
2. Then register on-chain via `LendiProof.registerWorker()`
3. Backend will link events to existing worker records

---

## Security Notes

### Webhook Authentication

- ✅ Backend validates HMAC signature on every request
- ✅ Checks `x-qn-signature`, `x-qn-nonce`, `x-qn-timestamp` headers
- ✅ Rejects requests with invalid signatures

### Privacy Compliance

- ✅ Backend NEVER stores income amounts from events
- ✅ Only stores: worker address, timestamp, tx hash, source
- ✅ Encrypted income remains on-chain as `euint64`

---

## Cost & Limits

**QuickNode Free Tier:**
- 5 million monthly requests
- Sufficient for testnet usage
- Upgrade to paid tier for production

**Backend Vercel:**
- Serverless function invocations counted
- QuickNode webhooks are lightweight (minimal usage)

---

## Next Steps

After QuickNode is configured:

1. ✅ Stream active and sending events
2. ✅ Backend receiving and processing events
3. → Proceed to **Paso 10**: E2E Testing

---

## Support

**QuickNode Documentation:**
https://www.quicknode.com/docs/streams

**Lendi Backend Webhook Handler:**
`packages/backend/api/v1/webhooks/quicknode.ts`

**Event Processor:**
`packages/backend/src/application/use-case/webhook/process-lendi-proof-event.use-case.ts`
