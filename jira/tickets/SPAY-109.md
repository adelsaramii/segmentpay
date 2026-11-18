# SPAY-109 · Idempotency and duplicate payment prevention

**Status:** TODO · **Priority:** CRITICAL · **Route:** `/checkout`

## User story

As the platform, I want duplicate payment requests with the same idempotency key to be deduplicated so that a user is never charged twice.

_FA:_ به عنوان پلتفرم، می‌خواهم درخواست‌های تکراری پرداخت با همان کلید بی‌قراردادی حذف شوند تا کاربر دو بار شارژ نشود.

## Description

POST /api/orders/:id/pay requires an idempotencyKey. Replays with the same key on the same order return the original PaymentAttempt untouched. Replays with the same key but a conflicting payload return 409 IDEMPOTENCY_CONFLICT. Paid orders reject any new attempt with ORDER_ALREADY_PAID.

_FA:_ POST /api/orders/:id/pay به idempotencyKey نیاز دارد. درخواست تکراری با همان کلید و بار یکسان همان PaymentAttempt اولیه را برمی‌گرداند؛ با بار متفاوت 409 IDEMPOTENCY_CONFLICT. سفارش پرداخت‌شده هر درخواست جدیدی را با ORDER_ALREADY_PAID رد می‌کند.

## Preconditions

- A paid order with idempotencyKey K1.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the paid order and the same allocations
- When POST /api/orders/:id/pay is called again with K1
- Then the response reuses the original PaymentAttempt and wallet balances are unchanged

**AC-2**
- Given the paid order
- When POST /api/orders/:id/pay is called again with a new idempotency key
- Then the API responds with ORDER_ALREADY_PAID

**AC-3**
- Given the same K1
- When the payload differs from the original
- Then the API responds with IDEMPOTENCY_CONFLICT

## Scenarios

**Happy path:** Replay with the same key — no additional debit.

**Negative / edge:** Attempting a new payment on a paid order is rejected.

## Expected results

- Only one committed PaymentAttempt per order.
- Idempotent replays are safe and deterministic.

## data-testid contract

- `qa-replay-last-payment`
- `payment-result-success`
