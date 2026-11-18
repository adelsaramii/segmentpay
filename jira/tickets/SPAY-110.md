# SPAY-110 · Full refund restoring original allocations

**Status:** TODO · **Priority:** HIGH · **Route:** `/orders/:id`

## User story

As a shopper, I want to fully refund a paid order so that my wallet segments are credited back and the card refund is recorded.

_FA:_ به عنوان یک خریدار، می‌خواهم یک سفارش پرداخت‌شده را به طور کامل بازگردانم تا بخش‌های کیف پول دوباره شارژ شده و بازگشت کارت ثبت شود.

## Description

POST /api/orders/:id/refund with a fresh idempotencyKey reverses every wallet allocation back to its original segment and records a card refund entry. Order status becomes 'refunded'. Repeating the refund is a no-op idempotent response.

_FA:_ POST /api/orders/:id/refund با کلید بی‌قراردادی جدید تمام تخصیص‌های کیف پول را به بخش اصلی بازمی‌گرداند و بازپرداخت کارت را ثبت می‌کند. وضعیت سفارش 'refunded' می‌شود. تکرار یک no-op idempotent است.

## Preconditions

- A paid order ORD-X with the 40/20/10/30 breakdown.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the paid order
- When the user clicks the Refund button on /orders/:id
- Then the wallet returns to the pre-payment balances and the order status becomes 'refunded'

**AC-2**
- Given a refunded order
- When the user clicks Refund again
- Then the API returns a NOT_REFUNDABLE error and the UI disables the Refund button

## Scenarios

**Happy path:** Refund a €100 order and see balances restored to the seeded defaults.

**Negative / edge:** Refund attempts on a non-paid order are rejected with NOT_REFUNDABLE.

## Expected results

- Wallet segments return to pre-payment balances.
- Ledger contains a credit entry per source and a card refund entry.

## data-testid contract

- `order-detail-refund-button`
- `order-detail-status`
- `order-detail-refund-history`
