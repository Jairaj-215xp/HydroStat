// HydroStat Local Development Server (Zero-Dependency)
// Serves static assets, emulates Netlify redirects (/@*), and handles serverless Netlify Functions locally.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 1. Populate process.env from .env if present
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

// 2. Ensure js/env.js is generated with public client config
try {
  require('./generate-env.js');
} catch (e) {
  console.warn('[Dev Server] Note on env generation:', e.message);
}

// 3. Load Netlify Functions
const geminiFunc = require('../netlify/functions/gemini');
const newsFunc = require('../netlify/functions/news');

const PORT = parseInt(process.env.PORT, 10) || 8888;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

async function handleFunctionCall(handler, req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body: body || null,
      queryStringParameters: queryParams
    };

    try {
      const result = await handler(event, {});
      res.writeHead(result.statusCode || 200, result.headers || {});
      res.end(result.body || '');
    } catch (err) {
      console.error('[Function Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Serverless Execution Error' }));
    }
  });
}

function serveStaticFile(filePath, res) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Route Netlify Serverless Functions
  if (pathname === '/.netlify/functions/gemini') {
    return handleFunctionCall(geminiFunc.handler, req, res);
  }
  if (pathname === '/.netlify/functions/news') {
    return handleFunctionCall(newsFunc.handler, req, res);
  }

  // 2. Handle Netlify rewrite rule for @handles (/@* -> /profile.html?handle=*)
  if (pathname.startsWith('/@')) {
    const handle = pathname.substring(2);
    // Rewrite internally to profile.html
    const profilePath = path.join(ROOT_DIR, 'profile.html');
    return serveStaticFile(profilePath, res);
  }

  // 3. Static File Serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Security: prevent directory traversal
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      const indexPath = path.join(safePath, 'index.html');
      return serveStaticFile(indexPath, res);
    }
    serveStaticFile(safePath, res);
  });
});

server.listen(PORT, () => {
  console.log('\n======================================================');
  console.log('  🚀 HYDROSTAT LOCAL DEVELOPMENT SERVER RUNNING');
  console.log('======================================================');
  console.log(`  > Local URL:       http://localhost:${PORT}`);
  console.log(`  > Static Root:     ${ROOT_DIR}`);
  console.log(`  > Functions Emulated:`);
  console.log(`      - POST http://localhost:${PORT}/.netlify/functions/gemini`);
  console.log(`      - GET  http://localhost:${PORT}/.netlify/functions/news`);
  console.log(`  > Redirects Active:`);
  console.log(`      - http://localhost:${PORT}/@<handle> -> profile.html`);
  console.log('======================================================\n');
  console.log('Press Ctrl+C to stop the server.\n');
});
