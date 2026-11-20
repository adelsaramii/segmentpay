---
name: web-harness
description: "Drive the SegmentPay web app from short scripts — open, read, tap, type, screenshot. Playwright under the hood; phone-harness-shaped helpers on top so one-off agent tasks don't need full spec files."
---

# web-harness

Thin Playwright wrapper that exposes a uniform set of verbs so an agent (or a
script) can drive the real SegmentPay web app without writing a full `@playwright/test` spec.

Lives at `scripts/web-harness.mjs`. One file, two modes.

## Setup

Prereq: the SegmentPay dev servers must be running.

```bash
npm run dev          # starts api on :4000 and web on :5173
```

If you're calling the harness from an agent, do not start `npm run dev` inside the
same heredoc — it blocks. Ask the user to run it in another terminal (or check
`curl http://localhost:5173` returns 200 before scripting).

Env overrides:

| Var | Default | Meaning |
| --- | --- | --- |
| `WEB_URL` | `http://localhost:5173` | base for `open('/path')` |
| `API_URL` | `http://localhost:4000` | base for `api('POST','/api/...')` |
| `HEADLESS` | `1` | set to `0` to watch the browser |
| `VIEWPORT` | `430x900` | `WxH` in CSS pixels |

## Usage — heredoc (one-shot)

```bash
node scripts/web-harness.mjs <<'JS'
// task: screenshot the checkout page for ORD-10001 in both themes
// step: reset state, create order, open checkout, shoot light + dark
await reset();
const o = await api('POST', '/api/orders', { items: [{ productId: 'grocery-banana', quantity: 1 }] });
await open(`/checkout/${o.id}`);
await wait_for_text('تخصیص یافته');
await screenshot('shot-light.png');
await theme('dark', { waitFor: 'تخصیص یافته' });
await screenshot('shot-dark.png');
JS
```

Start every heredoc with `// task:` (the user's request, identical across the
scripts of one request) and `// step:` (what this script does). Helpers are
pre-imported into the body; nothing to `require`.

## Usage — module (long-running)

```js
import { open, screen, tap_testid, screenshot, close } from '../scripts/web-harness.mjs';

for (const id of ['ORD-10001', 'ORD-10002', 'ORD-10003']) {
  await open(`/checkout/${id}`);
  await screenshot(`out/${id}.png`);
}
await close();
```

The browser starts lazily on the first helper call and stays alive until
`close()` or the process exits. Use the module mode for anything that visits >1
page: it reuses the same browser.

## Helpers

Navigation & timing:

- `open(path)` — `page.goto`. Relative paths get `WEB_URL` prepended.
- `url()` — current page URL.
- `wait_for_text(query, { timeout, exact })` — poll until visible; returns `true`/`false`.
- `wait_for_text_gone(query, { timeout })` — poll until hidden.
- `theme(mode, { waitFor })` — set `localStorage['segmentpay-theme']` and reload. Optional `waitFor` pins a readiness check.

Reading:

- `screen()` — visible text nodes `[{ text, role, testid?, x, y, w, h }]`. Leaf-ish, de-duplicated.
- `find_text(query, { exact })` — same shape, filtered.
- `screenshot(path, { fullPage })` — full-page PNG by default. Path relative to repo root.

Acting:

- `tap_text(query, { exact, index })` — click by visible text.
- `tap_testid(testid, { index })` — click by `data-testid`.
- `fill(testid, value)` — set an input/textarea value via React-friendly `input`+`change` events.
- `type_text(s, { delay })` — type into the focused element.
- `press(key)` — keyboard chord, e.g. `'Enter'`, `'Control+a'`.
- `scroll(direction, amount)` — `'down' | 'up' | 'left' | 'right'`, `amount` is fraction of viewport.

Escape hatches:

- `api(method, path, body)` — fetch wrapper to `API_URL`. Returns parsed JSON.
- `reset()` — `POST /api/dev/reset`. Shorthand.
- `inject(fn, ...args)` — raw `page.evaluate` for anything the helpers don't cover.
- `close()` — stop the browser (module mode; the CLI closes for you).

## Working method

1. **Name what should change before you act.** A testid that appears, a total
   that updates, a route change. Without that you can't tell success from a
   silent no-op.
2. **Act, then verify cheaply.** `wait_for_text(...)` then one `screen()` or
   `find_text(...)`. Don't `await sleep(n)`.
3. **Batch proven sub-tasks.** A whole scenario in one heredoc costs one
   browser launch (~1s); a call per turn costs that every time.
4. **When a check fails, isolate.** Re-run the single action, `screen()` what
   you see, form one guess, test it. Don't re-run the batch.
5. **Reach for `api(...)` when the UI is incidental.** Draining a wallet,
   creating orders, flipping gateway mode — faster and more reliable than
   clicking through screens.
6. **Reach for `inject(fn)` for presentation-only DOM changes** — e.g.
   rendering a design mockup of an un-built component on a real screen (see
   `render-mockups-spay-113.mjs`). Don't use it to bypass real behavior under
   test.

## When not to use web-harness

- **Running the e2e suite.** Use `npm run test:e2e` (Playwright Test under
  `tests/e2e/`). Those specs produce assertions and reports; the harness
  produces observations and screenshots.
- **Anything mobile-only or OCR-only.** Reach for phone-harness instead.
- **Tasks that only need the API.** Call the API directly. `curl` or `fetch`
  is cheaper than booting a browser.

## Example scripts in this repo

- `scripts/render-mockups-spay-113.mjs` — regenerates all 16 Smart Split
  design PNGs using harness helpers. Run: `npm run mockups:spay-113`.
