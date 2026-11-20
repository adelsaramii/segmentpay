---
name: web-driver
description: "Drive the SegmentPay web app from short scripts or over a file-based IPC loop. Semantic state matches the Android driver in qa-agent-mvp, so an orchestrator sees web and mobile the same way. Playwright under the hood."
---

# web-driver

Thin Playwright wrapper that exposes a uniform set of verbs so an agent (or a
script) can drive the real SegmentPay web app without writing a full `@playwright/test` spec.

Lives at `scripts/web-driver.mjs`. One file, three modes.

## Setup

Prereq: the SegmentPay dev servers must be running.

```bash
npm run dev          # starts api on :4000 and web on :5173
```

If you're calling the driver from an agent, do not start `npm run dev` inside the
same heredoc — it blocks. Ask the user to run it in another terminal (or check
`curl http://localhost:5173` returns 200 before scripting).

Env overrides:

| Var | Default | Meaning |
| --- | --- | --- |
| `WEB_URL` | `http://localhost:5173` | base for `open('/path')` |
| `API_URL` | `http://localhost:4000` | base for `api('POST','/api/...')` |
| `HEADLESS` | `1` | set to `0` to watch the browser |
| `VIEWPORT` | `mobile` | preset (`mobile` \| `tablet` \| `desktop`) or `WxH` in CSS pixels |

## Usage — heredoc (one-shot)

```bash
node scripts/web-driver.mjs <<'JS'
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
import { open, screen, tap_testid, screenshot, close } from '../scripts/web-driver.mjs';

for (const id of ['ORD-10001', 'ORD-10002', 'ORD-10003']) {
  await open(`/checkout/${id}`);
  await screenshot(`out/${id}.png`);
}
await close();
```

The browser starts lazily on the first helper call and stays alive until
`close()` or the process exits. Use the module mode for anything that visits >1
page: it reuses the same browser.

## Usage — IPC server (long-running, qa-agent-mvp compatible)

Same protocol the Android driver in qa-agent-mvp uses: command files in, response files out. Lets an orchestrator treat web and mobile the same way.

```bash
node scripts/web-driver.mjs --serve=/tmp/qa-driver &
# driver writes `ready` with its pid; waits for cmd-0.json, cmd-1.json, …
```

Each command file is JSON: `{ "op": "<name>", ...args }`. The driver writes `resp-N.json` with `{ ok, delta, ...result }` — the current `state` is attached whenever `delta.screen_changed` is true. Send `touch <ipcDir>/stop` to shut down.

Supported ops: `open`, `tap_text`, `tap_testid`, `fill`, `type_text`, `press`, `scroll`, `wait_for_text`, `wait_for_text_gone`, `screenshot`, `theme`, `viewport`, `modal_sweep`, `state`, `screen`, `find_text`, `api`, `reset`, `network`, `clear_network`, `console_messages`, `clear_console`, `url`, `batch`.

## Helpers

Navigation & timing:

- `open(path)` — `page.goto`. Relative paths get `WEB_URL` prepended.
- `url()` — current page URL.
- `wait_for_text(query, { timeout, exact })` — poll until visible; returns `true`/`false`.
- `wait_for_text_gone(query, { timeout })` — poll until hidden.
- `theme(mode, { waitFor })` — set `localStorage['segmentpay-theme']` and reload. Optional `waitFor` pins a readiness check.
- `viewport(preset)` — resize to `'mobile'` (430×900), `'tablet'` (820×1180), `'desktop'` (1440×900), or a custom `{ width, height }`. Reuses the browser.

Reading:

