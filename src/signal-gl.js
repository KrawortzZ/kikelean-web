// Ondas NFC con WebGL puro (sin librerías).
// mode "calm": ondas suaves (Nosotros). mode "broken": señal cortada con interferencia (404).

const vertex = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const fragment = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uBroken;
uniform vec2 uOrigin;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  // interferencia horizontal en modo roto
  float row = floor(frag.y / 7.0);
  float glitch = (hash(vec2(row, floor(uTime * 9.0))) - 0.5) * step(0.86, hash(vec2(row * 0.3, floor(uTime * 3.0))));
  frag.x += glitch * 60.0 * uBroken;

  vec2 uv = (frag - uOrigin * uRes) / uRes.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  float waves = r * 9.0 - uTime * 0.9;
  float idx = floor(waves);
  float f = fract(waves);
  float line = smoothstep(0.0, 0.03, f) * smoothstep(0.1, 0.03, f);

  // arcos hacia la derecha, como el ícono NFC
  float arc = smoothstep(1.05, 0.75, abs(a));

  // en modo roto, los arcos se cortan en segmentos que parpadean
  float seg = floor(a * 7.0);
  float alive = step(0.55 * uBroken, hash(vec2(seg, idx + floor(uTime * 1.5) * uBroken)));

  float fade = exp(-r * 1.25) * smoothstep(0.02, 0.18, r);
  vec3 violet = vec3(0.698, 0.420, 1.0);
  vec3 cyan = vec3(0.133, 0.827, 0.933);
  vec3 col = mix(violet, cyan, clamp(r * 0.6 + uBroken * hash(vec2(seg, idx)) * 0.5, 0.0, 1.0));

  float alpha = line * arc * alive * fade * 0.85;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function initSignal(canvas, mode = 'calm') {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uBroken = gl.getUniformLocation(prog, 'uBroken');
  const uOrigin = gl.getUniformLocation(prog, 'uOrigin');

  const broken = mode === 'broken';
  gl.uniform1f(uBroken, broken ? 1 : 0);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  let raf = 0;

  function setOrigin() {
    const narrow = canvas.clientWidth < 700;
    // Nosotros: ondas salen desde la derecha; 404: desde el centro, detrás del número
    if (broken) gl.uniform2f(uOrigin, 0.5, narrow ? 0.62 : 0.58);
    else gl.uniform2f(uOrigin, narrow ? 0.85 : 0.72, 0.5);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    setOrigin();
    draw(performance.now());
  }

  function draw(now) {
    gl.uniform1f(uTime, reduceMotion ? 2.0 : now / 1000);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
  }).observe(canvas);
}
