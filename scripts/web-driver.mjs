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
import { readFile, writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:4000';
const HEADLESS = process.env.HEADLESS !== '0';

/** Named viewport presets. Match common QA breakpoints. */
export const VIEWPORTS = {
  mobile:  { width: 430,  height: 900,  label: 'iPhone 14 Pro width (PWA)' },
  tablet:  { width: 820,  height: 1180, label: 'iPad portrait' },
  desktop: { width: 1440, height: 900,  label: 'laptop' },
};

function parseInitialViewport() {
  const raw = process.env.VIEWPORT ?? 'mobile';
  if (VIEWPORTS[raw]) return VIEWPORTS[raw];
  const [w, h] = raw.split('x').map((n) => parseInt(n, 10));
  if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
  return VIEWPORTS.mobile;
}

let _vp = parseInitialViewport();
let _browser;
let _context;
let _page;
let _requests = []; // ring buffer of observed requests
let _console = [];  // ring buffer of console entries
const _starts = new WeakMap(); // request → performance.now() for timing

async function ensure() {
  if (_page) return _page;
  _browser = await chromium.launch({ headless: HEADLESS });
  _context = await _browser.newContext({ viewport: { width: _vp.width, height: _vp.height }, locale: 'fa-IR' });
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
  const dy = direction === 'down' ? _vp.height * amount : direction === 'up' ? -_vp.height * amount : 0;
  const dx = direction === 'right' ? _vp.width * amount : direction === 'left' ? -_vp.width * amount : 0;
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

/** Resize the viewport. Pass a preset name ('mobile' | 'tablet' | 'desktop') or {width, height}. */
export async function viewport(preset) {
  const page = await ensure();
  const size = typeof preset === 'string' ? VIEWPORTS[preset] : preset;
  if (!size || !size.width || !size.height) {
    throw new Error(`viewport: unknown preset "${preset}". Try: mobile | tablet | desktop or { width, height }.`);
  }
  _vp = { width: size.width, height: size.height, label: size.label };
  await page.setViewportSize({ width: size.width, height: size.height });
  return { ..._vp };
}

/** Try to close any open dialog. Clicks a Close button if found, otherwise presses Escape. Returns number dismissed. */
export async function modal_sweep() {
  const page = await ensure();
  const dismissed = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll(
      '[role=dialog], [role=alertdialog], dialog[open]'
    )).filter((d) => {
      const r = d.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    let n = 0;
    for (const d of dialogs) {
      const close = d.querySelector(
        '[data-testid*="close" i], [aria-label*="close" i], button[aria-label="Close"], button.close'
      );
      if (close) { close.click(); n++; }
    }
    return n;
  });
  if (dismissed === 0) {
    await page.keyboard.press('Escape').catch(() => {});
  }
  return dismissed;
}

// --- state() — the "semantic state" the agent sees, matching Android shape --

const STATE_SCRIPT = () => {
  const vis = (el) => {
    const s = window.getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const text = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const bounds = (el) => {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  };
  const classify = (el) => {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (tag === 'button' || role === 'button') return 'button';
    if (tag === 'a' || role === 'link') return 'link';
    if (tag === 'input') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      return 'input';
    }
    if (tag === 'textarea') return 'input';
    if (tag === 'select' || role === 'combobox') return 'select';
    if (role === 'tab') return 'tab';
    if (role === 'menuitem') return 'menuitem';
    if (tag === 'img' || role === 'img') return 'image';
    const r = el.getBoundingClientRect();
    if (r.width / window.innerWidth > 0.6) return 'row';
    return 'unknown';
  };

  // --- modal detection ---
  const modalEl = Array.from(document.querySelectorAll(
    '[role=dialog][aria-modal="true"], [role=alertdialog], dialog[open]'
  )).find(vis) || null;
  const modal = modalEl
    ? (() => {
        const titleEl = modalEl.querySelector('[role=heading], h1, h2, h3');
        const btns = Array.from(modalEl.querySelectorAll('button, [role=button]'))
          .filter(vis)
          .slice(0, 6)
          .map((b) => ({
            label: text(b),
            testid: b.getAttribute('data-testid') || null,
          }));
        return {
          title: titleEl ? text(titleEl) : null,
          buttons: btns,
        };
      })()
    : null;

  const inModal = (el) => (modalEl ? modalEl.contains(el) : false);

  // --- top bar ---
  const header = document.querySelector('header, [role=banner]');
  const navTitleEl = header ? header.querySelector('h1, h2, [role=heading]') : null;
  const back = document.querySelector(
    '[data-testid*="back" i], [aria-label*="back" i], button[aria-label="Back"]'
  );
  const headerActions = header
    ? Array.from(header.querySelectorAll('button, [role=button], a')).filter(vis).slice(0, 6).map((a) => ({
        label: text(a),
        testid: a.getAttribute('data-testid') || null,
      }))
    : [];
  const top_bar = {
    title: navTitleEl ? text(navTitleEl) : (document.title || null),
    has_back: !!back && vis(back),
    actions: headerActions,
  };

  // --- interactives ---
  const interactiveSel = [
    'button', 'a[href]', 'input', 'textarea', 'select',
    '[role=button]', '[role=link]', '[role=tab]', '[role=menuitem]', '[role=checkbox]', '[role=radio]',
    '[data-testid]',
  ].join(',');
  const seenBounds = new Set();
  const interactives = [];
  for (const el of Array.from(document.querySelectorAll(interactiveSel))) {
    if (!vis(el)) continue;
    if (interactives.length >= 150) break;
    const [x, y, w, h] = bounds(el);
    const key = `${x},${y},${w},${h}`;
    if (seenBounds.has(key)) continue;
    seenBounds.add(key);
    const testid = el.getAttribute('data-testid') || null;
    const aria = el.getAttribute('aria-label') || null;
    const type = classify(el);
    if (type === 'unknown' && !testid) continue;
    interactives.push({
      type,
      id: testid,
      label: aria,
      text: text(el) || null,
      value: ('value' in el && el.value) ? String(el.value) : null,
      bounds: [x, y, w, h],
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      focused: document.activeElement === el,
      in_dialog: inModal(el),
    });
  }

  // --- visible non-interactive text ---
  const seenText = new Set();
  const visible_text = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (visible_text.length >= 80) break;
    const t = (node.nodeValue || '').trim();
    if (!t || t.length > 160) continue;
    const parent = node.parentElement;
    if (!parent || !vis(parent)) continue;
    if (parent.closest(interactiveSel)) continue;
    if (seenText.has(t)) continue;
    seenText.add(t);
    visible_text.push(t);
  }

  // --- focused element ---
  const fe = document.activeElement;
  const focused = fe && fe !== document.body
    ? {
        id: fe.getAttribute('data-testid') || null,
        tag: fe.tagName.toLowerCase(),
        text: text(fe) || null,
        value: ('value' in fe && fe.value) ? String(fe.value) : null,
        bounds: bounds(fe),
      }
    : null;

  // --- scroll position (document-level) ---
  const se = document.scrollingElement || document.documentElement;
  const scroll = {
    can_scroll_vertical: se.scrollHeight > se.clientHeight + 1,
    at_top: se.scrollTop <= 1,
    at_bottom: Math.abs(se.scrollTop + se.clientHeight - se.scrollHeight) <= 1,
    y: Math.round(se.scrollTop),
    max_y: Math.max(0, se.scrollHeight - se.clientHeight),
  };

  // --- selected tab ---
  const selTab = document.querySelector('[role=tab][aria-selected="true"]');
  const selected_tab = selTab ? text(selTab) : null;

  return {
    url: location.href,
    route: location.pathname,
    title: document.title,
    top_bar,
    visible_interactives: interactives,
    visible_text,
    modal,
    focused,
    scroll,
    selected_tab,
  };
};

