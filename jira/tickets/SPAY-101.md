# SPAY-101 · Wallet overview screen

**Status:** TODO · **Priority:** HIGH · **Route:** `/wallet`

## User story

As a shopper, I want to see my total wallet balance and each segment's balance so that I understand how much I can spend.

_FA:_ به عنوان یک خریدار، می‌خواهم موجودی کل کیف پول و هر بخش را ببینم تا بدانم چقدر می‌توانم خرج کنم.

## Description

The Wallet Overview must present the total of all segments at the top and a per-segment list underneath. Each segment shows its balance, a short eligibility rule line, and an icon. Values must come from GET /api/wallet and be rendered in EUR with two decimals.

_FA:_ صفحه نمای کیف پول باید مجموع تمام بخش‌ها را در بالای صفحه و فهرست تک تک بخش‌ها را در زیر آن نمایش دهد. هر بخش شامل موجودی، توضیح کوتاه قانون و آیکون است. مقادیر باید از GET /api/wallet گرفته شده و با فرمت یورو و دو رقم اعشار نمایش داده شود.

## Preconditions

- The API is running and seeded with the default wallet.
- The user navigates to /wallet.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the default seeded wallet
- When the user visits /wallet
- Then the element with data-testid='wallet-total' shows €220.00

**AC-2**
- Given the default seeded wallet
- When the user visits /wallet
- Then four segment cards are visible with data-testids wallet-segment-cash, wallet-segment-gift, wallet-segment-cashback, wallet-segment-corporate

**AC-3**
- Given the default seeded wallet
- When the user visits /wallet
- Then wallet-segment-cash shows €120.00, wallet-segment-gift shows €25.00, wallet-segment-cashback shows €15.00, wallet-segment-corporate shows €60.00

## Scenarios

**Happy path:** Navigate to /wallet; see total €220.00 and four segments at their seeded balances.

**Negative / edge:** After calling POST /api/dev/reset the balances must return to the default seeded values.

## Expected results

- Total balance equals the sum of segment balances.
- Every segment card is rendered with its rule label.

## data-testid contract

- `wallet-total`
- `wallet-segment-cash`
- `wallet-segment-gift`
- `wallet-segment-cashback`
- `wallet-segment-corporate`
