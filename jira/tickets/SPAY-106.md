# SPAY-106 · Multi-source payment allocation controls

**Status:** TODO · **Priority:** CRITICAL · **Route:** `/checkout`

## User story

As a shopper, I want to split an order across wallet segments and a card so that I can mix funds.

_FA:_ به عنوان یک خریدار، می‌خواهم سفارش را بین بخش‌های کیف پول و کارت تقسیم کنم تا بتوانم از چند منبع پرداخت کنم.

## Description

Checkout screen shows an allocation row per source: segments that are eligible are enabled with a numeric input bounded by min(eligibility.maxCents, segment.balance). Card has no upper cap. A live 'Allocated' footer shows Σ allocations and turns green when it equals the total.

_FA:_ صفحه پرداخت برای هر منبع یک ردیف تخصیص نمایش می‌دهد: بخش‌های واجد شرایط با مقدار عددی محدود به min(حداکثر مجاز، موجودی بخش) فعال هستند. کارت سقف ندارد. پاورقی 'تخصیص یافته' مجموع را نشان می‌دهد و در صورت برابری با مبلغ کل سبز می‌شود.

## Preconditions

- An order is in pending_payment status.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a grocery order of €100.00
- When the user sets cash=40, gift=20, cashback=10, card=30
- Then the allocated footer equals €100.00 and the Finalize Payment button is enabled

**AC-2**
- Given the same order
- When the sum of allocations is less than €100.00
- Then the Finalize Payment button is disabled and the footer shows a remaining amount

## Scenarios

**Happy path:** Split 40/20/10/30 across cash/gift/cashback/card for a €100 grocery order.

**Negative / edge:** Entering cash=130 is clamped to the cash segment's balance of €120.

## Expected results

- Allocation inputs respect eligibility maxCents.
- Finalize Payment enabled only when Σ allocations == total.

## data-testid contract

- `checkout-allocation-cash`
- `checkout-allocation-gift`
- `checkout-allocation-cashback`
- `checkout-allocation-card`
- `checkout-allocated-total`
- `checkout-finalize-button`