/** Semantic state of the current page — the structured view a QA agent reads instead of the pixels. */
export async function state() {
  const page = await ensure();
  const base = await page.evaluate(STATE_SCRIPT);
  // Fingerprint: SHA-1 of sorted (interactive ids/labels/text) + first 10 visible_text lines.
  const idParts = base.visible_interactives.map((i) => (i.id || i.label || i.text || '').trim().toLowerCase()).filter(Boolean).sort();
  const textParts = base.visible_text.slice(0, 10).map((t) => t.trim().toLowerCase()).sort();
  const fpInput = `${base.route}|${idParts.join('|')}|${textParts.join('|')}|n=${base.visible_interactives.length}`;
  const screen_fingerprint = createHash('sha1').update(fpInput).digest('hex').slice(0, 12);
  return { ...base, viewport: { ..._vp }, screen_fingerprint };
}

/** Compute what changed between two states. Cheap fingerprint check first, then set diff on interactives. */
export function diff(prev, curr) {
  if (!prev) return { screen_changed: true, first: true };
  if (prev.screen_fingerprint === curr.screen_fingerprint) {
    return { screen_changed: false };
  }
  const key = (i) => i.id || i.label || i.text || '';
  const prevKeys = new Set(prev.visible_interactives.map(key).filter(Boolean));
  const currKeys = new Set(curr.visible_interactives.map(key).filter(Boolean));
  const added = [...currKeys].filter((k) => !prevKeys.has(k)).slice(0, 20);
  const removed = [...prevKeys].filter((k) => !currKeys.has(k)).slice(0, 20);
  const route_changed = prev.route !== curr.route;
  const modal_opened = !prev.modal && !!curr.modal;
  const modal_closed = !!prev.modal && !curr.modal;
  return { screen_changed: true, route_changed, modal_opened, modal_closed, added, removed };
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

// --- IPC dispatcher ----------------------------------------------------------
// Matches the Android driver protocol: cmd-N.json → resp-N.json, one op per cmd.
// Every response carries the current `state` plus a `delta` against the previous.

async function dispatchOp(cmd) {
  switch (cmd.op) {
    case 'open':             return { url: await open(cmd.path) };
    case 'tap_text':         await tap_text(cmd.query, cmd); return {};
    case 'tap_testid':       await tap_testid(cmd.testid, cmd); return {};
    case 'fill':             await fill(cmd.testid, cmd.value); return {};
    case 'type_text':        await type_text(cmd.text, cmd); return {};
    case 'press':            await press(cmd.key); return {};
    case 'scroll':           await scroll(cmd.direction, cmd.amount); return {};
    case 'wait_for_text':    return { found: await wait_for_text(cmd.query, cmd) };
    case 'wait_for_text_gone': return { gone: await wait_for_text_gone(cmd.query, cmd) };
    case 'screenshot':       return { path: await screenshot(cmd.path, cmd) };
    case 'theme':            await theme(cmd.mode, cmd); return {};
    case 'viewport':         return { viewport: await viewport(cmd.preset ?? cmd.size) };
    case 'modal_sweep':      return { dismissed: await modal_sweep() };
    case 'state':            return {}; // state is attached by the loop
    case 'screen':           return { nodes: await screen() };
    case 'find_text':        return { matches: await find_text(cmd.query, cmd) };
    case 'api':              return { result: await api(cmd.method, cmd.path, cmd.body) };
    case 'reset':            return { result: await reset() };
    case 'network':          return { requests: await network(cmd) };
    case 'clear_network':    await clear_network(); return {};
    case 'console_messages': return { messages: await console_messages(cmd) };
    case 'clear_console':    await clear_console(); return {};
    case 'url':              return { url: await url() };
    case 'inject':           throw new Error('inject is not available over IPC — requires in-process function');
    case 'batch':            return batch(cmd);
    default: throw new Error(`unknown op: ${cmd.op}`);
  }
}

async function batch(cmd) {
  const steps = Array.isArray(cmd.steps) ? cmd.steps : [];
  const stop = cmd.stop_on_failure !== false;
  const out = [];
  let failed = null;
  for (let i = 0; i < steps.length; i++) {
    const start = Date.now();
    try {
      const data = await dispatchOp(steps[i]);
      out.push({ ok: true, elapsed_ms: Date.now() - start, ...data });
    } catch (e) {
      const rec = { ok: false, elapsed_ms: Date.now() - start, reason: `${e.name}: ${e.message}` };
      out.push(rec);
      if (failed === null) failed = { index: i, reason: rec.reason };
      if (stop) break;
    }
  }
  return { steps: out, failed_index: failed };
}

/** Long-running IPC loop. Reads cmd-N.json files, writes resp-N.json files.
 *  Same protocol as qa-agent-mvp's Android driver, so orchestrators can treat
 *  the two drivers uniformly.  Set ipcDir with { ipcDir } or default to
 *  `<repo>/.qa-driver`.  Writes a `ready` file on boot; stops when `stop` appears. */
export async function serve({ ipcDir, pollMs = 150 } = {}) {
  const dir = ipcDir || resolve(ROOT, '.qa-driver');
  await mkdir(dir, { recursive: true });
  // Clear any stale ready/stop files and leftover cmd/resp pairs from a prior run.
  for (const f of ['ready', 'stop']) {
    try { await unlink(join(dir, f)); } catch {}
  }
  await writeFile(join(dir, 'ready'), String(process.pid));
  let seq = 0;
  let prev = null;
  // eslint-disable-next-line no-console
  console.error(`web-driver: IPC ready at ${dir} (pid ${process.pid})`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(join(dir, 'stop'))) {
      try { await unlink(join(dir, 'stop')); } catch {}
      break;
    }
    const cmdPath = join(dir, `cmd-${seq}.json`);
    if (!existsSync(cmdPath)) {
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    let resp;
    try {
      const cmd = JSON.parse(await readFile(cmdPath, 'utf8'));
      const data = await dispatchOp(cmd);
      const current = await state();
      const d = diff(prev, current);
      resp = { ok: true, ...data, delta: d };
      if (d.screen_changed) resp.state = current;
      prev = current;
    } catch (e) {
      resp = { ok: false, error: `${e.name}: ${e.message}` };
    }
    await writeFile(join(dir, `resp-${seq}.json`), JSON.stringify(resp));
    try { await unlink(cmdPath); } catch {}
    seq++;
  }
  try { await unlink(join(dir, 'ready')); } catch {}
  await close();
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
    network, clear_network, console_messages, clear_console,
    state, diff, viewport, modal_sweep, url, close,
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
  const serveArg = process.argv.find((a) => a === '--serve' || a.startsWith('--serve='));
  const task = serveArg
    ? serve({ ipcDir: serveArg.includes('=') ? serveArg.split('=')[1] : undefined })
    : runCli();
  task.catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
}
