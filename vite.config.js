import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
// En GitHub Pages el sitio vive en /kikelean-web/ (lo define el workflow con BASE_PATH).
const base = process.env.BASE_PATH || '/';
const read = (...p) => readFileSync(resolve(root, ...p), 'utf8');

// Inserta el header y el footer compartidos en cada página (<!--#header--> / <!--#footer-->).
function partials() {
  return {
    name: 'kikelean-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html
          .replace('<!--#header-->', read('partials', 'header.html'))
          .replace('<!--#footer-->', read('partials', 'footer.html'))
          // enlaces internos <a href="/..."> respetan la base del sitio
          .replace(/(<a\b[^>]*?\bhref=")\/(?!\/)/g, `$1${base}`),
    },
  };
}

// ¿La URL pide una página HTML que no existe en la carpeta dada?
function isMissingPage(url, base) {
  const path = decodeURIComponent((url || '/').split('?')[0].split('#')[0]);
  if (path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/')) return false;
  const last = path.split('/').pop();
  if (last.includes('.') && !last.endsWith('.html')) return false; // assets: los maneja Vite
  let file = path.endsWith('/') ? path + 'index.html' : path;
  if (!file.endsWith('.html')) file += '.html';
  return !existsSync(resolve(base, '.' + file));
}

// Sirve 404.html con estado 404 en `npm run dev` y `npm run preview`.
function notFoundPage() {
  return {
    name: 'kikelean-404',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'GET' || !req.headers.accept?.includes('text/html')) return next();
          if (!isMissingPage(req.url, root)) return next();
          const html = await server.transformIndexHtml('/404.html', read('404.html'));
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        });
      };
    },
    configurePreviewServer(server) {
      const dist = resolve(root, 'dist');
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || !req.headers.accept?.includes('text/html')) return next();
        if (!isMissingPage(req.url, dist)) return next();
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(resolve(dist, '404.html')));
      });
    },
  };
}

export default defineConfig({
  base,
  appType: 'mpa',
  plugins: [partials(), notFoundPage()],
  build: {
    rollupOptions: {
      input: {
        inicio: resolve(root, 'index.html'),
        nosotros: resolve(root, 'nosotros.html'),
        legal: resolve(root, 'legal.html'),
        noEncontrada: resolve(root, '404.html'),
      },
    },
  },
});
