#!/usr/bin/env node
// web-driver — phone-harness-ergonomics for the SegmentPay web app.
// A thin, uniform set of verbs on top of Playwright so an agent can drive the
// real app with short scripts instead of writing full Playwright specs.
//
// Two modes:
//
//   1. Heredoc CLI (one-shot):
//        node scripts/web-driver.mjs <<'JS'
//        // task: open the checkout and screenshot it
//        // step: open ORD-10001, shoot
//        await open('/checkout/ORD-10001');
//        await wait_for_text('تخصیص یافته');
//        await screenshot('shot.png');
//        JS
//
//   2. Importable module (long-running scripts):
//        import { open, screen, screenshot, close } from './scripts/web-driver.mjs';
//        await open('/checkout/x');
//        await close();
//
// Helpers mirror phone-harness vocabulary where it makes sense, substituting
// accessibility-tree + visible-text reads for OCR. See SKILL.md next to this
// file for the agent-facing doc.
//
// Env:
//   WEB_URL   — baseURL for the web app   (default http://localhost:5173)
//   API_URL   — baseURL for the API       (default http://localhost:4000)
//   HEADLESS  — set to 0 to run headed    (default 1)
//   VIEWPORT  — WxH, e.g. 430x900         (default 430x900)

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:4000';
const HEADLESS = process.env.HEADLESS !== '0';
const [vw, vh] = (process.env.VIEWPORT ?? '430x900').split('x').map((n) => parseInt(n, 10));

let _browser;
let _context;
let _page;
let _requests = []; // ring buffer of observed requests
let _console = [];  // ring buffer of console entries
const _starts = new WeakMap(); // request → performance.now() for timing

async function ensure() {
  if (_page) return _page;
  _browser = await chromium.launch({ headless: HEADLESS });
  _context = await _browser.newContext({ viewport: { width: vw, height: vh }, locale: 'fa-IR' });
  _page = await _context.newPage();
  _page.on('request', (req) => _starts.set(req, performance.now()));
  _page.on('requestfinished', async (req) => {
    const res = await req.response().catch(() => null);
    const t0 = _starts.get(req) ?? performance.now();
    _requests.push({
      method: req.method(),
      url: req.url(),
      status: res ? res.status() : 0,
      ok: res ? res.ok() : false,
      ms: Math.round(performance.now() - t0),
      resourceType: req.resourceType(),
    });
    if (_requests.length > 500) _requests.shift();
  });
  _page.on('requestfailed', (req) => {
    const t0 = _starts.get(req) ?? performance.now();
    _requests.push({
      method: req.method(),
      url: req.url(),
      status: 0,
      ok: false,
      ms: Math.round(performance.now() - t0),
      resourceType: req.resourceType(),
      failure: req.failure()?.errorText,
    });
    if (_requests.length > 500) _requests.shift();
  });
  _page.on('console', (msg) => {
    const loc = msg.location();
    _console.push({
      type: msg.type(),
      text: msg.text(),
      location: loc.url ? `${loc.url}:${loc.lineNumber ?? 0}` : undefined,
    });
    if (_console.length > 500) _console.shift();
  });
  _page.on('pageerror', (err) => {
    _console.push({ type: 'pageerror', text: err.message });
    if (_console.length > 500) _console.shift();
  });
  return _page;
}

/** Navigate to a path (relative to WEB) or a full URL. */
export async function open(path) {
  const page = await ensure();
  const url = /^https?:/i.test(path) ? path : WEB + path;
  await page.goto(url);
  return url;
}

