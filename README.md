# SegmentPay

A Progressive Web Application that demonstrates a multi-segment wallet combined with multi-source payment per order. The UI is a Persian/RTL purple fintech design. The backend is a deterministic in-memory mock built for repeatable testing by an autonomous QA Agent.

> Monorepo: `apps/api`, `apps/web`, `packages/shared`, `jira/`, `tests/e2e`.

## Quickstart

```bash
npm install
npm run dev       # boots api (http://localhost:4000) and web (http://localhost:5173)
```

Then open http://localhost:5173.

### Build and tests

```bash
npm run build         # shared → api → web
npm run typecheck     # strict TypeScript across all workspaces
npm run test          # vitest unit + API tests
npm run test:e2e      # Playwright e2e (requires `npm run test:e2e:install` once)
```

### Reset the demo

Any time:

```bash
curl -X POST http://localhost:4000/api/dev/reset
```

Or use the **QA Controls** panel on the Wallet page.

## Seeded wallet

| Segment    | Balance  | Rule                                     |
|------------|---------:|------------------------------------------|
| Cash       | €120.00  | No restriction                           |
| Gift       |  €25.00  | Grocery or fashion only                   |
| Cashback   |  €15.00  | Order ≥ €20.00, max 20% of total          |
| Corporate  |  €60.00  | Office supplies only                      |
| **Total**  |**€220.00**| |

## REST API

All amounts are integer cents.

```
GET    /api/wallet
GET    /api/products
POST   /api/orders                 { items: [{ productId, quantity }] }
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders/:id/quote       { allocations: [{ source, amountCents }] }
POST   /api/orders/:id/pay         { allocations, gatewayMode?, idempotencyKey }
POST   /api/orders/:id/refund      { idempotencyKey }
GET    /api/ledger
GET    /api/jira/tickets
GET    /api/jira/tickets/:key
POST   /api/dev/reset
POST   /api/dev/gateway            { mode: 'success' | 'card_declined' | 'network_error' }
```

Errors are JSON envelopes:

```json
{ "error": { "code": "INELIGIBLE_SEGMENT", "message": "...", "messageFa": "..." } }
```

## Jira board

12 fictional tickets live in `jira/tickets.json`. The same data drives the in-app Jira board screen and the QA Agent that verifies the running application.

## QA Agent workflow

See `docs/ARCHITECTURE.md` section 10 and `docs/QA_MATRIX.md`.

## Design and typography

- Primary: `#6D28D9` / `#8B5CF6`
- Success: `#10B981` · Warning: `#F59E0B`
- Font: Vazirmatn (fallback: IRANSansX, Inter)
- Direction: RTL

## License

MIT — demo / reference only, not production-grade.
