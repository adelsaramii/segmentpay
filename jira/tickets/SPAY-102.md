# SPAY-102 · Multi-segment balances with isolated accounting

**Status:** TODO · **Priority:** HIGH · **Route:** `/wallet`

## User story

As a shopper, I want each wallet segment to track its own balance separately so that spending from one segment never silently affects another.

_FA:_ به عنوان یک خریدار، می‌خواهم هر بخش کیف پول موجودی خودش را داشته باشد تا خرج کردن از یک بخش روی بخش دیگر تأثیر نگذارد.

## Description

Each of the four segments (Cash, Gift, Cashback, Corporate) is accounted independently. Any debit against one segment must change only that segment's balance. Balances are driven by the ledger; there is no direct balance mutation outside ledger events.

_FA:_ هر یک از چهار بخش (نقدی، هدیه، کش‌بک، سازمانی) به صورت مستقل حسابداری می‌شود. هر برداشت از یک بخش فقط موجودی همان بخش را تغییر می‌دهد. موجودی‌ها از دفتر کل محاسبه می‌شوند و هیچ تغییر مستقیمی خارج از دفتر کل رخ نمی‌دهد.

## Preconditions

- A paid order used €40 from Cash segment only.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a seeded wallet
- When an order is paid using €40 from cash only
- Then the cash segment drops to €80.00 and gift, cashback and corporate are unchanged

## Scenarios

**Happy path:** Pay a grocery €40 order fully from cash. Confirm only cash dropped to €80.

**Negative / edge:** Attempting to debit a segment below zero must be rejected by the API with INSUFFICIENT_SEGMENT_BALANCE.

## Expected results

- Only the debited segment balance changes.
- Ledger contains exactly one debit entry on the touched segment.

## data-testid contract

- `wallet-segment-cash`
- `wallet-segment-gift`
- `wallet-segment-cashback`
- `wallet-segment-corporate`
