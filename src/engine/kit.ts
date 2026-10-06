// Kit procedural: texturas en canvas, primitivas con sombras, luces de ambiente y bustos de sospechosos.
// ponytail: todo se genera en código (no hay Blender en esta máquina); si llegan modelos .glb, se cargan en scene.ts del caso.
import * as THREE from 'three';
import type { BustDef } from '../types';

let seed = 7;
export const reseed = (s: number) => { seed = s; };
export function rnd() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a: number, b: number) => a + rnd() * (b - a);

export function cv(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}

export function tex(c: HTMLCanvasElement, repeat?: [number, number], color = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return '#' + c.getHexString();
}

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, a = 0.08) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${a * rnd()})` : `rgba(255,255,255,${a * 0.6 * rnd()})`;
    const s = rr(1, 3);
    g.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

function stains(g: CanvasRenderingContext2D, w: number, h: number, n: number, col = '0,0,0', a = 0.12) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rr(20, 140);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a * rnd()})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// ---------- texturas ----------
export function woodTex(base = '#5a3a22', planks = 6, w = 512, h = 512) {
  const [c, g] = cv(w, h);
  const pw = w / planks;
  for (let p = 0; p < planks; p++) {
    g.fillStyle = shade(base, rr(-0.06, 0.05));
    g.fillRect(p * pw, 0, pw, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '20,10,4' : '255,220,170'},${rr(0.04, 0.14)})`;
      g.lineWidth = rr(0.6, 2.2);
      g.beginPath();
      const x0 = p * pw + rnd() * pw, f = rr(0.004, 0.02), a = rr(1, 5);
      for (let y = 0; y <= h; y += 8) g.lineTo(x0 + Math.sin(y * f + i) * a, y);
      g.stroke();
    }
    if (rnd() < 0.4) {
      const kx = p * pw + rr(8, pw - 8), ky = rnd() * h;
      g.fillStyle = 'rgba(30,15,5,.35)';
      g.beginPath(); g.ellipse(kx, ky, rr(3, 6), rr(6, 12), 0, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(10,5,0,.55)';
    g.fillRect(p * pw, 0, 1.5, h);
    // juntas transversales
    const cut = rnd() * h;
    g.fillRect(p * pw, cut, pw, 1.5);
  }
  speckle(g, w, h, 2500, 0.06);
  return c;
}

export function brickTex(base = '#6e3b2a', mortar = '#3b342d', w = 512, h = 512, soot = 0.5) {
  const [c, g] = cv(w, h);
  g.fillStyle = mortar; g.fillRect(0, 0, w, h);
  const bh = 32, bw = 64;
  for (let r = 0; r < h / bh; r++)
    for (let k = -1; k < w / bw + 1; k++) {
      const x = k * bw + (r % 2) * bw / 2;
      g.fillStyle = shade(base, rr(-0.09, 0.07));
      g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      g.fillStyle = `rgba(0,0,0,${rr(0, 0.15)})`;
      g.fillRect(x + 2, r * bh + bh - 7, bw - 4, 5);
    }
  speckle(g, w, h, 6000, 0.12);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, `rgba(10,8,6,${soot})`); gr.addColorStop(0.5, 'rgba(10,8,6,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return c;
}

