<!-- Fill the sections below. The PR CANNOT be merged until all listed Jira tickets have a QA verdict of VERIFIED. -->

## Summary

<!-- 1-3 bullets on what changed. Reference every affected SPAY-xxx ticket. -->

## Tickets covered

| Key | Summary | Route | Verdict |
|-----|---------|-------|---------|
| SPAY-xxx | ... | /... | PENDING |

## QA Agent run

- Run id: `qa-evidence/run-YYYY-MM-DDTHH-MM-SS/`
- Base URL used: http://127.0.0.1:5173
- API: http://127.0.0.1:4000
- Gateway modes exercised: success, card_declined, network_error

### Verdict table

| Ticket | Verdict | Evidence |
|--------|---------|----------|
| SPAY-xxx | VERIFIED | `qa-evidence/.../screenshots/SPAY-xxx-step-N.png` |

### Pixel check

<!-- Attach side-by-side screenshots of the running screen vs. the design image for each new screen. -->

## Test plan

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e`
- [ ] QA Agent run attached above
- [ ] Reviewed against `docs/QA_MATRIX.md`
