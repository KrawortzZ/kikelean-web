import './styles.css';

// Menú móvil
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
if (toggle && menu) {
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
}

// Página actual en el menú
const here = location.pathname.replace(/\/$/, '/index.html');
document.querySelectorAll('.nav a:not(.btn)').forEach((a) => {
  const target = new URL(a.href);
  if (!target.hash && target.pathname === here) a.setAttribute('aria-current', 'page');
});

// Año del footer
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// WebGL: tótem 3D del inicio (three.js se carga solo donde se usa)
const stage = document.querySelector('[data-hero]');
if (stage) {
  import('./hero-gl.js').then(({ initHero }) => {
    const status = stage.querySelector('[data-tap-status]');
    const hero = initHero(stage.querySelector('canvas'), {
      onTouch: () => { status.textContent = 'Abriendo tus reseñas…'; },
      onDone: () => { status.textContent = ''; },
    });
    if (!hero) { stage.classList.add('no-webgl'); return; }
    stage.querySelector('[data-tap]').addEventListener('click', () => hero.tap());
  }).catch(() => stage.classList.add('no-webgl'));
}

// WebGL: ondas NFC de fondo (nosotros y 404)
document.querySelectorAll('[data-signal]').forEach((canvas) => {
  import('./signal-gl.js').then(({ initSignal }) => initSignal(canvas, canvas.dataset.signal));
});