export function cobbleTex(base = '#4a4844', w = 512, h = 512) {
  const [c, g] = cv(w, h);
  g.fillStyle = '#1d1b19'; g.fillRect(0, 0, w, h);
  const s = 38;
  for (let y = 0; y < h + s; y += s * 0.8)
    for (let x = ((y / s) % 2) * s * 0.5 - s; x < w + s; x += s) {
      g.fillStyle = shade(base, rr(-0.1, 0.06));
      g.beginPath();
      g.ellipse(x + rr(-3, 3), y + rr(-3, 3), s * rr(0.4, 0.48), s * rr(0.32, 0.4), rr(-0.3, 0.3), 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.beginPath(); g.ellipse(x - 4, y - 5, s * 0.22, s * 0.12, 0, 0, 7); g.fill();
    }
  speckle(g, w, h, 3000, 0.1);
  return c;
}

export function wallpaperTex(bg = '#3c2a22', fg = '#5a4030', kind: 'damasco' | 'raya' = 'damasco', w = 512, h = 512) {
  const [c, g] = cv(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (kind === 'raya') {
    for (let x = 0; x < w; x += 64) { g.fillStyle = fg; g.fillRect(x, 0, 22, h); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 28, 0, 3, h); }
  } else {
    g.fillStyle = fg;
    for (let y = 0; y < h; y += 128)
      for (let x = (y / 128) % 2 ? 64 : 0; x < w + 64; x += 128) {
        g.save(); g.translate(x, y + 64);
        for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(0, 18, 7, 18, 0, 0, 7); g.fill(); }
        g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
        g.beginPath(); g.ellipse(0, -46, 4, 10, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(0, 46, 4, 10, 0, 0, 7); g.fill();
        g.restore();
      }
  }
  stains(g, w, h, 10, '20,10,0', 0.18);
  speckle(g, w, h, 3000, 0.05);
  return c;
}

export function plasterTex(base = '#b9ad98', w = 512, h = 512, dirt = 0.15) {
  const [c, g] = cv(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  stains(g, w, h, 30, '60,45,30', dirt);
  stains(g, w, h, 10, '255,250,240', 0.08);
  speckle(g, w, h, 8000, 0.07);
  return c;
}

export function stoneTex(base = '#6d6a64', w = 512, h = 512, blocks = true) {
  const [c, g] = cv(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  if (blocks) {
    const bh = 64;
    for (let r = 0; r < h / bh; r++)
      for (let x = (r % 2) * -60; x < w; x += rr(90, 150)) {
        g.fillStyle = shade(base, rr(-0.08, 0.06));
        g.fillRect(x + 3, r * bh + 3, 140, bh - 6);
      }
  }
  stains(g, w, h, 40, '20,25,20', 0.2);
  speckle(g, w, h, 12000, 0.12);
  return c;
}

export function concreteTex(base = '#8e8b86', w = 512, h = 512) {
  const [c, g] = cv(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  stains(g, w, h, 40, '40,40,40', 0.08);
  speckle(g, w, h, 14000, 0.05);
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5;
  g.strokeRect(0, 0, w, h);
  return c;
}

export function tileTex(a = '#d8d2c4', b = '#2b2622', n = 8, w = 512) {
  const [c, g] = cv(w, w);
  const s = w / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = shade((x + y) % 2 ? a : b, rr(-0.03, 0.03));
    g.fillRect(x * s, y * s, s, s);
  }
  g.strokeStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  stains(g, w, w, 12, '40,30,20', 0.15);
  return c;
}

export function gradientTex(stops: [number, string][], w = 4, h = 256) {
  const [c, g] = cv(w, h);
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return c;
}

export interface TextOpts { w?: number; h?: number; bg?: string; color?: string; font?: string; size?: number; pad?: number; align?: CanvasTextAlign; line?: number; ruled?: boolean; aged?: boolean }
export function textTex(text: string, o: TextOpts = {}) {
  const w = o.w ?? 512, h = o.h ?? 512, size = o.size ?? 28, pad = o.pad ?? 36;
  const [c, g] = cv(w, h);
  g.fillStyle = o.bg ?? '#e8dec8'; g.fillRect(0, 0, w, h);
  if (o.aged !== false && (o.bg ?? '#e8dec8').startsWith('#e')) { stains(g, w, h, 8, '120,80,30', 0.16); speckle(g, w, h, 1500, 0.05); }
  if (o.ruled) { g.strokeStyle = 'rgba(60,80,140,.25)'; for (let y = pad + size; y < h; y += size * (o.line ?? 1.35)) { g.beginPath(); g.moveTo(0, y + 6); g.lineTo(w, y + 6); g.stroke(); } }
  g.fillStyle = o.color ?? '#231c16';
  g.font = `${size}px ${o.font ?? '"Courier Prime", monospace'}`;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = 'alphabetic';
  const x = g.textAlign === 'center' ? w / 2 : pad;
  let y = pad + size;
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width > w - pad * 2 && line) { g.fillText(line, x, y); y += size * (o.line ?? 1.35); line = word; }
      else line = t;
    }
    g.fillText(line, x, y); y += size * (o.line ?? 1.35);
  }
  return c;
}

