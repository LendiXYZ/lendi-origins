# Action Items — Lendi

## Open

| #   | Item                                                                              | Priority | Owner | Status      | Blocked By       |
| --- | --------------------------------------------------------------------------------- | -------- | ----- | ----------- | ---------------- |
| 1   | Confirm ConfidentialEscrow addresses + resolver interface + SDK encoding          | Critical | Dev   | Not started | Reiniera team    |
| 2   | Implement truthful isConditionMet in InformalProofGate (not always true)          | Critical | Dev   | Not started | —                |
| 3   | Design auth bridge: backend SIWE/JWT vs ZeroDev smart-account addresses          | Critical | Dev   | Not started | —                |
| 4   | Register gate/backend signer as lender (onlyLender ACL)                          | High     | Dev   | Not started | #2               |
| 5   | Wire InformalProof contract addresses + CoFHE client into product app            | High     | Dev   | Not started | #1               |
| 6   | Build Spanish-first onboarding flow with ZeroDev passkeys                        | High     | Dev   | Not started | #3               |
| 7   | Add integration tests for gate + escrow flow                                     | High     | Dev   | Not started | #1, #2           |
| 8   | Set up Neon DB + Drizzle schema for backend persistence                          | Medium   | Dev   | Not started | —                |
| 9   | Add env templates (.env.example) for both packages                               | Medium   | Dev   | Not started | —                |
| 10  | Implement income recording flow (recordIncome via cofhejs in frontend)           | High     | Dev   | Not started | #5               |
| 11  | Build loan verification UX (proveIncome -> qualified/not qualified)              | High     | Dev   | Not started | #2, #5           |
| 12  | Add CoFHE loading states (10-30s async UX patterns)                              | Medium   | Dev   | Not started | #5               |

## Closed

| #   | Item                                                    | Completed  |
| --- | ------------------------------------------------------- | ---------- |
| C1  | Bootstrap product monorepo from platform-modules        | 2026-04-10 |
| C2  | Apply Lendi brand (navy + lime, dark theme, Outfit)     | 2026-04-10 |
| C3  | Generate entity vertical slices (Worker, Lender, etc.)  | 2026-04-10 |
| C4  | Build dashboard with entity summaries                   | 2026-04-10 |
| C5  | Verify: tests pass (275/275), lint clean, build success | 2026-04-10 |
| C6  | Populate OS docs from brief                             | 2026-04-10 |
