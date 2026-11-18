# SPAY-103 · Segment eligibility rules enforced

**Status:** TODO · **Priority:** CRITICAL · **Route:** `/checkout`

## User story

As the platform, I want segment rules enforced on the server so that customers cannot pay with an ineligible segment.

_FA:_ به عنوان پلتفرم، می‌خواهم قوانین بخش‌ها در سمت سرور اعمال شوند تا کاربر نتواند با بخش غیرمجاز پرداخت کند.

## Description

Gift credit is only allowed when every order item is in the grocery or fashion category. Corporate credit is only allowed when every order item is in the office category. Cashback requires a €20.00 minimum order and may cover at most 20% of the order total. The API's POST /orders/:id/quote endpoint returns an eligibility array describing the maximum spend per source. The pay endpoint re-validates these rules and rejects invalid allocations with INELIGIBLE_SEGMENT.

_FA:_ اعتبار هدیه فقط زمانی قابل استفاده است که تمام اقلام سفارش در دسته‌بندی مواد غذایی یا مد و پوشاک باشند. اعتبار سازمانی فقط برای اقلام لوازم اداری. کش‌بک حداقل سفارش ۲۰ یورو و حداکثر ۲۰٪ مبلغ سفارش. اندپوینت quote لیست حداکثر مجاز را برمی‌گرداند و اندپوینت pay بار دیگر اعتبارسنجی می‌کند.

## Preconditions

- The cart contains at least one electronics item and the user opens checkout.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a cart containing an electronics item
- When the user tries to allocate any amount to the gift segment
- Then the frontend disables the gift input and the API responds with INELIGIBLE_SEGMENT for gift

**AC-2**
- Given an order total of €18.00
- When the user allocates €1 to cashback
- Then the quote returns cashback.maxCents = 0 with reason 'minimum order €20.00 required'

**AC-3**
- Given an order total of €100.00
- When the user allocates €25 to cashback
- Then the API responds with CASHBACK_LIMIT_EXCEEDED and the frontend caps cashback at €20.00

## Scenarios

**Happy path:** Grocery+fashion order allows cash, gift, cashback (if ≥€20) and card.

**Negative / edge:** Electronics order disables gift and corporate at the UI and the API rejects any such allocation.

## Expected results

- Quote reflects per-segment maximum spend.
- Pay endpoint rejects ineligible allocations with structured error codes.

## data-testid contract

- `checkout-allocation-gift`
- `checkout-allocation-corporate`
- `checkout-allocation-cashback`
- `checkout-eligibility-reason-gift`