// ---------- materiales y primitivas ----------
export interface MatOpts { r?: number; m?: number; map?: THREE.Texture | null; e?: string | number; ei?: number; op?: number; side?: THREE.Side; bump?: THREE.Texture; bs?: number; env?: number }
export function mat(color: string | number, o: MatOpts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, map: o.map ?? null,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.op !== undefined, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide,
    bumpMap: o.bump ?? null, bumpScale: o.bs ?? 1, envMapIntensity: o.env ?? 1,
  });
}
/** Marca oculta que solo aparece con luz ultravioleta en el modo inspección. */
export function uvMark<T extends THREE.Object3D>(o: T): T { o.userData.uv = true; o.visible = false; o.layers.set(1); return o; }
export const glow = (color: string | number, op = 1) => new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, toneMapped: false });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, cast = true) {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = cast; o.receiveShadow = true;
  return o;
}
export const box = (w: number, h: number, d: number, m: THREE.Material) => mesh(new THREE.BoxGeometry(w, h, d), m);
export const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 24, open = false) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m);
export const sph = (r: number, m: THREE.Material, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.66 | 0)), m);
export const tor = (r: number, t: number, m: THREE.Material, arc = Math.PI * 2) => mesh(new THREE.TorusGeometry(r, t, 10, 32, arc), m);
export const plane = (w: number, h: number, m: THREE.Material) => mesh(new THREE.PlaneGeometry(w, h), m, false);

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0, parent?: THREE.Object3D): T {
  o.position.set(x, y, z); o.rotation.y = ry;
  parent?.add(o);
  return o;
}
export function group(parent?: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0) {
  return at(new THREE.Group(), x, y, z, ry, parent);
}

/** Habitación cerrada: suelo, techo y 4 paredes mirando hacia dentro. */
export function room(parent: THREE.Object3D, o: { x: number; z: number; w: number; d: number; h: number; floor: THREE.Material; wall: THREE.Material | THREE.Material[]; ceil?: THREE.Material }) {
  const g = group(parent, o.x, 0, o.z);
  const f = plane(o.w, o.d, o.floor); f.rotation.x = -Math.PI / 2; g.add(f); f.receiveShadow = true;
  if (o.ceil) { const c = plane(o.w, o.d, o.ceil); c.rotation.x = Math.PI / 2; c.position.y = o.h; g.add(c); }
  const walls = Array.isArray(o.wall) ? o.wall : [o.wall, o.wall, o.wall, o.wall];
  const defs: [number, number, number, number, number][] = [
    [0, o.h / 2, -o.d / 2, 0, o.w], [0, o.h / 2, o.d / 2, Math.PI, o.w],
    [-o.w / 2, o.h / 2, 0, Math.PI / 2, o.d], [o.w / 2, o.h / 2, 0, -Math.PI / 2, o.d],
  ];
  defs.forEach(([x, y, z, ry, len], i) => { const p = plane(len, o.h, walls[i]); p.receiveShadow = true; at(p, x, y, z, ry, g); });
  return g;
}

/** Fija repeat a una textura clonada para que la escala del material encaje con la superficie. */
export function tiled(c: HTMLCanvasElement, rx: number, ry: number, o: MatOpts & { color?: string } = {}) {
  const t = tex(c, [rx, ry]);
  return mat(o.color ?? '#ffffff', { ...o, map: t, bump: o.bs ? t : undefined });
}

// ---------- atmósfera ----------
let softDot: THREE.Texture | null = null;
export function dotTex() {
  if (softDot) return softDot;
  const [c, g] = cv(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (softDot = tex(c));
}

/** Polvo en suspensión dentro de una caja; devuelve update(t). */
export function dust(parent: THREE.Object3D, center: THREE.Vector3, size: THREE.Vector3, n = 300, color = '#ffe6b8', s = 0.025, op = 0.55) {
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base[i * 3] = center.x + (rnd() - 0.5) * size.x;
    base[i * 3 + 1] = center.y + (rnd() - 0.5) * size.y;
    base[i * 3 + 2] = center.z + (rnd() - 0.5) * size.z;
  }
  pos.set(base);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: s, map: dotTex(), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.layers.set(1);
  parent.add(p);
  return (t: number) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + i) * 0.12;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + i * 1.7) * 0.15;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.7) * 0.12;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** Lluvia con segmentos; devuelve update(dt). */
