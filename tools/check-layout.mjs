// Cross-viewport layout checks against the Liquid-rendered pages.
//
// Starts the dev server, drives the real upload pipeline (canvas-generated
// JPEGs pushed through the actual file input - nothing is uploaded anywhere),
// and asserts the things that were found broken on 2026-09-11 and fixed:
//
//   - no horizontal overflow at any width
//   - no touch target under 44px on a touch pointer
//   - the crop container is never crushed by flex in a short viewport
//   - the page behind an open modal cannot scroll
//   - footer buttons never wrap to multiple lines
//   - every thumbnail tile stays above the minimum width
//
//   npm run check
//
// Needs Chromium once:  npx playwright install chromium
// On Linux it also needs a few shared libraries. If you have root:
//     sudo npx playwright install-deps chromium
// If you do not, this works entirely in userspace and installs nothing
// system-wide:
//     npm run setup-libs

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8781;
const BASE = `http://127.0.0.1:${PORT}`;

// Point the dynamic linker at the userspace libraries from `npm run setup-libs`
// if they are there. Must happen before chromium.launch(), which spawns the
// browser as a child process and passes this environment down to it.
const HERE_ = path.dirname(fileURLToPath(import.meta.url));
const LIB_PATH = path.join(HERE_, '.chromium-libs', 'root', 'usr', 'lib', 'x86_64-linux-gnu');
const HAVE_LOCAL_LIBS = fs.existsSync(LIB_PATH);
if (HAVE_LOCAL_LIBS) {
  process.env.LD_LIBRARY_PATH = LIB_PATH +
    (process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : '');
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\n  playwright is not installed.\n    cd tools && npm install\n    npx playwright install chromium\n');
  process.exit(1);
}

const VIEWPORTS = [
  { n: '320  phone',            w: 320,  h: 568,  touch: true },
  { n: '375  phone',            w: 375,  h: 667,  touch: true },
  { n: '390  iPhone 14',        w: 390,  h: 844,  touch: true },
  { n: '430  phone large',      w: 430,  h: 932,  touch: true },
  { n: '667  phone landscape',  w: 667,  h: 375,  touch: true },
  { n: '844  phone landscape',  w: 844,  h: 390,  touch: true },
  { n: '768  tablet portrait',  w: 768,  h: 1024, touch: true },
  { n: '1024 tablet landscape', w: 1024, h: 768,  touch: true },
  { n: '1440 desktop',          w: 1440, h: 900,  touch: false },
  { n: '1920 desktop',          w: 1920, h: 1080, touch: false },
];

const MIN_TILE = { touch: 240, mouse: 190 };

const inject = (page, id, n) => page.evaluate(async ({ id, n }) => {
  const dt = new DataTransfer();
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 900;
    const x = c.getContext('2d');
    x.fillStyle = '#47b'; x.fillRect(0, 0, 1200, 900);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    dt.items.add(new File([b], `p${i + 1}.jpg`, { type: 'image/jpeg' }));
  }
  const inp = document.getElementById(id);
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles: true }));
}, { id, n });

const server = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), '--port', String(PORT)],
  { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGKILL'); } catch {} };
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(130); });

// wait for listen
for (let i = 0; i < 50; i++) {
  try { await fetch(BASE); break; } catch { await new Promise(r => setTimeout(r, 100)); }
}

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  stop();
  const libs = /error while loading shared libraries|libnspr4|libnss3|libasound/.test(String(err));
  console.error(`\n  Could not launch Chromium.\n${libs
    ? (HAVE_LOCAL_LIBS
        ? `  tools/.chromium-libs exists but a library is still missing:\n    ${String(err).split('\n').find(l => /libraries/.test(l)) || ''}\n  Try re-running:  npm run setup-libs\n`
        : '  Missing shared libraries. No root needed:\n    npm run setup-libs\n')
    : `  ${String(err).split('\n')[0]}\n    npx playwright install chromium\n`}`);
  process.exit(1);
}

let failures = 0;
const fail = (vp, msg) => { failures++; console.log(`    FAIL  ${vp}  ${msg}`); };

