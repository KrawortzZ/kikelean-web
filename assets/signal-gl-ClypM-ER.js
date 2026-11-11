const x=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,T=`
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
`;function g(o,n,e){const r=o.createShader(n);if(o.shaderSource(r,e),o.compileShader(r),!o.getShaderParameter(r,o.COMPILE_STATUS))throw new Error(o.getShaderInfoLog(r));return r}function F(o,n="calm"){const e=o.getContext("webgl",{premultipliedAlpha:!0,alpha:!0,antialias:!1});if(!e)return;const r=e.createProgram();e.attachShader(r,g(e,e.VERTEX_SHADER,x)),e.attachShader(r,g(e,e.FRAGMENT_SHADER,T)),e.linkProgram(r),e.useProgram(r);const v=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,v),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const s=e.getAttribLocation(r,"aPos");e.enableVertexAttribArray(s),e.vertexAttribPointer(s,2,e.FLOAT,!1,0,0);const p=e.getUniformLocation(r,"uRes"),w=e.getUniformLocation(r,"uTime"),A=e.getUniformLocation(r,"uBroken"),u=e.getUniformLocation(r,"uOrigin"),m=n==="broken";e.uniform1f(A,m?1:0);const c=matchMedia("(prefers-reduced-motion: reduce)").matches;let f=!0,l=0;function R(){const t=o.clientWidth<700;m?e.uniform2f(u,.5,t?.62:.58):e.uniform2f(u,t?.85:.72,.5)}function b(){const t=Math.min(window.devicePixelRatio,1.5),a=Math.max(1,Math.floor(o.clientWidth*t)),i=Math.max(1,Math.floor(o.clientHeight*t));(o.width!==a||o.height!==i)&&(o.width=a,o.height=i),e.viewport(0,0,a,i),e.uniform2f(p,a,i),R(),h(performance.now())}function h(t){e.uniform1f(w,c?2:t/1e3),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)}function d(t){h(t),f&&!c&&(l=requestAnimationFrame(d))}new ResizeObserver(b).observe(o),new IntersectionObserver(([t])=>{f=t.isIntersecting,cancelAnimationFrame(l),f&&!c&&(l=requestAnimationFrame(d))}).observe(o)}export{F as initSignal};
