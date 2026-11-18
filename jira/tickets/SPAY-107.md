# SPAY-107 · Successful multi-source checkout

**Status:** TODO · **Priority:** CRITICAL · **Route:** `/checkout`

## User story

As a shopper, I want a successful multi-source payment to debit each source atomically so that my order is paid in one go.

_FA:_ به عنوان یک خریدار، می‌خواهم پرداخت موفق چندمنبعی به صورت یکپارچه از هر منبع کسر شود تا سفارش به یکباره پرداخت گردد.

## Description

POST /api/orders/:id/pay with valid allocations that sum to the total and gatewayMode='success' commits all wallet reservations and marks the order 'paid'. The Payment Result screen shows a success state with the breakdown per source and order id.

_FA:_ POST /api/orders/:id/pay با تخصیص‌های معتبر و gatewayMode='success' تمام رزروهای کیف پول را کامیت کرده و سفارش را 'paid' می‌کند. صفحه نتیجه پرداخت وضعیت موفق را با تفکیک به ازای هر منبع و شناسه سفارش نمایش می‌دهد.

## Preconditions

- A grocery order ORD-X with total €100.00 and allocations 40/20/10/30 is ready.
- QA gateway mode is set to success.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the above setup
- When the user clicks Finalize Payment
- Then the UI navigates to /payment-result/:id showing a success state and 'Paid €100.00'

**AC-2**
- Given a committed payment
- When the wallet is reloaded
- Then cash=80.00, gift=5.00, cashback=5.00, corporate=60.00 and total=150.00

## Scenarios

**Happy path:** Pay 40/20/10/30 and land on the success screen with the correct breakdown.

**Negative / edge:** If the committed order is re-queried, its status is 'paid' and it has exactly one committed payment attempt.

## Expected results

- Order status is 'paid'.
- Wallet segments reflect the debits.
- Ledger contains one commit entry per source.

## data-testid contract

- `checkout-finalize-button`
- `payment-result-success`
- `payment-result-total-paid`
- `payment-result-breakdown-cash`
- `payment-result-breakdown-gift`
- `payment-result-breakdown-cashback`
- `payment-result-breakdown-card`
