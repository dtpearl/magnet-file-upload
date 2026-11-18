// Shows what a browser would receive differently from theme/snippets versus the
// frozen custom-liquid blocks, per target, as a unified diff of rendered output.
// This is the porting aid named in custom-liquid/PORTING-LOG.md: once snippets
// move on, it is the change to carry into the pasted blocks.
//
//   npm run drift                          print to the terminal
//   npm run drift -- --out ../dist/x.diff  write to a file instead
//   npm run drift -- square cart           only these targets
//
// Both sides are rendered against the same fixtures, then put into one
// canonical layout so the diff is about tokens, not formatting: whitespace runs
// collapse to a space, every tag and every JS/CSS statement gets its own line,
// and the same intentional differences verify-parity.mjs ignores are ignored
// here (HTML and CSS comments, version stamps, quote style, trailing commas).
//
// CSS is diffed once, as the target "styles", not per page: the product page
// carries the replacement page's rules too since the stylesheets were merged,
// and per-page CSS diffs would report that on every run. The pages are diffed
// without their <style> blocks, except the standalone cart snippet.
//
// The diff itself comes from `git diff --no-index`, which is already installed
// wherever this repo is, so no dependency is added.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TARGETS, STYLES, PAGE_TARGETS_WITH_OWN_CSS, noCss, stripComments, stripVersions } from './targets.mjs';

const ALL = { ...TARGETS, styles: STYLES };
const prepare = (name, s) =>
  name === 'styles' || PAGE_TARGETS_WITH_OWN_CSS.has(name) ? s : noCss(s);

// JS line comments go the way of HTML and CSS comments (stripComments handles
// those two): developer notes, not content. Once whitespace collapses, a line
// comment would otherwise swallow the statement after it. Anchored on what
// precedes the slashes so "https://" in a string survives.
const stripLineComments = s => s.replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1');

const canonical = s => stripLineComments(stripVersions(stripComments(s)))
  .replace(/'/g, '"')
  .replace(/,(?=\s*[}\]])/g, '')
  .replace(/\s+/g, ' ')
  // Spaces beside structural punctuation carry nothing: "<svg ... >" and
  // "function ()" are the same thing as "<svg ...>" and "function()".
  .replace(/ ?([<>(){};,]) ?/g, '$1')
  .replace(/>/g, '>\n')
  .replace(/</g, '\n<')
  .replace(/([;{}])/g, '$1\n')
  .split('\n').map(l => l.trim()).filter(Boolean).join('\n') + '\n';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx === -1 ? null : args[outIdx + 1];
const wanted = args.filter((a, i) => outIdx === -1 || (i !== outIdx && i !== outIdx + 1));
const names = wanted.length ? wanted : Object.keys(ALL);
for (const n of names) {
  if (!ALL[n]) { console.error(`unknown target "${n}". Try: ${Object.keys(ALL).join(', ')}`); process.exit(2); }
}

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'magnet-drift-'));
let report = '';
let drifted = 0;
try {
  for (const name of names) {
    const [now, before] = await Promise.all([ALL[name].now(), ALL[name].before()]);
    const a = path.join(tmp, `${name}.custom-liquid.html`);
    const b = path.join(tmp, `${name}.theme-snippets.html`);
    await fs.writeFile(a, canonical(prepare(name, before)));
    await fs.writeFile(b, canonical(prepare(name, now)));
    let diff = '';
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '--unified=3', a, b], { encoding: 'utf8' });
    } catch (e) {
      // exit 1 means "differences found", which is the point
      if (e.status !== 1) throw e;
      diff = e.stdout;
    }
    if (!diff) { report += `== ${name}: identical\n`; continue; }
    drifted++;
    // Paths inside the temp dir mean nothing to a reader; name the sides.
    diff = diff
      .replace(new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/', 'g'), '')
      .replace(/^--- .*custom-liquid\.html$/m, `--- custom-liquid (${name})`)
      .replace(/^\+\+\+ .*theme-snippets\.html$/m, `+++ theme/snippets (${name})`);
    const changed = (diff.match(/^[-+](?![-+]{2})/gm) || []).length;
    report += `== ${name}: ${changed} changed lines\n${diff}\n`;
  }
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const summary = drifted
  ? `${drifted} of ${names.length} target(s) differ from custom-liquid. Record each change in custom-liquid/PORTING-LOG.md.`
  : `all ${names.length} target(s) render identically to custom-liquid.`;

if (outFile) {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, report + summary + '\n');
  console.log(`wrote ${outFile}\n${summary}`);
} else {
  process.stdout.write(report);
  console.log(summary);
}
