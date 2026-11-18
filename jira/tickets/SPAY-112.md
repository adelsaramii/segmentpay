# SPAY-112 · PWA installation and offline handling

**Status:** TODO · **Priority:** MEDIUM · **Route:** `/`

## User story

As a shopper, I want the app to install and show a clear offline state so that I do not attempt payments without connectivity.

_FA:_ به عنوان یک خریدار، می‌خواهم اپلیکیشن قابل نصب باشد و در حالت آفلاین به وضوح نمایش داده شود تا پرداخت بدون اتصال انجام نشود.

## Description

The app ships a web manifest with 192 and 512 icons and a service worker that caches the app shell. When offline, a banner with data-testid='offline-banner' appears and the Finalize Payment button is disabled with a tooltip explaining why.

_FA:_ اپلیکیشن دارای manifest با آیکون‌های ۱۹۲ و ۵۱۲ و سرویس ورکر برای کش کردن پوسته است. در حالت آفلاین بنر با data-testid='offline-banner' ظاهر می‌شود و دکمه پرداخت نهایی غیرفعال می‌گردد.

## Preconditions

- The web app is served and the service worker is registered.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the app is loaded
- When network goes offline
- Then the offline-banner element becomes visible and the Finalize Payment button is disabled

**AC-2**
- Given the app is loaded
- When the manifest is fetched
- Then it includes name='SegmentPay', 192 and 512 icons, and display='standalone'

## Scenarios

**Happy path:** Install the PWA, go offline, see the banner, go online, see the banner disappear.

**Negative / edge:** Offline payment attempts must not be submitted to the API.

## Expected results

- Manifest and service worker registered.
- Offline banner reacts to navigator.onLine and online/offline events.

## data-testid contract

- `offline-banner`
- `checkout-finalize-button`
