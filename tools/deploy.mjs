// Pushes this project's five snippets to a Shopify theme.
//
//   npm run deploy                    pick a theme from a list (safest)
//   npm run deploy -- --theme 12345   push to a theme by id or name
//   npm run deploy -- --live          push to the PUBLISHED theme (asks first)
//   npm run deploy -- --print         show the command, run nothing
//
// Two flags are fixed and not overridable:
//
//   --only      limits the upload to our five snippets. This matters more than
//               it looks: a bare `theme push` uploads the whole local directory
//               over the remote theme, and this directory holds only snippets,
//               so without --only it would wipe every template, section and
//               asset in the theme.
//   --nodelete  never removes remote files that are absent locally.
//
// `shopify theme push` expects a directory matching Shopify's theme structure.
// theme/ here holds only snippets/, which may or may not satisfy that check. If
// it complains, pull a full theme somewhere outside this repo and point at it:
//
//   shopify theme pull --store your-store.myshopify.com   (in ~/shopify-themes)
//   then add "themePath": "/home/you/shopify-themes/your-theme"
//   to tools/.deploy-config.json
//
// The script copies the snippets in before pushing, so the checkout never needs
// editing by hand and can be deleted and re-pulled whenever.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_THEME = path.join(HERE, '..', 'theme');
const CONFIG = path.join(HERE, '.deploy-config.json');

const FILES = [
  'snippets/photo-upload.liquid',
  'snippets/photo-upload-styles.liquid',
  'snippets/photo-upload-core.liquid',
  'snippets/photo-upload-replacement.liquid',
  'snippets/cart-quantity-control.liquid',
];

const argv = process.argv.slice(2);
const flag = n => argv.includes(`--${n}`);
const val = n => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1]; };

const cfg = fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, 'utf8')) : {};
const store = process.env.SHOPIFY_STORE || cfg.store;
if (!store) {
  console.error(`\n  No store configured. Create tools/.deploy-config.json:\n\n` +
    `    { "store": "your-store.myshopify.com" }\n\n` +
    `  (gitignored). Or set SHOPIFY_STORE in your environment.\n`);
  process.exit(1);
}

// Push from a full theme checkout if one is configured, otherwise from theme/.
let pushPath = REPO_THEME;
if (cfg.themePath) {
  pushPath = cfg.themePath;
  if (!fs.existsSync(pushPath)) {
    console.error(`\n  themePath does not exist: ${pushPath}\n`);
    process.exit(1);
  }
  for (const f of FILES) {
    const dest = path.join(pushPath, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(REPO_THEME, f), dest);
  }
  console.log(`\n  synced ${FILES.length} snippets into ${pushPath}`);
}

for (const f of FILES) {
  if (!fs.existsSync(path.join(REPO_THEME, f))) {
    console.error(`\n  Missing ${f} under theme/.\n`);
    process.exit(1);
  }
}

const args = ['theme', 'push', '--path', pushPath, '--store', store, '--nodelete'];
for (const f of FILES) args.push('--only', f);
if (flag('live')) args.push('--live', '--allow-live');
else if (val('theme')) args.push('--theme', val('theme'));

console.log(`\n  store  : ${store}`);
console.log(`  from   : ${pushPath}`);
console.log(`  target : ${flag('live') ? 'PUBLISHED THEME' : val('theme') ? `theme ${val('theme')}` : 'you will be prompted'}`);
FILES.forEach(f => console.log(`           ${f}`));
console.log(`\n  shopify ${args.join(' ')}\n`);

if (flag('print')) process.exit(0);

if (flag('live')) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question('  This overwrites snippets on the LIVE theme. Type "live" to confirm: ');
  rl.close();
  if (a.trim() !== 'live') { console.log('  Cancelled.\n'); process.exit(0); }
}

spawn('shopify', args, { stdio: 'inherit' }).on('exit', c => process.exit(c ?? 1));
