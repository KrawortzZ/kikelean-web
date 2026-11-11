// Visor 3D del Tótem en T: se puede girar arrastrando o con los botones.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cardTexture, dotTexture } from './hero-gl.js';

const VIOLET = new THREE.Color('#b26bff');
const CYAN = new THREE.Color('#22d3ee');

function chipTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1030';
  ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b26bff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  [18, 32, 46].forEach((r) => { ctx.beginPath(); ctx.arc(46, 64, r, -0.9, 0.9); ctx.stroke(); });
  ctx.fillStyle = '#f5f0ff'; ctx.font = '700 22px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('NFC', 64, 112);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initModel(canvas, { left, right } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 1.1, 7.4);
  camera.lookAt(0, -0.1, 0);

  const l1 = new THREE.PointLight(VIOLET, 16, 12); l1.position.set(-2.5, 2, 2.5);
  const l2 = new THREE.PointLight(CYAN, 8, 12); l2.position.set(2.8, -0.5, -2);
  scene.add(l1, l2);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: VIOLET, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(4.4, 4.4, 1);
  halo.position.set(0, 0, -1.6);
  scene.add(halo);

  // Sombra suave en el piso
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ map: dotTexture(), color: '#7c3aed', transparent: true, opacity: 0.55, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.36;
  scene.add(floor);

  const totem = new THREE.Group();
  scene.add(totem);

  const acrylic = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ede4ff'), roughness: 0.04, transparent: true, opacity: 0.22,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false,
  });

  // Panel vertical (A6 = 15,5 × 10 cm, proporción respetada)
  const W = 1.55, H = 2.4, D = 0.1;
  const panel = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.05), acrylic);
  panel.renderOrder = 2;
  panel.position.y = 0.0;
  totem.add(panel);
  const edgeMat = new THREE.LineBasicMaterial({ color: '#d8b4fe', transparent: true, opacity: 0.6 });
  totem.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), edgeMat));

  // Impresión: frente y reverso
  const tex = cardTexture();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.14, H - 0.16), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.14, roughness: 0.6 }));
  front.position.z = 0.012;
  totem.add(front);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.012;
  totem.add(back);

  // Chip NFC (sticker) visible al girarlo, detrás de la impresión
  const chip = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ map: chipTexture() }));
  chip.position.set(0, -0.48, -0.03);
  chip.rotation.y = Math.PI;
  totem.add(chip);

  // Base en T: barra horizontal con ranura donde encaja el panel
  const foot = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.14, 0.9, 3, 0.05), acrylic.clone());
  foot.material.opacity = 0.38;
  foot.position.y = -H / 2 - 0.07;
  totem.add(foot);
  const footEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.0, 0.14, 0.9)), edgeMat);
  footEdges.position.copy(foot.position);
  totem.add(footEdges);

  totem.position.y = 0.08;

  /* ---------- Interacción: arrastrar para girar ---------- */
  let rotY = -0.5, velY = 0, rotX = 0.05;
  let dragging = false, lastX = 0, lastY = 0, idleSince = performance.now();

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    start();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.012;
    rotY += velY;
    rotX = THREE.MathUtils.clamp(rotX + dy * 0.004, -0.25, 0.35);
  });
  const end = () => { dragging = false; idleSince = performance.now(); canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  let target = null; // giro animado por botones
  const turn = (dir) => { target = rotY + dir * Math.PI / 2; idleSince = performance.now(); start(); };
  left?.addEventListener('click', () => turn(-1));
  right?.addEventListener('click', () => turn(1));

  /* ---------- Bucle ---------- */
  const clock = new THREE.Clock();
  let running = false, visible = true;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const idle = !dragging && target === null && performance.now() - idleSince > 1800;

    if (target !== null) {
      rotY += (target - rotY) * Math.min(1, dt * 7);
      if (Math.abs(target - rotY) < 0.002) { rotY = target; target = null; idleSince = performance.now(); }
    } else if (!dragging) {
      velY *= Math.exp(-dt * 4);
      rotY += velY;
      if (idle && !reduceMotion) rotY += dt * 0.35;
    }
    totem.rotation.y = rotY;
    totem.rotation.x += (rotX - totem.rotation.x) * 0.15;

    renderer.render(scene, camera);
    const moving = dragging || target !== null || Math.abs(velY) > 0.0005 || (!reduceMotion);
    running = visible && moving;
    if (running) requestAnimationFrame(frame);
  }

  function start() {
    if (running || !visible) return;
    running = true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  document.fonts?.ready.then(() => renderer.render(scene, camera));
  resize();
  start();
  return true;
}
