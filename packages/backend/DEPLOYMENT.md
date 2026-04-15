# Deployment Guide — Lendi Backend Wave 2

## Production Deployment Checklist

Complete deployment guide from local development to production on Vercel.

---

## Pre-Deployment Checklist

### ✅ Code Requirements
- [ ] All blockchain clients implemented
- [ ] Use cases updated with Wave 2 flow
- [ ] API routes tested locally
- [ ] Webhook handlers implemented
- [ ] Database schema validates privacy rules (no amounts)
- [ ] Environment variables documented

### ✅ On-Chain Requirements
- [ ] LendiProof contract deployed
- [ ] LendiProofGate contract deployed
- [ ] LendiPolicy contract deployed
- [ ] Contract addresses added to `.env`
- [ ] Test transactions verified on block explorer

### ✅ External Services
- [ ] QuickNode account created
- [ ] Neon Postgres database provisioned (or use memory storage)
- [ ] ReinieraOS SDK access configured

---

## Step-by-Step Deployment

### 1. Prepare Environment Variables

Create `.env.production` with all required variables:

```bash
# Auth
JWT_SECRET=<64-char-random-string>
JWT_ISSUER=lendi-api
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000

# Database (optional - defaults to memory)
DB_PROVIDER=postgres
DATABASE_URL=postgresql://...

# Blockchain
CHAIN_ID=421614
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
SIGNER_PRIVATE_KEY=0x...

# Lendi Contracts
LENDI_PROOF_ADDRESS=0x809B8FC3C0e12f8F1b280E8A823294F98760fad4
LENDI_PROOF_GATE_ADDRESS=0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc
LENDI_POLICY_ADDRESS=0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# ReinieraOS Contracts
ESCROW_CONTRACT_ADDRESS=0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
COVERAGE_MANAGER_ADDRESS=0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6
POOL_FACTORY_ADDRESS=0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
POLICY_REGISTRY_ADDRESS=0xf421363B642315BD3555dE2d9BD566b7f9213c8E
CONFIDENTIAL_USDC_ADDRESS=0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f

# Webhooks (add after QuickNode setup)
QUICKNODE_WEBHOOK_SECRET=<from-quicknode-dashboard>

# Server
ALLOWED_ORIGINS=https://lendi-app.vercel.app,https://lendi.xyz
LOG_LEVEL=info
```

Generate JWT secret:
```bash
openssl rand -base64 64
```

---

### 2. Local Testing

Before deploying, test locally:

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
pnpm dev
```

Test endpoints:
```bash
# Health check
curl http://localhost:3000/api/health

# Run automated tests
WORKER_ADDRESS=0x... LENDER_ADDRESS=0x... ./scripts/test-e2e.sh
```

See `LOCAL_TESTING.md` for detailed local testing guide.

---

### 3. Deploy to Vercel

#### Option A: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time)
cd packages/backend
vercel

# Deploy to production
vercel --prod
```

#### Option B: GitHub Integration

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure build settings:

**Build & Development Settings:**
```json
{
  "framework": null,
  "installCommand": "npm install -g pnpm@10.30.3 && cd ../.. && npx pnpm@10.30.3 install --frozen-lockfile",
  "buildCommand": "cd ../.. && npx pnpm@10.30.3 --filter @lendi/backend run build",
  "outputDirectory": "dist"
}
```

**Root Directory:**
```
packages/backend
```

4. Add environment variables in Vercel dashboard
5. Deploy

---

### 4. Configure Environment Variables in Vercel

Go to Project Settings → Environment Variables

Add each variable from `.env.production`:

| Variable | Value | Environment |
|----------|-------|-------------|
| JWT_SECRET | `<secret>` | Production, Preview, Development |
| SIGNER_PRIVATE_KEY | `0x...` | Production, Preview |
| LENDI_PROOF_ADDRESS | `0x809B...` | All |
| ... | ... | ... |

