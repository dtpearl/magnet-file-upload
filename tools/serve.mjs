// Dev server for theme/snippets. Renders on every request, so the loop is
// edit a .liquid, refresh the browser - no build, no upload, and no second
// copy of the markup to keep in sync (which is what test.html became).
//
//   npm run dev            then open http://127.0.0.1:8080
//   npm run dev -- --port 9000

import http from 'node:http';
import { ROUTES } from './render.mjs';

const portFlag = process.argv.indexOf('--port');
const PORT = portFlag === -1 ? 8080 : Number(process.argv[portFlag + 1]);
const HOST = '127.0.0.1';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const route = ROUTES[url.pathname.replace(/\/$/, '') || '/'];
  if (!route) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end(`No route ${url.pathname}\nTry: ${Object.keys(ROUTES).join(' ')}`);
  }
  try {
    // Fresh render per request; the import cache is bypassed by liquidjs
    // reading the file each time, so saved edits appear on refresh.
    const html = await route();
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(html);
  } catch (err) {
    // Liquid errors land here rather than as a blank page, which is the whole
    // point of rendering locally instead of guessing in the theme editor.
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Liquid render failed for ${url.pathname}\n\n${err.stack || err}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Liquid harness  http://${HOST}:${PORT}\n`);
  for (const r of Object.keys(ROUTES)) console.log(`    http://${HOST}:${PORT}${r}`);
  console.log('\n  Renders theme/snippets on each request. Ctrl-C to stop.\n');
});