console.log('\n  Layout checks against the Liquid-rendered pages\n');
for (const variant of ['square', 'rectangle']) {
  console.log(`  /${variant}`);
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: v.w, height: v.h }, isMobile: v.touch, hasTouch: v.touch,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
    await page.goto(`${BASE}/${variant}`, { waitUntil: 'networkidle' });

    const id = await page.evaluate(() =>
      document.querySelector('.hidden-file-input').id);
    const modalId = await page.evaluate(() =>
      document.querySelector('.select-photos-modal').id);
    await page.evaluate(m => PhotoUploader.openModal(m), modalId);
    const count = variant === 'square' ? 9 : 6;
    await inject(page, id, count);
    await page.waitForFunction(
      n => document.querySelectorAll('.main-thumbnail-container .main-thumbnail').length === n,
      count, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(350);

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const grid = document.querySelector('.select-photos-modal.active .main-thumbnail-container');
      const tile = grid.querySelector('.main-thumbnail-img-container').getBoundingClientRect();
      const row = document.querySelector('.select-photos-modal.active .modal-footer-actions');
      const wrapped = [...row.children].filter(k => {
        const cs = getComputedStyle(k);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        return k.getBoundingClientRect().height > lh * 1.6 + pad;
      }).map(k => k.textContent.trim());
      const PROD = ['thumbnail-action-btn','close-btn','remove-all-files-btn','add-to-cart-btn',
                    'upload-btn','crop-button','confirm-cancel-btn','confirm-upload-btn'];
      const small = [];
      document.querySelectorAll('button').forEach(el => {
        if (el.offsetParent === null) return;
        const c = PROD.find(x => el.classList.contains(x)); if (!c) return;
        const b = el.getBoundingClientRect(); if (!b.width) return;
        if (b.height < 44 || b.width < 44) small.push(`${c} ${Math.round(b.width)}x${Math.round(b.height)}`);
      });
      return {
        overflowX: de.scrollWidth - de.clientWidth,
        tile: Math.round(tile.width),
        cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        wrapped, small: [...new Set(small)],
        touch: matchMedia('(hover: none)').matches,
      };
    });

    // scroll chaining: push the modal scroller to its end, then try the window
    const chained = await page.evaluate(async () => {
      const y0 = window.scrollY;
      const modal = document.querySelector('.select-photos-modal.active');
      const mc = modal.querySelector('.modal-content');
      const sc = modal.scrollHeight > modal.clientHeight ? modal
               : (mc.scrollHeight > mc.clientHeight ? mc : null);
      if (sc) sc.scrollTop = sc.scrollHeight;
      window.scrollTo(0, 500);
      await new Promise(r => setTimeout(r, 120));
      const moved = window.scrollY !== y0;
      window.scrollTo(0, y0);
      return moved;
    });

    // crop container must not be crushed by flex
    await page.evaluate(() => {
      const t = document.querySelector('.main-thumbnail-container .main-thumbnail');
      if (t) t.click();
    });
    await page.waitForTimeout(1200);
    const crop = await page.evaluate(() => {
      const cc = [...document.querySelectorAll('.crop-container')].find(e => e.offsetParent !== null);
      return cc ? Math.round(cc.getBoundingClientRect().height) : null;
    });

    const min = m.touch ? MIN_TILE.touch : MIN_TILE.mouse;
    let bad = false;
    if (m.overflowX > 0)          { fail(v.n, `horizontal overflow ${m.overflowX}px`); bad = true; }
    // 44px is a finger minimum, so only assert it where the pointer is coarse.
    // Under a mouse the pills are deliberately 32px and stay hidden until hover.
    if (m.touch && m.small.length) { fail(v.n, `touch targets under 44px: ${m.small.join(', ')}`); bad = true; }
    if (m.wrapped.length)         { fail(v.n, `footer buttons wrapped: ${m.wrapped.join(', ')}`); bad = true; }
    if (m.tile < min)             { fail(v.n, `tile ${m.tile}px below ${min}px minimum`); bad = true; }
    if (chained)                  { fail(v.n, 'page scrolled behind the open modal'); bad = true; }
    if (crop !== null && crop < 200) { fail(v.n, `crop container collapsed to ${crop}px`); bad = true; }
    if (errors.length)            { fail(v.n, `JS error: ${errors[0]}`); bad = true; }
    if (!bad) console.log(`    ok    ${v.n.padEnd(22)} ${m.cols} col  tile ${String(m.tile).padStart(3)}px  crop ${crop}px`);

    await ctx.close();
  }
}

await browser.close();
stop();
console.log(`\n  ${failures ? `${failures} FAILED` : 'all layout checks passed'}\n`);
process.exit(failures ? 1 : 0);