- `state()` — the "semantic state" the agent sees instead of the pixels. Mirrors the Android driver's shape: `{ url, route, title, viewport, top_bar, visible_interactives, visible_text, modal, focused, scroll, selected_tab, screen_fingerprint }`. `visible_interactives` entries carry `{ type, id, label, text, value, bounds, disabled, focused, in_dialog }`.
- `diff(prev, curr)` — pure function. Returns `{ screen_changed, route_changed, modal_opened, modal_closed, added, removed }` using the fingerprint for cheap "same screen?" checks.
- `screen()` — flat list of visible leaf-ish text nodes `[{ text, role, testid?, x, y, w, h }]`. Useful for ad-hoc queries; `state()` is the canonical read.
- `find_text(query, { exact })` — same shape as `screen()`, filtered.
- `screenshot(path, { fullPage })` — **evidence only**. Full-page PNG by default. The agent never reads pixels back; this is for the QA report.

Acting:

- `tap_text(query, { exact, index })` — click by visible text.
- `tap_testid(testid, { index })` — click by `data-testid`.
- `fill(testid, value)` — set an input/textarea value via React-friendly `input`+`change` events.
- `type_text(s, { delay })` — type into the focused element.
- `press(key)` — keyboard chord, e.g. `'Enter'`, `'Control+a'`.
- `scroll(direction, amount)` — `'down' | 'up' | 'left' | 'right'`, `amount` is fraction of viewport.
- `modal_sweep()` — close any open `[role=dialog]` / `[role=alertdialog]` / `<dialog open>` by clicking its Close button; falls back to `Escape`. Returns count dismissed.

Inspection — the "why did it fail" layer:

- `network({ url, method, failedOnly })` — observed requests since launch or last `clear_network()`. Each entry: `{ method, url, status, ok, ms, resourceType, failure? }`. `url` is a substring match.
- `clear_network()` — reset the request buffer. Call before an action to capture "requests from this point".
- `console_messages({ type })` — console entries since launch or last `clear_console()`. Each entry: `{ type, text, location? }`. `type` filter accepts `'error'`, `'warning'`, `'log'`, `'pageerror'`, …
- `clear_console()` — reset the console buffer.

Escape hatches:

- `api(method, path, body)` — fetch wrapper to `API_URL`. Returns parsed JSON.
- `reset()` — `POST /api/dev/reset`. Shorthand.
- `inject(fn, ...args)` — raw `page.evaluate` for anything the helpers don't cover.
- `close()` — stop the browser (module mode; the CLI closes for you).

## Working method

1. **Read `state()` before and after**, not screenshots. Screenshots are
   evidence for the QA report — the agent "sees" the page through the
   semantic state object, never through pixels.
2. **Name what should change before you act.** A testid that appears, a route
   change, a `delta.modal_opened`, a specific POST that fires. Without that
   you can't tell success from a silent no-op.
3. **Act, then verify cheaply.** Check `delta.screen_changed` first — if the
   fingerprint matches, no state parse needed. For API-driven assertions,
   `clear_network()` → act → `network({ url: '/api/...' })`. Don't
   `await sleep(n)`.
4. **Batch proven sub-tasks.** A whole scenario in one heredoc costs one
   browser launch (~1s); a call per turn costs that every time.
5. **When a check fails, isolate.** Read `state()`, check
   `console_messages({ type: 'error' })` and `network({ failedOnly: true })`
   for the real cause, form one guess, test it. Don't re-run the batch.
6. **Reach for `api(...)` when the UI is incidental.** Draining a wallet,
   creating orders, flipping gateway mode — faster and more reliable than
   clicking through screens.
7. **Reach for `inject(fn)` for presentation-only DOM changes** — e.g.
   rendering a design mockup of an un-built component on a real screen (see
   `render-mockups-spay-113.mjs`). Don't use it to bypass real behavior under
   test.

## When not to use web-driver

- **Running the e2e suite.** Use `npm run test:e2e` (Playwright Test under
  `tests/e2e/`). Those specs produce assertions and reports; the driver
  produces observations and screenshots.
- **Anything mobile-only or OCR-only.** Reach for phone-harness instead.
- **Tasks that only need the API.** Call the API directly. `curl` or `fetch`
  is cheaper than booting a browser.

## Example scripts in this repo

- `scripts/render-mockups-spay-113.mjs` — regenerates all 16 Smart Split
  design PNGs using driver helpers. Run: `npm run mockups:spay-113`.
