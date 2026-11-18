# SPAY-108 · Card failure with wallet compensation

**Status:** TODO · **Priority:** CRITICAL · **Route:** `/checkout`

## User story

As a shopper, I want a failed card charge to fully restore my wallet balances so that no funds are lost on a failed payment.

_FA:_ به عنوان یک خریدار، می‌خواهم شکست پرداخت کارت موجودی کیف پول را به حالت اولیه بازگرداند تا هیچ وجهی از دست نرود.

## Description

When gatewayMode='card_declined' or 'network_error', wallet reservations are reversed and the order is marked 'failed'. The UI shows a failure state with a 'Retry Payment' action that returns to the allocation screen with the previous allocations prefilled.

_FA:_ هنگامی که gatewayMode برابر 'card_declined' یا 'network_error' باشد، رزروهای کیف پول برگردانده شده و سفارش به 'failed' تغییر می‌کند. UI وضعیت ناموفق را با گزینه 'تلاش مجدد' نمایش می‌دهد.

## Preconditions

- A grocery order with allocations and gatewayMode='card_declined'.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a €100 order and gatewayMode=card_declined
- When the user clicks Finalize Payment
- Then the UI shows 'Payment failed' and the wallet returns to its pre-attempt balances

**AC-2**
- Given the failed order
- When the ledger is inspected
- Then each wallet source has one reservation entry and one matching reversal entry for the same amount

## Scenarios

**Happy path:** Retry with gatewayMode=success completes the order correctly.

**Negative / edge:** Gateway network_error produces the same compensation outcome.

## Expected results

- Order status is 'failed'.
- Wallet balances equal their pre-attempt values.
- A matching reversal entry exists for every reservation.

## data-testid contract

- `qa-gateway-select`
- `checkout-finalize-button`
- `payment-result-failure`
- `payment-result-error-code`