export function rain(parent: THREE.Object3D, center: THREE.Vector3, size: THREE.Vector3, n = 1500, wind = 0.15, color = '#9fb3c8', op = 0.35, len = 0.35) {
  const pos = new Float32Array(n * 6), spd = new Float32Array(n);
  const reset = (i: number, top = false) => {
    const x = center.x + (rnd() - 0.5) * size.x, z = center.z + (rnd() - 0.5) * size.z;
    const y = top ? center.y + size.y / 2 : center.y + (rnd() - 0.5) * size.y;
    pos.set([x, y, z, x - wind * len, y - len, z], i * 6);
    spd[i] = rr(9, 13);
  };
  for (let i = 0; i < n; i++) reset(i);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  l.frustumCulled = false;
  l.layers.set(1);
  parent.add(l);
  const floor = center.y - size.y / 2;
  return (dt: number) => {
    for (let i = 0; i < n; i++) {
      const d = spd[i] * dt;
      pos[i * 6 + 1] -= d; pos[i * 6 + 4] -= d; pos[i * 6] -= d * wind; pos[i * 6 + 3] -= d * wind;
      if (pos[i * 6 + 4] < floor) reset(i, true);
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** Cono de luz volumétrico falso (aditivo). */
export function lightCone(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r: number, color = '#ffd9a0', op = 0.12) {
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(0.02, r, len, 32, 1, true);
  geo.translate(0, -len / 2, 0);
  // alfa que se desvanece hacia la base y en los bordes (silueta), para que parezca volumen y no una cuña.
  // Los clamp no son decorativos: pow() de un negativo da NaN, y el bloom lo convierte en pantalla negra.
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, op: { value: op } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float op; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float along = pow(clamp(vUv.y, 0., 1.), 1.6); float edge = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0., 1.), 2.); gl_FragColor = vec4(color * op * along * edge, 1.); }`,
  });
  const o = new THREE.Mesh(geo, m);
  o.position.copy(from);
  o.lookAt(to); o.rotateX(-Math.PI / 2);
  o.layers.set(1);
  parent.add(o);
  return o;
}

/** Decal plano sobre el suelo (sangre, tiza, charcos). */
export function decal(parent: THREE.Object3D, c: HTMLCanvasElement, w: number, d: number, x: number, y: number, z: number, o: MatOpts = {}) {
  const m = mat('#ffffff', { map: tex(c), op: 1, r: o.r ?? 0.9, m: o.m });
  m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -2;
  const p = plane(w, d, m); p.rotation.x = -Math.PI / 2; p.receiveShadow = true;
  return at(p, x, y, z, 0, parent);
}

export function bloodTex(w = 256) {
  const [c, g] = cv(w, w);
  g.fillStyle = 'rgba(70,6,6,.92)';
  const blob = (x: number, y: number, r: number) => { g.beginPath(); for (let a = 0; a < 7; a += 0.35) g.lineTo(x + Math.cos(a) * r * rr(0.75, 1.2), y + Math.sin(a) * r * rr(0.75, 1.2)); g.fill(); };
  blob(w / 2, w / 2, w * 0.28);
  for (let i = 0; i < 9; i++) blob(w / 2 + rr(-0.35, 0.35) * w, w / 2 + rr(-0.35, 0.35) * w, w * rr(0.02, 0.07));
  g.fillStyle = 'rgba(140,20,15,.35)'; blob(w / 2 - 10, w / 2 - 10, w * 0.12);
  return c;
}

export function chalkTex(w = 512, h = 1024) {
  const [c, g] = cv(w, h);
  g.strokeStyle = 'rgba(235,232,220,.92)'; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
  const pts = [[256, 70], [320, 110], [330, 190], [300, 240], [420, 300], [470, 430], [430, 440], [360, 340], [330, 360], [340, 560], [390, 760], [400, 940], [350, 950], [300, 760], [262, 600], [230, 760], [200, 950], [150, 940], [170, 760], [190, 560], [190, 360], [140, 330], [70, 250], [90, 230], [190, 250], [200, 190], [190, 110]];
  g.beginPath(); pts.forEach(([x, y], i) => { const jx = x + rr(-4, 4), jy = y + rr(-4, 4); i ? g.lineTo(jx, jy) : g.moveTo(jx, jy); }); g.closePath(); g.stroke();
  g.globalAlpha = 0.3; g.lineWidth = 3; g.stroke();
  return c;
}

// ---------- bustos ----------
export function bust(b: BustDef) {
  const g = new THREE.Group();
  const skin = mat(b.skin, { r: 0.55 }), hair = mat(b.hair, { r: 0.9 }), coat = mat(b.coat, { r: 0.85 });
  const dark = mat('#1a1410', { r: 0.4 }), white = mat('#ece6da', { r: 0.7 });
  const torso = sph(0.5, coat, 32); torso.scale.set(1.15, 0.62, 0.62); at(torso, 0, 0.02, 0, 0, g);
  at(cyl(0.11, 0.12, 0.3, skin), 0, 0.42, 0, 0, g);
  const head = sph(0.3, skin, 40); head.scale.set(0.88, 1.08, 0.95); at(head, 0, 0.82, 0, 0, g);
  const jaw = sph(0.24, skin, 32); jaw.scale.set(0.95, 0.75, 0.95); at(jaw, 0, 0.7, 0.03, 0, g);
  for (const s of [-1, 1]) {
    const ear = sph(0.065, skin); ear.scale.set(0.5, 1, 0.8); at(ear, s * 0.265, 0.82, -0.01, 0, g);
    at(sph(0.028, dark), s * 0.095, 0.86, 0.255, 0, g);
    const brow = box(0.1, 0.022, 0.03, hair); brow.rotation.z = s * -0.12; at(brow, s * 0.1, 0.925, 0.26, 0, g);
    if (b.glasses) {
      const rim = tor(0.058, 0.008, mat('#b08d57', { m: 1, r: 0.3 })); at(rim, s * 0.1, 0.86, 0.275, 0, g);
    }
    if (b.earrings) at(sph(0.02, mat('#d4af37', { m: 1, r: 0.2 })), s * 0.27, 0.74, 0, 0, g);
  }
  if (b.glasses) at(box(0.06, 0.008, 0.008, mat('#b08d57', { m: 1, r: 0.3 })), 0, 0.87, 0.28, 0, g);
  const nose = box(0.055, 0.11, 0.07, skin); nose.rotation.x = -0.15; at(nose, 0, 0.8, 0.28, 0, g);
  at(box(0.11, 0.018, 0.03, mat('#8a4b3e', { r: 0.6 })), 0, 0.695, 0.255, 0, g);

  // pelo
  const cap = (scaleY = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); m.scale.set(0.9, 1.05 * scaleY, 1); m.castShadow = true; return at(m, 0, 0.84, -0.015, 0, g); };
  if (b.style === 'calvo') { const r = tor(0.25, 0.05, hair, Math.PI); r.rotation.set(Math.PI / 2, 0, Math.PI); at(r, 0, 0.8, -0.02, 0, g); }
  else if (b.style === 'rizado') { cap(); for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, el = rr(0.15, 1.2); at(sph(rr(0.06, 0.09), hair, 12), Math.cos(a) * Math.cos(el) * 0.27, 0.86 + Math.sin(el) * 0.27, Math.sin(a) * Math.cos(el) * 0.26 - 0.03, 0, g); } }
  else {
    cap();
    if (b.style === 'raya') { const p = box(0.012, 0.01, 0.2, skin); at(p, 0.08, 1.16, 0.06, 0, g); }
    if (b.style === 'mono') at(sph(0.11, hair), 0, 1.06, -0.22, 0, g);
    if (b.style === 'largo') { const back = box(0.5, 0.55, 0.12, hair); at(back, 0, 0.7, -0.2, 0, g); for (const s of [-1, 1]) at(box(0.1, 0.45, 0.16, hair), s * 0.25, 0.72, -0.02, 0, g); }
  }
  // barba
  if (b.beard === 'bigote' || b.beard === 'barba') { const m = box(0.16, 0.035, 0.04, hair); at(m, 0, 0.725, 0.265, 0, g); }
  if (b.beard === 'barba') { const be = sph(0.235, hair, 24); be.scale.set(0.98, 0.58, 0.9); at(be, 0, 0.6, 0.05, 0, g); }
  if (b.beard === 'patillas') for (const s of [-1, 1]) at(box(0.05, 0.2, 0.12, hair), s * 0.23, 0.74, 0.07, 0, g);
  // sombrero
  const hatM = mat(b.hat === 'cofia' ? '#f1ece2' : '#1b1715', { r: 0.7 });
  if (b.hat === 'bombin') { at(sph(0.3, hatM), 0, 1.0, -0.02, 0, g).scale.set(0.95, 0.72, 1); at(cyl(0.42, 0.42, 0.02, hatM, 32), 0, 0.98, -0.02, 0, g); }
  if (b.hat === 'chistera') { at(cyl(0.27, 0.25, 0.42, hatM, 32), 0, 1.22, -0.02, 0, g); at(cyl(0.42, 0.42, 0.02, hatM, 32), 0, 1.01, -0.02, 0, g); at(cyl(0.255, 0.255, 0.06, mat('#3a1010', { r: 0.6 }), 32), 0, 1.06, -0.02, 0, g); }
  if (b.hat === 'boina') { const h = sph(0.33, hatM); h.scale.set(1, 0.32, 1); h.rotation.z = 0.15; at(h, 0.03, 1.1, -0.02, 0, g); }
  if (b.hat === 'gorra') { const h = sph(0.33, mat('#4b4238', { r: 0.95 })); h.scale.set(1, 0.42, 1.05); at(h, 0, 1.12, -0.03, 0, g); const v = box(0.34, 0.02, 0.14, mat('#3c342c', { r: 0.95 })); v.rotation.x = -0.15; at(v, 0, 1.1, 0.27, 0, g); }
  if (b.hat === 'cofia') { const h = tor(0.2, 0.05, hatM); h.rotation.x = Math.PI / 2 - 0.4; at(h, 0, 1.1, -0.05, 0, g); }
  // cuello y ropa
  if (b.collar === 'corbata' || b.collar === 'pajarita' || b.collar === 'cuello') {
    const shirt = box(0.22, 0.2, 0.05, white); at(shirt, 0, 0.27, 0.3, 0, g);
    for (const s of [-1, 1]) { const lap = box(0.12, 0.26, 0.04, coat); lap.rotation.z = s * 0.35; at(lap, s * 0.12, 0.24, 0.31, 0, g); }
    if (b.collar === 'corbata') at(box(0.06, 0.2, 0.03, mat('#5a1515', { r: 0.6 })), 0, 0.26, 0.335, 0, g);
    if (b.collar === 'pajarita') for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), mat('#141414', { r: 0.5 })); c.rotation.z = s * Math.PI / 2; at(c, s * 0.04, 0.34, 0.33, 0, g); }
  }
  if (b.collar === 'jersey') { const t = tor(0.13, 0.05, mat(shade(b.coat, -0.05))); t.rotation.x = Math.PI / 2; at(t, 0, 0.33, 0, 0, g); }
  if (b.collar === 'chal') { const t = tor(0.36, 0.09, mat('#5b4a3c', { r: 0.95 })); t.rotation.x = Math.PI / 2 - 0.15; t.scale.set(1.1, 0.7, 1); at(t, 0, 0.27, 0.02, 0, g); }
  if (b.collar === 'bata') { at(box(0.26, 0.24, 0.05, white), 0, 0.25, 0.31, 0, g); for (const s of [-1, 1]) { const l = box(0.14, 0.3, 0.05, mat('#ffffff', { r: 0.6 })); l.rotation.z = s * 0.4; at(l, s * 0.13, 0.22, 0.32, 0, g); } }
  return g;
}
