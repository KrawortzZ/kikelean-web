import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const VIOLET = new THREE.Color('#b26bff');
const CYAN = new THREE.Color('#22d3ee');
const CHIP = new THREE.Vector3(0, -0.42, 0.05); // donde va el chip NFC en el tótem

/* ---------- Texturas dibujadas en canvas ---------- */

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawQR(ctx, x, y, size) {
  const n = 21;
  const c = size / n;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = '#1a1030';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() > 0.52) ctx.fillRect(x + i * c, y + j * c, c, c);
  const finder = (fx, fy) => {
    ctx.fillStyle = '#faf7ff'; ctx.fillRect(fx - c, fy - c, c * 9, c * 9);
    ctx.fillStyle = '#1a1030'; ctx.fillRect(fx, fy, c * 7, c * 7);
    ctx.fillStyle = '#faf7ff'; ctx.fillRect(fx + c, fy + c, c * 5, c * 5);
    ctx.fillStyle = '#1a1030'; ctx.fillRect(fx + c * 2, fy + c * 2, c * 3, c * 3);
  };
  finder(x, y); finder(x + c * 14, y); finder(x, y + c * 14);
}

function cardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 820;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const draw = () => {
    ctx.fillStyle = '#faf7ff'; ctx.fillRect(0, 0, 600, 820);
    // logo del cliente (marcador)
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(300, 120, 58, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7c3aed'; ctx.font = '600 24px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Tu logo', 300, 128);
    ctx.fillStyle = '#1a1030'; ctx.font = '800 54px Unbounded, sans-serif';
    ctx.fillText('¡Califícanos!', 300, 270);
    ctx.fillStyle = '#a855f7';
    for (let i = 0; i < 5; i++) star(ctx, 160 + i * 70, 340, 28);
    // icono celular + ondas
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.roundRect(120, 470, 90, 160, 14); ctx.stroke();
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(225, 550, 40 + k * 32, -0.9, 0.9); ctx.stroke(); }
    drawQR(ctx, 340, 460, 180);
    ctx.fillStyle = '#4c3a70'; ctx.font = '500 26px "Space Grotesk", sans-serif';
    ctx.fillText('Acerca tu celular o escanea', 300, 740);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

function screenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 600;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    ctx.fillStyle = '#150c26'; ctx.fillRect(0, 0, 300, 600);
    ctx.fillStyle = '#faf7ff'; ctx.textAlign = 'center';
    ctx.font = '700 26px "Space Grotesk", sans-serif'; ctx.fillText('Tu negocio', 150, 200);
    ctx.font = '500 20px "Space Grotesk", sans-serif'; ctx.fillStyle = '#c4b5fd'; ctx.fillText('Deja tu reseña', 150, 236);
    ctx.fillStyle = '#b26bff';
    for (let i = 0; i < 5; i++) star(ctx, 70 + i * 40, 300, 16);
    ctx.fillStyle = '#b26bff'; ctx.beginPath(); ctx.roundRect(50, 380, 200, 52, 26); ctx.fill();
    ctx.fillStyle = '#0d0718'; ctx.font = '700 20px "Space Grotesk", sans-serif'; ctx.fillText('Publicar', 150, 413);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* ---------- Ondas NFC (shader) ---------- */

const ringVertex = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ringFragment = /* glsl */`
  uniform float uProgress;
  uniform float uStrength;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float width = 0.012 + 0.03 * uProgress;
    float band = smoothstep(width, 0.0, abs(d - uProgress));
    float fade = (1.0 - uProgress) * smoothstep(0.0, 0.08, uProgress);
    float a = band * fade * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/* ---------- Escena ---------- */

export function initHero(canvas, { onTouch, onDone } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0.25, 7.2);

  const violetLight = new THREE.PointLight(VIOLET, 18, 12);
  violetLight.position.set(-2.5, 1.5, 2.5);
  const cyanLight = new THREE.PointLight(CYAN, 10, 12);
  cyanLight.position.set(2.8, -1.2, 1.8);
  scene.add(violetLight, cyanLight);

  // Halo detrás del tótem
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: VIOLET, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(4.6, 4.6, 1);
  halo.position.set(0, 0, -1.2);
  scene.add(halo);

  // Tótem en T: panel de acrílico, impresión al centro y base
  const totem = new THREE.Group();
  scene.add(totem);

  const acrylic = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ede4ff'), metalness: 0, roughness: 0.04,
    transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.03,
    envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
  });
  const panelGeo = new RoundedBoxGeometry(1.7, 2.3, 0.09, 4, 0.06);
  const panel = new THREE.Mesh(panelGeo, acrylic);
  panel.renderOrder = 2;
  totem.add(panel);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 2.3, 0.09)), new THREE.LineBasicMaterial({ color: '#d8b4fe', transparent: true, opacity: 0.55 }));
  totem.add(edges);

  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 2.02), new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.12 }));
  card.position.z = 0.0;
  totem.add(card);
  card.material.emissiveMap = card.material.map;

  const base = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.12, 0.8, 3, 0.04), acrylic.clone());
  base.material.opacity = 0.35;
  base.position.y = -1.21;
  totem.add(base);

  // Ondas NFC
  const rings = [];
  const ringGroup = new THREE.Group();
  ringGroup.position.copy(CHIP);
  totem.add(ringGroup);
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: ringVertex, fragmentShader: ringFragment,
      uniforms: { uProgress: { value: 0 }, uStrength: { value: 0.4 }, uColor: { value: VIOLET.clone() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), mat);
    ring.position.z = 0.06 + i * 0.002;
    ring.renderOrder = 3;
    ringGroup.add(ring);
    rings.push({ mat, offset: i / 5 });
  }

  // Celular que hace el "toque"
  const phone = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.66, 1.3, 0.07, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: '#1b1430', metalness: 0.6, roughness: 0.25, clearcoat: 1 }));
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(), color: new THREE.Color(0.25, 0.25, 0.25) });
  screenMat.map.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.18), screenMat);
  screen.position.z = 0.037;
  phone.add(body, screen);
  phone.visible = false;
  scene.add(phone);

  // Partículas
  const count = 170;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.2 + Math.random() * 2.4;
    const th = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 4.4;
    pos.set([Math.cos(th) * r, y, Math.sin(th) * r - 0.6], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), color: '#c4b5fd', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(particles);

  /* ---------- Interacción ---------- */

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  canvas.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  canvas.addEventListener('click', () => api.tap());

  let tapStart = -1;
  let touched = false;
  let burst = 0;
  const TAP = { approach: 0.75, hold: 1.0, leave: 0.7 };
  const START = new THREE.Vector3(3.2, -0.9, 1.6);
  const touchPoint = () => totem.localToWorld(CHIP.clone().add(new THREE.Vector3(0.05, 0.1, 0.38)));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- Bucle ---------- */

  const clock = new THREE.Clock();
  let running = false;
  let visible = true;
  let elapsed = 0;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 7.6 : 6.3;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += reduceMotion ? 0 : dt;
    const t = elapsed;

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    totem.rotation.y = Math.sin(t * 0.45) * 0.32 + pointer.x * 0.35;
    totem.rotation.x = pointer.y * 0.12;
    totem.position.y = 0.32 + Math.sin(t * 0.9) * 0.05;
    particles.rotation.y = t * 0.04;

    // Toque del celular
    let phase = -1;
    if (tapStart >= 0) {
      const k = clock.elapsedTime - tapStart;
      const target = touchPoint();
      phone.visible = true;
      if (k < TAP.approach) {
        phase = 0;
        phone.position.lerpVectors(START, target, ease(k / TAP.approach));
        phone.rotation.set(0, -0.6 * (1 - ease(k / TAP.approach)), -0.25 * (1 - ease(k / TAP.approach)));
      } else if (k < TAP.approach + TAP.hold) {
        phase = 1;
        phone.position.copy(target);
        phone.rotation.set(0, 0, 0);
        if (!touched) { touched = true; burst = 1; onTouch?.(); }
      } else if (k < TAP.approach + TAP.hold + TAP.leave) {
        phase = 2;
        const u = ease((k - TAP.approach - TAP.hold) / TAP.leave);
        phone.position.lerpVectors(target, START, u);
        phone.rotation.set(0, -0.6 * u, -0.25 * u);
      } else {
        tapStart = -1; touched = false; phone.visible = false; onDone?.();
      }
    }
    const lit = phase === 1 ? 1 : phase === 2 ? 0.6 : 0.25;
    screenMat.color.setScalar(THREE.MathUtils.lerp(screenMat.color.r, lit, 0.15));

    burst *= Math.exp(-dt * 1.6);
    const speed = 0.28 + burst * 0.9;
    rings.forEach((r, i) => {
      r.offset = (r.offset + dt * speed) % 1;
      r.mat.uniforms.uProgress.value = reduceMotion && tapStart < 0 ? 0.2 + i * 0.15 : r.offset;
      r.mat.uniforms.uStrength.value = 0.38 + burst * 1.6;
      r.mat.uniforms.uColor.value.copy(VIOLET).lerp(CYAN, Math.min(1, burst * 1.2));
    });
    halo.material.opacity = 0.5 + burst * 0.35;

    renderer.render(scene, camera);
    const needsLoop = visible && (!reduceMotion || tapStart >= 0 || burst > 0.01);
    running = needsLoop;
    if (needsLoop) requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) start(); });

  resize();
  start();

  const api = {
    tap() {
      if (tapStart >= 0) return;
      tapStart = clock.elapsedTime;
      touched = false;
      start();
    },
  };
  return api;
}
