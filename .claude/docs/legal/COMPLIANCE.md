# Compliance Framework — Lendi

## Applicable Regulations

| Regulation  | Applies? | Status      | Notes                                         |
| ----------- | -------- | ----------- | --------------------------------------------- |
| MiCA (EU)   | Maybe    | Not started | If expanding to EU; Colombia-first for now    |
| AML/KYC     | Yes      | Not started | Required for fiat on/off ramps                |
| GDPR        | Maybe    | Not started | If EU users; minimize plaintext financial PII |
| Travel Rule | Yes      | Not started | Transfers >$1000                              |
| Colombian   | Yes      | Not started | Local fintech/lending regulations             |

## AML/KYC Requirements

- [ ] KYC at wallet creation (via ZeroDev onboarding)
- [ ] Transaction monitoring for suspicious patterns
- [ ] No plaintext income or loan amounts stored in backend DB
- [ ] SAR filing procedures
- [ ] Record retention (5 years minimum)

## Smart Contract Audit

- [ ] Schedule audit before mainnet (real funds)
- [ ] Focus: FHE value handling in InformalProof, ACL on proveIncome/linkEscrow
- [ ] Verify InformalProofGate isConditionMet implementation
- [ ] At least one independent audit firm
- [ ] Address all critical/high findings before launch

## Privacy by Design

- Income amounts never leave the FHE domain (only ebool exposed)
- Backend stores only: IDs, statuses, timestamps, tx hashes
- No plaintext financial data in logs or error messages
- CoFHE decryption only in browser RAM (WebLLM advisor)

## Minimum Legal Documents

- [ ] Terms of Service (Spanish + English)
- [ ] Privacy Policy (Spanish + English)
- [ ] Risk Disclaimers (DeFi-specific, lending-specific)
- [ ] Cookie Policy (if web app)
