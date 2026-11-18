# SegmentPay — Architecture

## 1. What this is

SegmentPay is a Progressive Web Application demo of a **multi-segment wallet** combined with **multi-source payment per order**. It targets two audiences:

1. Humans browsing a polished RTL Persian fintech UI.
2. An **autonomous QA Agent** that reads Jira-style tickets and verifies the running application against them.

The app is deliberately a single-process monorepo so that the entire payment lifecycle — reservation, commit, reversal, refund — is deterministic and can be fully observed through HTTP APIs and a traceable ledger.

## 2. Monorepo layout

```
apps/
  api/         Express + TypeScript mock backend
  web/         React + TypeScript + Vite PWA
packages/
  shared/      Domain types, EUR money helpers, Jira types
jira/
  tickets.json       Machine-readable ticket fixtures
  tickets/           Readable Markdown per ticket
tests/
  e2e/               Playwright specs
  playwright.config.ts
docs/        Architecture, QA matrix, product notes
qa-evidence/ QA Agent artifacts (screenshots, reports)
```

A root `npm install` wires the three workspaces together through npm workspaces.

## 3. Money

All amounts are **integer cents** (EUR). The only place floats appear is at render time, inside `EURO(cents)` / `FA_EURO(cents)` in `packages/shared/src/money.ts`. Any division (cashback 20% cap, for example) uses integer arithmetic (`Math.floor((total * 2000) / 10000)`).

## 4. Wallet domain

Four segments, each with its own balance and rules:

| Segment    | Balance | Rule                                                                  |
|------------|---------|-----------------------------------------------------------------------|
| Cash       | €120.00 | No restriction                                                        |
| Gift       | €25.00  | Only orders where every item is grocery or fashion                    |
| Cashback   | €15.00  | Order ≥ €20.00; max 20% of the order total                            |
| Corporate  | €60.00  | Only orders where every item is office supply                         |

The rules are expressed as a declarative `SegmentRule` object in `packages/shared/src/types.ts` and evaluated by a single function `evaluateEligibility(segments, order)` on the server.

## 5. Order and payment lifecycle

```
draft → pending_payment → processing → paid
                                     ↘ failed → (retry) → paid
                                                     ↘ refunded
```

`Order.status` and `PaymentAttempt.status` are stored separately. An order can have multiple `PaymentAttempt` records but only ever one committed one.

### 5.1 reserve → commit → reverse

Pay flow (server-side, inside a per-order mutex):

1. Validate allocation eligibility and sum = order total.
2. Mutex.acquire(orderId).
3. Idempotency check:
   - Same key + same payload → return existing attempt verbatim.
   - Same key + different payload → `409 IDEMPOTENCY_CONFLICT`.
   - Order already paid → `409 ORDER_ALREADY_PAID`.
4. Append **reservation** ledger entries for each wallet source. Debits are reflected in the computed wallet balance view (view = Σ ledger entries with state ∈ {reserved, committed}).
5. Call mock gateway (deterministic by `gatewayMode`).
6a. On success → append **commit** entries flipping the reservation state and set order to `paid`.
6b. On failure → append **reversal** entries, mark the attempt `failed`, order `failed`.
7. Mutex.release.

Idempotency map: `Map<idempotencyKey, { attemptId, payloadHash }>`.

### 5.2 Refund (full)

Refund flow:

1. Order must be `paid`.
2. For each committed wallet allocation on the committed attempt, append a **credit** ledger entry restoring the segment.
3. Append one `card` credit entry for the card portion.
4. Set the order to `refunded`.
5. Idempotency: the first refund request succeeds; replays with the same key return the same refund record; new refund requests after a successful refund return `NOT_REFUNDABLE`.

## 6. Ledger

The ledger is **append-only** and is the source of truth for every balance in the UI.

`balance(segment) = segment.initial - Σ ledger.debit on segment + Σ ledger.credit on segment`

where reservation counts as a debit while its state is `reserved`, and commit replaces the reservation with `state=committed`, and reversal flips `state=reversed` (no net effect).

There is no code path in the API that mutates a balance without appending a ledger entry.

## 7. Concurrency

The mock backend runs inside a single Node process. A `Map<orderId, Promise>` chain serializes all payment and refund operations per-order. This is enough to make the scenarios "two simultaneous pays on the same order" deterministic.

## 8. Mock payment gateway

`simulateGateway(mode)`:

| Mode             | Result                                                              |
|------------------|----------------------------------------------------------------------|
| `success`        | `{ ok: true }`                                                       |
| `card_declined`  | `{ ok: false, code: 'CARD_DECLINED' }`                               |
| `network_error`  | `{ ok: false, code: 'NETWORK_ERROR' }`                               |

The current mode is stored server-side and exposed through the `/api/dev/gateway` endpoint; the UI's QA controls panel sets it.

## 9. Frontend

Vite + TypeScript + Tailwind. State is almost entirely server-driven through TanStack Query. The only persistent client state is the cart (a `useCart` reducer in `localStorage`) and idempotency keys generated at checkout. All currency text uses `FA_EURO`.

Layout is RTL-first. The design palette and Vazirmatn/IRANSansX typography come from the user's design board.

PWA is provided by `vite-plugin-pwa` with a Workbox config that precaches the shell and uses network-first for `/api/*`. An `OfflineBanner` component subscribes to `navigator.onLine` plus `online` / `offline` events.

## 10. QA Agent integration

The design goal is that an autonomous QA agent can:

1. Fetch `/api/jira/tickets` and iterate.
2. Reset the sandbox with `POST /api/dev/reset`.
3. Drive the UI through `data-testid` locators and semantic roles.
4. Assert API responses and the ledger.
5. Flip the gateway mode through the Demo/QA Controls panel or `POST /api/dev/gateway`.
6. Produce a per-ticket VERIFIED/FAILED report with screenshots.

The same tickets consumed by the QA agent are rendered on the Jira board screen. If the agent and the UI ever disagree on a ticket's acceptance criterion, only one source of truth is edited: `jira/tickets.json`.

## 11. Mock limitations (intentional)

- Single process. No persistence across restart unless the API's `--persist` flag is used (not required for the demo).
- No real payment processor.
- No authentication / multi-user.
- Card refunds are recorded but not tokenised.
- Partial refunds are not implemented. The server rejects partial refund requests with `NOT_SUPPORTED`.
- The ledger is in-memory and reset by `/api/dev/reset`.
