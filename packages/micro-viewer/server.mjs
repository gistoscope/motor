import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, 'public');
const port = 4001;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
]);

function safeJoin(base, target) {
  const targetPath = normalize(target).replace(/^\/+/, '');
  const resolvedPath = join(base, targetPath);
  const baseWithSep = base.endsWith(sep) ? base : base + sep;
  if (resolvedPath !== base && !resolvedPath.startsWith(baseWithSep)) {
    return null;
  }
  return resolvedPath;
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url ? req.url.split('?')[0] : '/';
    const target = url === '/' ? '/index.html' : url;
    const filePath = safeJoin(publicDir, target);

    if (!filePath) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let stream;
    try {
      stream = createReadStream(filePath);
    } catch (error) {
      stream = createReadStream(join(publicDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      stream.pipe(res);
      return;
    }

    const ext = extname(filePath);
    const headers = {};
    if (contentTypes.has(ext)) {
      headers['Content-Type'] = contentTypes.get(ext);
    }
    res.writeHead(200, headers);
    stream.on('error', () => {
      res.writeHead(404).end('Not Found');
    });
    stream.pipe(res);
  } catch (error) {
    res.writeHead(500).end('Internal Server Error');
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`micro-viewer running at http://localhost:${port}`);
});
