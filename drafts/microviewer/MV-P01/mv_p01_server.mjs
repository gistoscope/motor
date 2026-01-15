import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import url from 'url';

const PORT = 4001;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8'
};

/**
 * Resolve the requested path within the public directory, defaulting to index.html.
 */
function resolveFilePath(requestUrl) {
  const parsed = new URL(requestUrl, `http://localhost:${PORT}`);
  let pathname = parsed.pathname;
  if (pathname === '/') {
    pathname = '/mv_p01_index.html';
  }
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    throw new Error('Attempt to access file outside of public directory.');
  }
  return filePath;
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = resolveFilePath(req.url);
    const ext = path.extname(filePath);
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    const message = error.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error';
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
  }
});

server.listen(PORT, () => {
  console.log(`MicroViewer server running at http://localhost:${PORT}`);
});