/** Return visible text nodes as [{text, role, x, y, w, h, testid}]. */
export async function screen() {
  const page = await ensure();
  return await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const walk = (el) => {
      if (!(el instanceof Element)) return;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const text = (el.innerText || el.textContent || '').trim();
      if (text && text.length < 200 && !seen.has(el)) {
        // Only include leaf-ish nodes to avoid duplicated ancestor text.
        const hasElementChildren = [...el.children].some((c) => {
          const t = (c.innerText || c.textContent || '').trim();
          return t === text;
        });
        if (!hasElementChildren) {
          seen.add(el);
          out.push({
            text,
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            testid: el.getAttribute('data-testid') || undefined,
            x: Math.round(r.left),
            y: Math.round(r.top),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
      for (const c of el.children) walk(c);
    };
    walk(document.body);
    return out;
  });
}

/** Return matching screen nodes. */
export async function find_text(query, { exact = false } = {}) {
  const nodes = await screen();
  return nodes.filter((n) => (exact ? n.text === query : n.text.includes(query)));
}

/** Click the first visible element whose text matches. */
export async function tap_text(query, { exact = false, index = 0 } = {}) {
  const page = await ensure();
  const loc = exact ? page.getByText(query, { exact: true }) : page.getByText(query);
  await loc.nth(index).click({ timeout: 5_000 });
}

/** Click by data-testid. */
export async function tap_testid(testid, { index = 0 } = {}) {
  const page = await ensure();
  await page.getByTestId(testid).nth(index).click({ timeout: 5_000 });
}

/** Fill a data-testid input with a value (fires React-friendly events). */
export async function fill(testid, value) {
  const page = await ensure();
  await page.evaluate(
    ({ testid, value }) => {
      const el = document.querySelector(`input[data-testid="${testid}"], textarea[data-testid="${testid}"]`);
      if (!el) throw new Error(`fill: no input with data-testid="${testid}"`);
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { testid, value: String(value) },
  );
}

/** Type into the focused element. */
export async function type_text(text, { delay = 20 } = {}) {
  const page = await ensure();
  await page.keyboard.type(text, { delay });
}

/** Press a key: 'Enter', 'Tab', 'Control+a', etc. */
export async function press(key) {
  const page = await ensure();
  await page.keyboard.press(key);
}

/** Scroll the page by content direction: 'down' | 'up' | 'left' | 'right'. amount is 0..1 of viewport. */
export async function scroll(direction = 'down', amount = 0.6) {
  const page = await ensure();
  const dy = direction === 'down' ? vh * amount : direction === 'up' ? -vh * amount : 0;
  const dx = direction === 'right' ? vw * amount : direction === 'left' ? -vw * amount : 0;
  await page.mouse.wheel(dx, dy);
}

/** Wait for text to become visible; returns true/false. */
export async function wait_for_text(query, { timeout = 10_000, exact = false } = {}) {
  const page = await ensure();
  try {
    const loc = exact ? page.getByText(query, { exact: true }) : page.getByText(query);
    await loc.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Wait for text to disappear. */
export async function wait_for_text_gone(query, { timeout = 10_000 } = {}) {
  const page = await ensure();
  try {
    await page.getByText(query).first().waitFor({ state: 'hidden', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Take a full-page screenshot. `path` is relative to repo root unless absolute. Returns absolute path. */
export async function screenshot(path, { fullPage = true } = {}) {
  const page = await ensure();
  const out = isAbsolute(path) ? path : resolve(ROOT, path);
  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage });
  return out;
}

/** Hit the backend API. Returns parsed JSON. */
export async function api(method, path, body) {
  const url = /^https?:/i.test(path) ? path : API + path;
  const r = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${await r.text()}`);
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : r.text();
}

/** Call `POST /api/dev/reset` and wait for it. Convenience wrapper. */
export async function reset() {
  return api('POST', '/api/dev/reset');
}

/** Set the app theme ('light' | 'dark') and reload. Pass waitFor to pin a readiness check. */
export async function theme(mode, { waitFor } = {}) {
  const page = await ensure();
  await page.evaluate((m) => localStorage.setItem('segmentpay-theme', m), mode);
  await page.reload();
  if (waitFor) await wait_for_text(waitFor);
}

/** Escape hatch: run a function in the page. Args must be JSON-serializable. */
export async function inject(fn, ...args) {
  const page = await ensure();
  return page.evaluate(fn, ...args);
}

/** Observed network requests since the browser launched or last `clear_network()`.
 *  Optional filters: { url, method, failedOnly }. `url` is a substring match. */
export async function network({ url, method, failedOnly } = {}) {
  await ensure();
  return _requests.filter((r) => {
    if (url && !r.url.includes(url)) return false;
    if (method && r.method !== method.toUpperCase()) return false;
    if (failedOnly && r.ok) return false;
    return true;
  });
}

/** Clear the network buffer. Use before an action to capture "requests from this point". */
export async function clear_network() {
  _requests = [];
}

/** Console entries since the browser launched or last `clear_console()`.
 *  Optional filter: { type } e.g. 'error', 'warning', 'log', 'pageerror'. */
export async function console_messages({ type } = {}) {
  await ensure();
  return type ? _console.filter((m) => m.type === type) : _console.slice();
}

/** Clear the console buffer. */
export async function clear_console() {
  _console = [];
}

/** Current URL. */
export async function url() {
  const page = await ensure();
  return page.url();
}

/** Close the browser. Safe to omit — process exit will close it. */
export async function close() {
  if (_browser) {
    await _browser.close();
    _browser = _context = _page = undefined;
    _requests = [];
    _console = [];
  }
}

// --- CLI entry point ---------------------------------------------------------

async function runCli() {
  // Read the whole stdin as a script body.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8').trim();
  if (!body) {
    console.error('web-driver: no script on stdin. Usage: node scripts/web-driver.mjs <<\'JS\' ... JS');
    process.exit(2);
  }
  const helpers = {
    open, screen, find_text, tap_text, tap_testid, fill, type_text, press, scroll,
    wait_for_text, wait_for_text_gone, screenshot, api, reset, theme, inject,
    network, clear_network, console_messages, clear_console, url, close,
  };
  // Wrap the user body in an async IIFE and inject helpers via destructuring from `h`.
  const fn = new Function('h', `return (async () => {
    const {${Object.keys(helpers).join(',')}} = h;
    ${body}
  })();`);
  try {
    await fn(helpers);
  } finally {
    await close();
  }
}

// Only run CLI when invoked directly (not when imported).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  runCli().catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
}