**Security Notes:**
- ✅ Never commit `.env.production` to git
- ✅ Use different `SIGNER_PRIVATE_KEY` for prod vs testnet
- ✅ Rotate `JWT_SECRET` periodically
- ✅ Keep `QUICKNODE_WEBHOOK_SECRET` secure

---

### 5. Register Backend Signer as Lender

**CRITICAL:** Must be done before backend can create loans.

#### Option A: From Backend

```bash
cd packages/backend
tsx scripts/register-backend-signer.ts
```

#### Option B: From Contracts Repo

```bash
cd dapp
npx hardhat run scripts/register-backend-lender.ts --network arbitrumSepolia
```

Verify registration:
```bash
# Check on-chain
cast call $LENDI_PROOF_ADDRESS "registeredLenders(address)(bool)" $BACKEND_SIGNER_ADDRESS --rpc-url $RPC_URL
```

Expected output: `true`

---

### 6. Configure QuickNode Stream

Follow detailed instructions in `QUICKNODE_SETUP.md`:

1. Create QuickNode account
2. Create Stream for Arbitrum Sepolia
3. Monitor address: `0x809B8FC3C0e12f8F1b280E8A823294F98760fad4`
4. Add events: `IncomeRecorded`, `ProofRequested`, `EscrowLinked`
5. Set webhook URL: `https://lendi-origins.vercel.app/api/v1/webhooks/quicknode`
6. Copy webhook secret
7. Add `QUICKNODE_WEBHOOK_SECRET` to Vercel env vars
8. Redeploy backend

Test webhook:
```bash
# QuickNode dashboard → Test Webhook
# Should return: {"processed": 1, "lendi_proof_events": 1}
```

---

### 7. Database Migration (if using Postgres)

If using Neon Postgres:

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push
```

If using memory storage (default for testnet):
- No migration needed
- Data resets on each deployment

---

### 8. Verify Deployment

#### Test All Endpoints

```bash
# Set base URL
export BASE_URL=https://lendi-origins.vercel.app

# Run automated tests
WORKER_ADDRESS=0x... LENDER_ADDRESS=0x... ./scripts/test-e2e.sh

# Or test manually
curl $BASE_URL/api/health
curl $BASE_URL/api/v1/docs/openapi.json
```

#### Check Vercel Logs

```bash
vercel logs --follow
```

Look for:
- ✅ No startup errors
- ✅ Environment variables loaded
- ✅ Blockchain clients initialized
- ✅ ReinieraOS SDK connected

#### Verify Environment

```bash
curl $BASE_URL/api/debug-env
```

Should show all contracts configured (addresses masked for security).

---

### 9. End-to-End Testing

Follow complete E2E testing guide in `E2E_TESTING.md`:

1. Register worker on-chain
2. Register worker in backend
3. Record income (encrypted)
4. Create loan via API
5. Wait for FHE verification (10-30s)
6. Check `isConditionMet`
7. Settle escrow if approved

**Success Criteria:**
- ✅ All API endpoints responding
- ✅ Workers can register
- ✅ Loans can be created
- ✅ FHE verification completes
- ✅ Webhooks are received
- ✅ **Zero amounts stored in database**

---

### 10. Monitoring & Maintenance

#### Set Up Monitoring

**Vercel Analytics:**
- Enable in Project Settings → Analytics
- Monitor response times, errors, bandwidth

**Custom Logging:**
- Backend uses Pino logger
- View logs: `vercel logs --follow`
- Filter: `vercel logs --follow | grep ERROR`

**Webhook Health:**
- QuickNode dashboard shows delivery status
- Check failed deliveries daily

#### Alert Configuration

Create alerts for:
- API error rate > 5%
- FHE verification failures
- Webhook delivery failures
- Database connection issues

#### Backup Strategy

**Database (if using Postgres):**
- Neon provides automatic backups
- Export periodically: `pg_dump`

**Code:**
- Git repository is source of truth
- Tag releases: `git tag v1.0.0`

#### Performance Optimization

Monitor and optimize:
- Cold start times (Vercel serverless)
- FHE decryption duration
- Database query performance
- RPC call efficiency

---

## Rollback Procedure

If deployment fails or has critical issues:

### Quick Rollback (Vercel)

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <previous-deployment-url>
```

