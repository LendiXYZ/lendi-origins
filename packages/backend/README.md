# Lendi Backend — Wave 2

Privacy-first P2P lending backend with FHE income verification.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Add your configuration to .env
# Required: JWT_SECRET, SIGNER_PRIVATE_KEY

# Start dev server
pnpm dev
```

Server runs on `http://localhost:3000`

### Production

```bash
# Build
pnpm build

# Deploy to Vercel
vercel --prod
```

---

## 📋 Documentation

| Document | Purpose |
|----------|---------|
| **[BACKEND_STATUS.md](./BACKEND_STATUS.md)** | Implementation status and architecture overview |
| **[LOCAL_TESTING.md](./LOCAL_TESTING.md)** | Local development and testing guide |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Complete deployment guide (Vercel + Mainnet) |
| **[QUICKNODE_SETUP.md](./QUICKNODE_SETUP.md)** | QuickNode webhook configuration |
| **[E2E_TESTING.md](./E2E_TESTING.md)** | End-to-end testing procedures |

---

## 🏗️ Architecture

### Clean Architecture (DDD)

```
src/
├── domain/          # Business entities and repository interfaces
├── application/     # Use cases and DTOs
├── infrastructure/  # Implementations (blockchain, database, external services)
└── interface/       # API handlers and middleware

api/                 # Vercel serverless functions
```

### Key Features

- ✅ **Privacy-First**: Zero income/loan amounts stored in database
- ✅ **FHE Integration**: Fully Homomorphic Encryption for income verification
- ✅ **Clean Architecture**: Domain-driven design with clear separation
- ✅ **Type-Safe**: TypeScript strict mode throughout
- ✅ **Production-Ready**: Deployed on Vercel with comprehensive monitoring

---

## 🔐 Privacy Guarantees

```typescript
// ✅ CAN store in database:
- Worker addresses
- Income event timestamps
- Transaction hashes
- Escrow IDs
- Loan status

// ❌ NEVER stored in database:
- Income amounts (stay on-chain as euint64)
- Loan amounts (stay in ConfidentialEscrow)
- Any decrypted financial data
```

All sensitive amounts remain encrypted on-chain or exist only in RAM during FHE processing.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20 + TypeScript 5.7
- **Framework**: Express-less (pure Vercel functions)
- **Blockchain**: viem 2.x (Arbitrum Sepolia)
- **FHE**: @cofhe/sdk 0.4
- **Protocol**: @reineira-os/sdk 0.1
- **Database**: Drizzle ORM + Neon Postgres (or in-memory)
- **Auth**: SIWE + JWT (jose)
- **Logging**: Pino
- **Webhooks**: QuickNode
- **Deploy**: Vercel Serverless

---

## 📡 API Endpoints

### Public Endpoints

```
GET  /api/health                          # Health check
GET  /api/v1/docs/openapi.json            # API documentation
POST /api/v1/auth/wallet/nonce            # Request SIWE nonce
POST /api/v1/auth/wallet/verify           # Verify wallet signature
```

### Protected Endpoints (require Bearer token)

```
POST /api/v1/workers                      # Create worker
GET  /api/v1/workers/:id                  # Get worker
POST /api/v1/lenders                      # Create lender
GET  /api/v1/lenders/:id                  # Get lender
POST /api/v1/loans                        # Create loan (triggers FHE flow)
GET  /api/v1/loans/:id                    # Get loan status
GET  /api/v1/income-events                # Get income history (timestamps only)
GET  /api/v1/balance                      # Get wallet balance
```

### Webhook Endpoints

```
POST /api/v1/webhooks/quicknode           # QuickNode events (HMAC verified)
POST /api/v1/webhooks/relay-callback      # Bridge relay callbacks
```

**Deployed:** https://lendi-origins.vercel.app

---

## 🧪 Testing

### Unit Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

### Local Testing

```bash
# Start dev server
pnpm dev

# Run endpoint tests
./scripts/test-e2e.sh
```

See `LOCAL_TESTING.md` for detailed guide.

### E2E Testing

Complete end-to-end testing on testnet. See `E2E_TESTING.md` for detailed guide.

---

## 🚢 Deployment

### Prerequisites

- [ ] Contracts deployed to Arbitrum Sepolia
- [ ] Backend signer registered as lender
- [ ] QuickNode stream configured
- [ ] Environment variables set in Vercel

### Deploy

```bash
# One-time setup
vercel login
vercel link

# Deploy to production
vercel --prod
```

See `DEPLOYMENT.md` for complete guide.

---

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm db:push` | Push database schema |
| `pnpm db:studio` | Open database UI |
| `tsx scripts/register-backend-signer.ts` | Register backend as lender |
| `./scripts/test-e2e.sh` | Test all endpoints |

---

## 📊 Monitoring

### Vercel Logs

```bash
vercel logs --follow
vercel logs --follow | grep ERROR
```

### Health Check

```bash
curl https://lendi-origins.vercel.app/api/health
```

### Webhook Status

Check QuickNode dashboard for webhook delivery stats.

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Worker not registered on-chain"**
- Solution: Call `LendiProof.registerWorker()` from worker wallet first

**Issue: "SIGNER_PRIVATE_KEY required"**
- Solution: Add `SIGNER_PRIVATE_KEY` to environment variables

**Issue: "FHE decryption timeout"**
- Solution: Wait 30s+ or check RPC_URL configuration

See `LOCAL_TESTING.md` and `E2E_TESTING.md` for detailed troubleshooting.

---

## 🔐 Security

- ✅ SIWE wallet authentication
- ✅ JWT tokens with expiration
- ✅ HMAC webhook verification
- ✅ Input validation with Zod
- ✅ Rate limiting on public endpoints
- ✅ CORS configuration
- ✅ No secrets in logs
- ✅ Environment variable validation

---

## 📈 Performance

### Expected Timings (Arbitrum Sepolia)

```
Worker Registration:     ~2-5 seconds
Income Recording:        ~3-7 seconds
Escrow Creation:         ~5-10 seconds
FHE Verification:        ~10-30 seconds
Total Loan Flow:         ~25-60 seconds
```

### Optimization

- Uses Vercel Edge Network for low latency
- Connection pooling for database
- Cached blockchain reads where possible
- Async FHE processing (non-blocking)

---

## 🔗 Links

- **Frontend**: [../app](../app)
- **Contracts**: [../../dapp](../../dapp)
- **Deployed Backend**: https://lendi-origins.vercel.app
- **API Docs**: https://lendi-origins.vercel.app/api/v1/docs/openapi.json
- **Block Explorer**: https://sepolia.arbiscan.io/

---

## 📞 Support

- GitHub Issues: Create Issue
- Documentation: See links above
- Vercel Support: https://vercel.com/support
