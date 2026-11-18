# SPAY-111 · Transaction ledger

**Status:** TODO · **Priority:** HIGH · **Route:** `/ledger`

## User story

As an operator, I want to inspect the full ledger with filters so that I can trace balance changes to events.

_FA:_ به عنوان اپراتور، می‌خواهم دفتر کل را با فیلتر مشاهده کنم تا بتوانم تغییرات موجودی را به رویدادها ردگیری کنم.

## Description

GET /api/ledger returns the full event stream sorted by createdAt desc. The UI exposes 'All / Payments / Refunds' filters and shows: timestamp, order id, source, amount with +/− sign and state badge. Each row lists its reason code when present.

_FA:_ GET /api/ledger جریان کامل رویدادها را به ترتیب نزولی زمان برمی‌گرداند. UI فیلترهای «همه / پرداخت‌ها / بازگشت‌ها» را ارائه می‌دهد و هر ردیف شامل زمان، شناسه سفارش، منبع، مبلغ با علامت +/− و وضعیت است.

## Preconditions

- At least one payment and one refund exist.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a successful pay and a successful refund
- When the user opens /ledger
- Then payment entries appear with negative amounts and refund entries with positive amounts

**AC-2**
- Given the ledger screen
- When the user clicks the Refunds filter
- Then only refund entries remain visible

## Scenarios

**Happy path:** Filter between All/Payments/Refunds and see row counts update accordingly.

**Negative / edge:** After /dev/reset the ledger is empty.

## Expected results

- Ledger entry count equals payment debits + refund credits + their reversals if any.
- No balance change exists without a corresponding ledger entry.

## data-testid contract

- `ledger-filter-all`
- `ledger-filter-payments`
- `ledger-filter-refunds`
- `ledger-row`
