// Installs the shared libraries headless Chromium needs, without root.
//
// Playwright's own `install-deps` shells out to apt and needs sudo. This does
// the same job in userspace: `apt-get download` fetches .deb packages as a
// normal user, and `dpkg-deb -x` unpacks them into a local directory that
// check-layout.mjs points the dynamic linker at. Nothing is installed
// system-wide and nothing outside this folder is touched.
//
//   npm run setup-libs
//
// Only needed on Linux, only once, and only for `npm run check`.
// `npm run dev` and `npm run verify` do not use a browser at all.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LIB_DIR = path.join(HERE, '.chromium-libs');
export const LIB_PATH = path.join(LIB_DIR, 'root', 'usr', 'lib', 'x86_64-linux-gnu');

// libasound2 was renamed libasound2t64 in Ubuntu 24.04; try new name first.
const SETS = [
  ['libnspr4', 'libnss3', 'libasound2t64'],
  ['libnspr4', 'libnss3', 'libasound2'],
];

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });

if (process.platform !== 'linux') {
  console.log('  Not Linux - nothing to do. Chromium should run as installed.');
  process.exit(0);
}

for (const bin of ['apt-get', 'dpkg-deb']) {
  try { run('which', [bin]); }
  catch {
    console.error(`\n  Needs ${bin}, which is not on PATH.\n` +
      `  This script only works on Debian/Ubuntu. On another distro, install\n` +
      `  the equivalents of libnspr4, libnss3 and libasound2 however your\n` +
      `  package manager allows without root.\n`);
    process.exit(1);
  }
}

fs.rmSync(LIB_DIR, { recursive: true, force: true });
fs.mkdirSync(LIB_DIR, { recursive: true });

let downloaded = null;
for (const set of SETS) {
  try {
    console.log(`  Downloading ${set.join(', ')} ...`);
    run('apt-get', ['download', ...set], { cwd: LIB_DIR });
    downloaded = set;
    break;
  } catch (err) {
    console.log('    not available under those names, trying the older set');
  }
}
if (!downloaded) {
  console.error('\n  Could not download the packages. If this machine is offline,\n' +
                '  fetch them on another and unpack them into tools/.chromium-libs/root\n');
  process.exit(1);
}

for (const deb of fs.readdirSync(LIB_DIR).filter(f => f.endsWith('.deb'))) {
  run('dpkg-deb', ['-x', deb, 'root'], { cwd: LIB_DIR });
  fs.rmSync(path.join(LIB_DIR, deb));
}

if (!fs.existsSync(LIB_PATH)) {
  console.error(`\n  Unpacked, but ${LIB_PATH} is missing. Expected an amd64 system.\n`);
  process.exit(1);
}

const got = fs.readdirSync(LIB_PATH).filter(f => f.includes('.so')).length;
console.log(`\n  Done - ${got} libraries in tools/.chromium-libs (gitignored).`);
console.log('  npm run check will pick them up automatically.\n');
