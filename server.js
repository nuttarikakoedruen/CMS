/**
 * CMS – CTW : local save server (zero dependencies — plain Node http/fs)
 * -------------------------------------------------
 * Serves index.html over HTTP and, on every save-worthy
 * change made in the app, writes the updated state straight
 * back into index.html (between the DATA:START / DATA:END
 * markers) so the file on disk is always the latest version.
 *
 * Run:
 *   npm start        (or: node server.js)
 *   → open http://localhost:3000
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = __dirname;
const INDEX_PATH = path.join(ROOT, 'index.html');
const DATA_BLOCK_RE = /\/\* DATA:START[\s\S]*?DATA:END \*\//;
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, headers || {}));
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function handleSave(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) req.destroy(); // 10mb guard
  });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}');
      const { mPages, cPages, mNextId, cNextId, edNextId, acts } = payload;
      if (!Array.isArray(mPages) || !Array.isArray(cPages)) {
        return sendJson(res, 400, { ok: false, error: 'invalid payload: mPages/cPages must be arrays' });
      }

      const html = fs.readFileSync(INDEX_PATH, 'utf8');
      if (!DATA_BLOCK_RE.test(html)) {
        return sendJson(res, 500, { ok: false, error: 'DATA markers not found in index.html — file may have been hand-edited' });
      }

      const block = [
        '/* DATA:START -- persisted state; overwritten in place by POST /api/save, do not hand-edit the shape */',
        `let mPages = ${JSON.stringify(mPages)};`,
        `let cPages = ${JSON.stringify(cPages)};`,
        `let mNextId=${Number.isFinite(+mNextId) ? +mNextId : 1},cNextId=${Number.isFinite(+cNextId) ? +cNextId : 1},edNextId=${Number.isFinite(+edNextId) ? +edNextId : 1};`,
        `let acts=${JSON.stringify(Array.isArray(acts) ? acts : [])};`,
        '/* DATA:END */',
      ].join('\n');

      const updated = html.replace(DATA_BLOCK_RE, block);
      fs.writeFileSync(INDEX_PATH, updated, 'utf8');

      sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Save failed:', err);
      sendJson(res, 500, { ok: false, error: String((err && err.message) || err) });
    }
  });
}

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, reqPath));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/save') return handleSave(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  send(res, 405, 'Method not allowed');
});

server.listen(PORT, () => {
  console.log(`CMS – CTW running at http://localhost:${PORT}`);
  console.log(`Saving writes directly back to: ${INDEX_PATH}`);
});