### Emergency Fixes

1. Revert git commit: `git revert HEAD`
2. Push to trigger new deployment
3. Or manually redeploy previous commit

### Database Rollback

If using migrations:
```bash
# Rollback last migration
pnpm db:rollback
```

---

## Production Best Practices

### Security

- ✅ Use separate wallets for testnet and mainnet
- ✅ Enable 2FA on Vercel account
- ✅ Rotate secrets every 90 days
- ✅ Use Vercel's secret scanner
- ✅ Audit dependencies: `pnpm audit`

### Performance

- ✅ Enable Vercel Edge Network
- ✅ Configure appropriate function timeout (30s for FHE)
- ✅ Use connection pooling for database
- ✅ Cache blockchain reads when possible

### Privacy Compliance

- ✅ NEVER log income amounts
- ✅ NEVER store amounts in database
- ✅ Encrypt PII at rest
- ✅ Use HTTPS only
- ✅ Regular privacy audits

### Cost Optimization

- ✅ Use memory storage for testnet (free)
- ✅ Optimize RPC calls (use QuickNode rate limits)
- ✅ Cache static data
- ✅ Monitor Vercel function invocations

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Cause:** Build output directory incorrect

**Fix:**
```json
// vercel.json
{
  "outputDirectory": "dist"
}
```

### Issue: Environment variables not loaded

**Cause:** Variables not set in Vercel or incorrect environment selected

**Fix:**
1. Verify in Vercel Dashboard → Environment Variables
2. Ensure selected for Production environment
3. Redeploy

### Issue: TypeScript errors during build

**Cause:** Missing .d.ts files or type errors

**Fix:**
- Current setup has `dts: false` (working)
- See `BACKEND_STATUS.md` for TypeScript warning notes
- These are non-blocking for runtime

### Issue: 500 errors on all endpoints

**Cause:** Usually missing critical env var

**Fix:**
1. Check Vercel logs for error details
2. Verify all required env vars are set
3. Test locally first

---

## Mainnet Deployment Considerations

When deploying to mainnet (Arbitrum One):

### Critical Changes

1. **Network Configuration:**
   ```bash
   CHAIN_ID=42161
   RPC_URL=https://arb1.arbitrum.io/rpc
   ```

2. **Contract Addresses:**
   - Deploy all contracts to mainnet
   - Update all addresses in env vars

3. **Database:**
   - Use production-grade Postgres (not memory)
   - Enable backups and point-in-time recovery

4. **Monitoring:**
   - 24/7 monitoring and alerting
   - PagerDuty or equivalent for critical alerts

5. **Security:**
   - Full security audit before mainnet
   - Bug bounty program
   - Multi-sig for contract ownership

6. **QuickNode:**
   - Upgrade to paid tier for reliability
   - Configure multiple webhook endpoints (redundancy)

### Gradual Rollout

1. Deploy to mainnet but keep disabled
2. Test with small amounts
3. Enable for beta users
4. Monitor for 1-2 weeks
5. Full public launch

---

## Support & Resources

**Documentation:**
- `LOCAL_TESTING.md` - Local development and testing
- `QUICKNODE_SETUP.md` - QuickNode webhook configuration
- `E2E_TESTING.md` - Complete end-to-end testing guide
- `BACKEND_STATUS.md` - Implementation status and architecture

**Scripts:**
- `scripts/register-backend-signer.ts` - Register lender
- `scripts/test-e2e.sh` - Automated endpoint tests

**Deployed Backend:**
https://lendi-origins.vercel.app

**API Documentation:**
https://lendi-origins.vercel.app/api/v1/docs/openapi.json

**Block Explorer:**
https://sepolia.arbiscan.io/

**Support:**
- GitHub Issues: https://github.com/LendiXYZ/lendi-origins/issues
- Vercel Support: https://vercel.com/support
- QuickNode Support: https://www.quicknode.com/support
