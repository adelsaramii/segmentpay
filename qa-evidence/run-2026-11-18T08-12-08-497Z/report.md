# SegmentPay QA Evidence — run-2026-11-18T08-12-08-497Z

- Verified: 12
- Failed: 0

| Ticket | Verdict | Screenshots |
|---|---|---|
| SPAY-101 | VERIFIED | `SPAY-101-step-1-wallet.png` |
| SPAY-102 | VERIFIED | `SPAY-102-step-1-wallet-after-cash-pay.png` |
| SPAY-103 | VERIFIED | `SPAY-103-step-1-ineligible-gift-corporate.png` |
| SPAY-104 | VERIFIED | `SPAY-104-step-1-shop-all.png`<br>`SPAY-104-step-2-shop-grocery-filter.png`<br>`SPAY-104-step-3-cart-with-shipping.png` |
| SPAY-105 | VERIFIED | `SPAY-105-step-1-checkout-landed.png` |
| SPAY-106 | VERIFIED | `SPAY-106-step-1-checkout-empty-allocations.png` |
| SPAY-107 | VERIFIED | `SPAY-106-step-1-checkout-empty-allocations.png`<br>`SPAY-107-step-2-allocations-40-20-10-30.png`<br>`SPAY-107-step-3-success-screen.png` |
| SPAY-108 | VERIFIED | `SPAY-108-step-1-payment-failure.png` |
| SPAY-109 | VERIFIED | `SPAY-109-step-1-order-paid-after-replay.png` |
| SPAY-110 | VERIFIED | `SPAY-110-step-1-order-detail-paid.png`<br>`SPAY-110-step-2-order-detail-refunded.png` |
| SPAY-111 | VERIFIED | `SPAY-111-step-1-ledger-all.png`<br>`SPAY-111-step-2-ledger-payments.png`<br>`SPAY-111-step-3-ledger-refunds.png` |
| SPAY-112 | VERIFIED | `SPAY-112-step-1-online-wallet.png`<br>`SPAY-112-step-2-offline-banner.png` |

## Steps

### SPAY-101 — VERIFIED

- Total €220.00 and four segments visible

### SPAY-102 — VERIFIED

- Gift/Cashback/Corporate unchanged after cash-only pay

### SPAY-103 — VERIFIED

- Gift and Corporate inputs disabled for electronics

### SPAY-104 — VERIFIED

- Shop filter narrows list; cart totals = items + €2 shipping

### SPAY-105 — VERIFIED

- Cart checkout button navigates to /checkout/:orderId

### SPAY-106 — VERIFIED

- finalize disabled when empty

### SPAY-107 — VERIFIED

- SPAY-106: finalize disabled on empty allocations
- SPAY-107: 40/20/10/30 pay succeeds on €100 grocery order

### SPAY-108 — VERIFIED

- Card declined failure screen shown; wallet restored

### SPAY-109 — VERIFIED

- Same-key replay = no-op; different key = ORDER_ALREADY_PAID

### SPAY-110 — VERIFIED

- Refund button restores wallet; status flips to refunded

### SPAY-111 — VERIFIED

- Ledger displays entries and filters work

### SPAY-112 — VERIFIED

- Manifest has 192+512 icons; offline banner toggles with network
