# SegmentPay — QA Test Matrix

Mapping of Jira tickets → route → acceptance criteria → automated test coverage.

| Ticket  | Route         | Key acceptance criteria                                                                 | Automated coverage                                      |
|---------|---------------|-----------------------------------------------------------------------------------------|--------------------------------------------------------|
| SPAY-101 | /wallet       | Total €220.00; four segment cards at their seeded balances                              | apps/api test `wallet.test.ts`; e2e `wallet.spec.ts`   |
| SPAY-102 | /wallet       | A €40 cash-only pay affects only the cash segment                                       | api `payment.spec.ts` "segments isolated"              |
| SPAY-103 | /checkout     | Gift disabled for electronics; cashback capped at 20% and min €20                        | api `eligibility.test.ts`; e2e `ineligible.spec.ts`    |
| SPAY-104 | /shop, /cart  | Add/remove/qty flows; cart totals = items + €2 shipping                                 | e2e `catalog-cart.spec.ts`                             |
| SPAY-105 | /checkout     | Cart → POST /orders → navigate to /checkout/:id with pending_payment                    | api `order.test.ts`                                    |
| SPAY-106 | /checkout     | Allocations respect eligibility; finalize button gated on exact total match             | e2e `multi-source.spec.ts`                             |
| SPAY-107 | /payment-result | Pay 40/20/10/30 on €100 grocery order; wallet reflects debits; order status 'paid'    | e2e `multi-source.spec.ts`                             |
| SPAY-108 | /payment-result | gateway=card_declined → wallet restored; one reversal per reservation                  | api `compensation.test.ts`; e2e `card-failure.spec.ts` |
| SPAY-109 | /checkout     | Replay with same key is a no-op; different payload → 409; paid → ORDER_ALREADY_PAID     | api `idempotency.test.ts`; e2e `duplicate-pay.spec.ts` |
| SPAY-110 | /orders/:id   | Refund restores segments and card; repeat refund is NOT_REFUNDABLE                       | api `refund.test.ts`; e2e `refund.spec.ts`             |
| SPAY-111 | /ledger       | Ledger shows every balance change; filter switches to Payments/Refunds only              | e2e `ledger.spec.ts`                                   |
| SPAY-112 | /             | Offline banner appears when offline; manifest exposes 192/512 icons                      | e2e `pwa.spec.ts`                                      |

## Required `data-testid`s (contract between app and QA)

- `wallet-total`, `wallet-segment-cash`, `wallet-segment-gift`, `wallet-segment-cashback`, `wallet-segment-corporate`
- `catalog-filter-all`, `catalog-filter-grocery`, `catalog-filter-fashion`, `catalog-filter-electronics`, `catalog-filter-office`
- `catalog-product-<id>` (e.g. `catalog-product-grocery-banana`)
- `cart-line-<id>`, `cart-subtotal`, `cart-shipping`, `cart-total`, `cart-checkout-button`
- `checkout-order-id`, `checkout-total-due`
- `checkout-allocation-cash`, `checkout-allocation-gift`, `checkout-allocation-cashback`, `checkout-allocation-corporate`, `checkout-allocation-card`
- `checkout-allocated-total`, `checkout-finalize-button`
- `payment-result-success`, `payment-result-failure`, `payment-result-total-paid`, `payment-result-breakdown-<source>`
- `payment-result-error-code`
- `order-detail-status`, `order-detail-refund-button`, `order-detail-refund-history`
- `ledger-filter-all`, `ledger-filter-payments`, `ledger-filter-refunds`, `ledger-row`
- `offline-banner`
- `qa-gateway-select`, `qa-reset-button`, `qa-replay-last-payment`
