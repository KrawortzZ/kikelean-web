// Compila el sitio para GitHub Pages y lo sube a la rama gh-pages.
// Uso: npm run deploy
import { execSync, execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const git = (args, cwd = '.') => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

const remote = git(['remote', 'get-url', 'origin']);
let helper = '';
try { helper = git(['config', '--local', '--get-all', 'credential.https://github.com.helper']).split('\n').pop(); } catch {}

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, BASE_PATH: '/kikelean-web/' } });
writeFileSync('dist/.nojekyll', '');
rmSync('dist/.git', { recursive: true, force: true });

git(['init', '-q', '-b', 'gh-pages'], 'dist');
git(['add', '-A'], 'dist');
git(['-c', 'user.name=Enrique Salamanca', '-c', 'user.email=kike1509.es@gmail.com', 'commit', '-q', '-m', 'Publicar sitio'], 'dist');
const cred = helper ? ['-c', 'credential.https://github.com.helper=', '-c', `credential.https://github.com.helper=${helper}`] : [];
git([...cred, 'push', '-q', '-f', remote, 'gh-pages'], 'dist');
console.log('Publicado en https://krawortzz.github.io/kikelean-web/');
