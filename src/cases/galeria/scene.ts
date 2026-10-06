// Caso 03 · Galería Ítaca, Madrid 2025. Sala blanca con instalación de espejos y neón, barra del catering,
// despacho, almacén climatizado, cuarto de seguridad con monitores y guardarropa.
import * as THREE from 'three';
import type { World } from '../../types';
import {
  box, cyl, sph, tor, plane, mat, glow, at, group, room, tiled, tex, cv, textTex, woodTex, concreteTex,
  plasterTex, tileTex, dust, decal, chalkTex, rnd,
} from '../../engine/kit';

function art(seed: number, w = 512, h = 640) {
  const [c, g] = cv(w, h);
  const pals = [['#e9e2d0', '#d6452f', '#1d2a44', '#e7b23a'], ['#101418', '#2f6db5', '#e8e4da', '#c23b58'], ['#d9cbb0', '#3a5a40', '#1a1a1a', '#e07a3c'], ['#f1ede4', '#111111', '#b22b2b', '#8aa1b1']];
  const p = pals[seed % pals.length];
  g.fillStyle = p[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) { g.fillStyle = p[1 + (i % 3)]; g.globalAlpha = 0.85; const x = rnd() * w, y = rnd() * h, s = 60 + rnd() * 220; if (rnd() < 0.5) { g.beginPath(); g.arc(x, y, s / 2, 0, 7); g.fill(); } else g.fillRect(x - s / 2, y - s / 3, s, s * 0.6); }
  // ojo cerrado, el motivo de «Lo que no ves»
  g.globalAlpha = 1; g.strokeStyle = p[2]; g.lineWidth = 10; g.beginPath(); g.ellipse(w / 2, h * 0.55, w * 0.28, h * 0.08, 0, 0, Math.PI); g.stroke();
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(w / 2 + i * 40, h * 0.55 + Math.cos(i * 0.35) * h * 0.07); g.lineTo(w / 2 + i * 48, h * 0.55 + h * 0.12); g.stroke(); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  return c;
}

function neon(text: string, color: string, w = 1024, h = 200) {
  const [c, g] = cv(w, h);
  g.font = 'italic 500 120px "Bodoni Moda"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 30; g.strokeStyle = color; g.lineWidth = 6;
  g.strokeText(text, w / 2, h / 2); g.shadowBlur = 10; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.strokeText(text, w / 2, h / 2);
  return c;
}

function screen(lines: string[], o: { bg?: string; color?: string; w?: number; h?: number; size?: number; noise?: boolean } = {}) {
  const w = o.w ?? 512, h = o.h ?? 320;
  const [c, g] = cv(w, h);
  g.fillStyle = o.bg ?? '#06120c'; g.fillRect(0, 0, w, h);
  if (o.noise) for (let i = 0; i < 9000; i++) { const v = Math.random() * 90; g.fillStyle = `rgba(${v},${v + 20},${v},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = o.color ?? '#7dffa0'; g.font = `${o.size ?? 20}px "Courier Prime"`;
  lines.forEach((l, i) => g.fillText(l, 16, 34 + i * (o.size ?? 20) * 1.4));
  for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 1); }
  return c;
}

function cityTex() {
  const [c, g] = cv(1024, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0a0f1c'); gr.addColorStop(1, '#2a2030'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let x = 0; x < 1024;) { const bw = 40 + rnd() * 90, bh = 120 + rnd() * 260; g.fillStyle = '#0c0d12'; g.fillRect(x, 512 - bh, bw, bh); for (let y = 512 - bh + 10; y < 500; y += 16) for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (rnd() < 0.35) { g.fillStyle = rnd() < 0.8 ? '#ffcf7a' : '#bfe0ff'; g.fillRect(wx, y, 6, 8); } x += bw + 4; }
  for (let i = 0; i < 40; i++) { const x = rnd() * 1024, y = 380 + rnd() * 130, r = 6 + rnd() * 18; const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(255,190,120,.6)'); b.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, r * 2, r * 2); }
  return c;
}

export function build(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c0c0e');
  scene.fog = new THREE.FogExp2('#0e0d10', 0.03);
  const clues: Record<string, THREE.Object3D> = {};
  const clue = (id: string, o: THREE.Object3D) => { clues[id] = o; return o; };
  const updates: ((t: number, dt: number) => void)[] = [];
  const white = tiled(plasterTex('#cfccc5', 512, 512, 0.04), 3, 1, { r: 0.92 });
  const concrete = tiled(concreteTex('#8f8c88'), 4, 4, { r: 0.28, m: 0.05 });
  const black = mat('#141416', { r: 0.4 });
  const steel = mat('#b8bcc0', { m: 1, r: 0.25 });
  const walnut = mat('#ffffff', { map: tex(woodTex('#4a2c1a', 3)), r: 0.45 });
  const paperM = (c: HTMLCanvasElement) => mat('#ffffff', { map: tex(c), r: 0.9 });
  const scr = (c: HTMLCanvasElement, k = 0.85) => new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(k, k, k) });

  // ================= SALA PRINCIPAL =================
  const hall = group(scene);
  room(hall, { x: 0, z: -6, w: 14, d: 12, h: 4.6, floor: concrete, wall: white, ceil: mat('#1a1a1c', { r: 0.8 }) });
  // carriles de luz
  for (const z of [-2.5, -6, -9.5]) { at(box(12, 0.06, 0.08, black), 0, 4.45, z, 0, hall); at(box(10, 0.04, 0.12, glow('#8a8478')), 0, 4.5, z, 0, hall); }
  const ambient = new THREE.HemisphereLight('#c8ccd8', '#3a3630', 0.3); scene.add(ambient);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, -8.5], [3, -8.5]]) { const p = new THREE.PointLight('#fff1e0', 3.2, 10, 1.5); p.position.set(x, 4.2, z); scene.add(p); }
  // cuadros con focos
  const paintings: [number, number, number, number, number][] = [[-6.96, 2.0, -3.5, Math.PI / 2, 1.6], [-6.96, 2.0, -7.5, Math.PI / 2, 1.3], [0, 2.2, -11.96, 0, 0]];
  paintings.forEach(([x, y, z, ry, s], i) => {
    if (!s) return;
    const fr = group(hall, x, y, z, ry);
    at(box(1.3 * s, 1.6 * s, 0.05, black), 0, 0, 0.0, 0, fr);
    at(plane(1.2 * s, 1.5 * s, mat('#ffffff', { map: tex(art(i + 1)), r: 0.75 })), 0, 0, 0.03, 0, fr);
    const sp = new THREE.SpotLight('#fff1dc', 60, 9, 0.32, 0.45, 1.4); sp.castShadow = i === 0;
    sp.position.set(x + Math.sin(ry) * 2.6, 4.3, z + Math.cos(ry) * 2.6); sp.target.position.set(x, y, z); scene.add(sp, sp.target);
  });
  // neón del fondo
  const sign = plane(7, 1.36, new THREE.MeshBasicMaterial({ map: tex(neon('Lo que no ves', '#ff3d7f')), transparent: true, toneMapped: false, color: new THREE.Color(2.2, 2.2, 2.2) }));
  at(sign, 0, 3.4, -11.9, 0, hall);
  const neonL = new THREE.PointLight('#ff3d7f', 14, 12, 1.4); neonL.position.set(0, 3.2, -11.2); scene.add(neonL);
  updates.push(t => { const f = Math.sin(t * 31) > 0.97 ? 0.4 : 1; (sign.material as THREE.MeshBasicMaterial).opacity = f; neonL.intensity = 14 * f; });
  const ring = tor(0.9, 0.03, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.6), toneMapped: false })); at(ring, 4.2, 2.0, -11.9, 0, hall);
  // instalación de espejos
  const mirror = new THREE.MeshStandardMaterial({ color: '#c8d0da', metalness: 1, roughness: 0.04, envMapIntensity: 0.9 });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05, r = 0.5 + i * 0.22;
    const m = group(hall, -2.6 + Math.cos(a) * r, 0, -6.2 + Math.sin(a) * r, a + 0.4);
    at(box(0.9, 2.6, 0.04, mirror), 0, 1.4, 0, 0, m);
    at(box(0.95, 0.05, 0.3, black), 0, 0.03, 0, 0, m);
  }
  // pedestales con pájaros de bronce
  const bronze = mat('#7a5a32', { m: 1, r: 0.35 });
  for (const [x, z] of [[-4.6, -9.6], [4.4, -1.8]]) {
    const ped = group(hall, x, 0, z);
    at(box(0.5, 1.1, 0.5, white), 0, 0.55, 0, 0, ped);
    const bird = sph(0.1, bronze); bird.scale.set(1.6, 0.8, 0.8); at(bird, 0, 1.2, 0, 0, ped);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), bronze); bk.rotation.z = -Math.PI / 2; at(bk, 0.2, 1.22, 0, 0, ped);
  }
  // atril
  const lect = group(hall, -4.2, 0, -7.6, 0.6);
  at(box(0.5, 1.15, 0.4, black), 0, 0.58, 0, 0, lect);
  const lt = box(0.6, 0.04, 0.45, black); lt.rotation.x = -0.35; at(lt, 0, 1.22, 0.05, 0, lect);
  at(cyl(0.008, 0.008, 0.35, steel), 0, 1.38, 0.1, 0, lect).rotation.x = -0.6;
  // mesas altas con copas
  const flute = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 0.9, thickness: 0.01, transparent: true, opacity: 0.6 });
  for (const [x, z] of [[-2.6, -3.2], [2.9, -9.2]]) {
    const tb = group(hall, x, 0, z);
    at(cyl(0.35, 0.35, 0.03, mat('#f4f2ee', { r: 0.3 }), 32), 0, 1.08, 0, 0, tb);
    at(cyl(0.03, 0.03, 1.06, steel), 0, 0.53, 0, 0, tb);
    at(cyl(0.25, 0.25, 0.02, steel, 24), 0, 0.01, 0, 0, tb);
    for (let i = 0; i < 3; i++) { const gx = (rnd() - 0.5) * 0.4, gz = (rnd() - 0.5) * 0.4; at(cyl(0.03, 0.02, 0.16, flute, 12), gx, 1.2, gz, 0, tb); at(cyl(0.025, 0.025, 0.06, mat('#e8d27a', { r: 0.1, op: 0.6 })), gx, 1.16, gz, 0, tb); }
  }
  // banco con el móvil de la invitada
  const bench = group(hall, -3.4, 0, -2.2, Math.PI / 2);
  at(box(1.8, 0.08, 0.45, walnut), 0, 0.45, 0, 0, bench);
  for (const x of [-0.8, 0.8]) at(box(0.06, 0.45, 0.4, steel), x, 0.22, 0, 0, bench);
  const phone = group(hall, -3.35, 0.495, -1.9, 0.3);
  at(box(0.075, 0.009, 0.155, mat('#1a1a1c', { r: 0.2, m: 0.4 })), 0, 0, 0, 0, phone);
  at(plane(0.068, 0.145, scr(screen(['21:20', '', '  ▶ story', '', ' @lucia.arte'], { bg: '#1a1020', color: '#ff9ac0', w: 128, h: 256, size: 18 }))), 0, 0.0052, 0, 0, phone).rotation.x = -Math.PI / 2;
  clue('movil_invitado', phone);
  // luces de la policía entrando por la puerta de cristal
  const police = new THREE.PointLight('#3060ff', 0, 10, 1.5); police.position.set(0, 2.2, 0.6); scene.add(police);
  updates.push(t => { const ph = Math.floor(t * 3) % 2; police.color.set(ph ? '#ff2a2a' : '#2a5aff'); police.intensity = 3 + Math.sin(t * 20) * 1.5; });
  // puertas
  const doorM = mat('#2a2a2e', { r: 0.4 });
  for (const [x, z, ry] of [[-5.4, -11.97, 0], [5.0, -11.97, 0], [6.97, -2.0, -Math.PI / 2], [-6.97, -2.0, Math.PI / 2]] as const) {
    at(box(1.0, 2.3, 0.05, doorM), x, 1.15, z, ry, hall);
    at(box(0.06, 0.1, 0.03, mat('#ff2020', { e: '#ff2020', ei: 2 })), x + (ry ? 0 : 0.6), 1.2, z + (ry ? (ry > 0 ? 0.6 : -0.6) : 0.04), ry, hall);
  }
  at(plane(1.6, 0.28, mat('#ffffff', { map: tex(textTex('PRIVADO', { w: 512, h: 90, size: 40, pad: 22, align: 'center', bg: '#141416', color: '#d8d8d8', aged: false })), r: 0.5 })), -5.4, 2.6, -11.95, 0, hall);

  // ---- barra del catering ----
  const bar = group(hall, 5.6, 0, -6.4);
  at(box(0.8, 1.1, 5.2, mat('#1b1b1e', { r: 0.35 })), 0, 0.55, 0, 0, bar);
  at(box(0.9, 0.05, 5.3, mat('#e9e6e0', { r: 0.12, m: 0.05 })), -0.02, 1.12, 0, 0, bar);
  at(box(0.04, 0.08, 5.0, glow('#ffd9a8')), -0.42, 1.0, 0, 0, bar);
  for (let i = 0; i < 4; i++) {
    const tray = group(bar, -0.05, 1.15, -1.8 + i * 1.1);
    at(box(0.5, 0.015, 0.32, mat('#2a2a2a', { r: 0.3 })), 0, 0, 0, 0, tray);
    const cols = ['#c9853a', '#b3262a', '#d9b26a', '#7a4a2a'];
    for (let j = 0; j < 6; j++) at(cyl(0.03, 0.03, 0.03, mat(cols[i], { r: 0.6 }), 10), -0.17 + (j % 3) * 0.17, 0.024, -0.08 + Math.floor(j / 3) * 0.16, 0, tray);
  }
  const cards = group(bar, -0.36, 1.15, -1.25);
  for (let i = 0; i < 3; i++) { const cd = box(0.09, 0.06, 0.004, paperM(textTex('ALÉRGENOS', { w: 128, h: 96, size: 16, pad: 10, align: 'center', bg: '#f4f0e6', aged: false }))); cd.rotation.x = -0.25; at(cd, 0, 0.03, i * 1.1, -Math.PI / 2, cards); }
  clue('etiquetas', cards);
  const clip = group(bar, -0.1, 1.15, 2.2, -0.4);
  at(box(0.23, 0.01, 0.32, mat('#6a4a2a', { r: 0.5 })), 0, 0, 0, 0, clip);
  at(box(0.21, 0.004, 0.28, paperM(textTex('Subinsp. Ortega\n\nIván Soto, camarero...\n«no probó nada»', { w: 256, h: 340, size: 22, pad: 18 }))), 0, 0.008, 0.01, 0, clip);
  at(box(0.08, 0.02, 0.03, steel), 0, 0.012, -0.15, 0, clip);
  clue('nota_camarero', clip);
  // mesa VIP con el plato intacto
  const vip = group(hall, 3.7, 0, -7.2);
  at(cyl(0.45, 0.45, 0.03, mat('#f4f2ee', { r: 0.3 }), 32), 0, 0.75, 0, 0, vip);
  at(cyl(0.04, 0.04, 0.74, steel), 0, 0.37, 0, 0, vip);
  const plate = group(vip, 0.05, 0.77, 0.05);
  at(cyl(0.13, 0.11, 0.015, mat('#ffffff', { r: 0.2 }), 32), 0, 0, 0, 0, plate);
  for (let j = 0; j < 5; j++) at(cyl(0.025, 0.025, 0.03, mat(['#c9853a', '#d9b26a', '#7a4a2a'][j % 3], { r: 0.6 }), 10), Math.cos(j * 1.25) * 0.065, 0.02, Math.sin(j * 1.25) * 0.065, 0, plate);
  clue('canapes', plate);
  at(box(0.12, 0.07, 0.004, paperM(textTex('RESERVADO\nG. IBARRA', { w: 160, h: 96, size: 18, pad: 14, align: 'center', bg: '#141416', color: '#d9b26a', aged: false }))), -0.2, 0.81, 0.1, 0.5, vip);

  // ================= DESPACHO (x 40) =================
  const of = group(scene);
  room(of, { x: 40, z: -2.5, w: 5.4, d: 5, h: 3, floor: tiled(woodTex('#6a4a30', 8), 2, 2, { r: 0.4 }), wall: white, ceil: mat('#202022', { r: 0.8 }) });
  const cityM = new THREE.MeshBasicMaterial({ map: tex(cityTex()), fog: false, color: new THREE.Color(0.75, 0.75, 0.8) });
  at(plane(3.2, 1.6, cityM), 40.4, 1.75, -4.98, 0, of);
  const rug = plane(2.6, 1.8, mat('#ffffff', { map: tex(art(5, 512, 360)), r: 0.95 })); rug.rotation.x = -Math.PI / 2; at(rug, 40.3, 0.005, -2.6, 0, of);
  const big = group(of, 37.32, 1.7, -3.6, Math.PI / 2);
  at(box(1.5, 1.1, 0.04, black), 0, 0, 0, 0, big);
  at(plane(1.42, 1.02, mat('#ffffff', { map: tex(art(2, 512, 380)), r: 0.75 })), 0, 0, 0.025, 0, big);
  for (const x of [-1.6, 0, 1.6]) at(box(0.05, 1.7, 0.06, black), 40.4 + x, 1.75, -4.95, 0, of);
  const ofL = new THREE.PointLight('#ffe6c8', 6, 8, 1.5); ofL.position.set(40.2, 2.7, -2.0); scene.add(ofL);
  // mesa de Gonzalo
  const gd = group(of, 40.6, 0, -3.8);
  at(box(1.8, 0.05, 0.85, walnut), 0, 0.76, 0, 0, gd);
  for (const x of [-0.85, 0.85]) at(box(0.05, 0.74, 0.8, steel), x, 0.37, 0, 0, gd);
  const pc = group(of, 40.55, 0.785, -3.95);
  at(box(0.62, 0.38, 0.02, black), 0, 0.3, 0, 0, pc);
  at(plane(0.58, 0.34, scr(screen(['', '   Galería Ítaca', '', '   Contraseña: ________'], { bg: '#10141c', color: '#9ab8ff', w: 512, h: 300, size: 26 }))), 0, 0.3, 0.011, 0, pc);
  at(box(0.05, 0.12, 0.05, steel), 0, 0.06, 0, 0, pc);
  at(box(0.45, 0.015, 0.15, mat('#2a2a2c', { r: 0.4 })), 0, 0.008, 0.28, 0, pc);
  at(box(0.06, 0.002, 0.06, mat('#f3e05a', { r: 0.8 })), 0.25, 0.01, 0.33, 0.3, pc);
  clue('ordenador', pc);
  // aparador con el mezcal
  const side = group(of, 42.3, 0, -2.2, -Math.PI / 2);
  at(box(1.4, 0.85, 0.45, walnut), 0, 0.43, 0, 0, side);
  const mez = group(side, 0.2, 0.86, 0);
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, transmission: 0.85, thickness: 0.05, transparent: true, opacity: 0.7 });
  at(cyl(0.06, 0.07, 0.24, glassM, 20), 0, 0.12, 0, 0, mez);
  at(cyl(0.055, 0.065, 0.16, mat('#d9cfa8', { r: 0.05, op: 0.5 }), 20), 0, 0.09, 0, 0, mez);
  at(cyl(0.02, 0.025, 0.07, glassM, 12), 0, 0.27, 0, 0, mez);
  at(cyl(0.025, 0.025, 0.025, mat('#2a1a10', { r: 0.6 })), 0, 0.31, 0, 0, mez);
  at(plane(0.08, 0.1, paperM(textTex('MEZCAL\nG.I.', { w: 128, h: 160, size: 24, pad: 18, align: 'center', bg: '#1a1a1a', color: '#d9b26a', aged: false }))), 0, 0.12, 0.071, 0, mez);
  at(cyl(0.035, 0.03, 0.08, glassM, 16), 0.16, 0.04, 0.05, 0, mez);
  clue('mezcal', mez);
  // mesa de Irene con la foto y la circular
  const id = group(of, 38.2, 0, -2.5, Math.PI / 2);
  at(box(1.4, 0.04, 0.7, mat('#e8e4dc', { r: 0.3 })), 0, 0.75, 0, 0, id);
  for (const x of [-0.65, 0.65]) at(box(0.04, 0.74, 0.65, black), x, 0.37, 0, 0, id);
  const frame = group(id, -0.35, 0.77, -0.15, 0.4);
  const fb = box(0.16, 0.2, 0.015, mat('#c9a96a', { m: 0.8, r: 0.3 })); fb.rotation.x = -0.15; at(fb, 0, 0.1, 0, 0, frame);
  const photo = (() => { const [c, g] = cv(128, 160); g.fillStyle = '#7aa0b8'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#4a7a3a'; g.fillRect(0, 110, 128, 50); g.fillStyle = '#e8c4a0'; g.beginPath(); g.arc(64, 70, 22, 0, 7); g.fill(); g.fillStyle = '#d23a2a'; g.fillRect(40, 92, 48, 50); g.fillStyle = '#c01818'; g.fillRect(78, 120, 14, 5); return c; })();
  const ph = plane(0.13, 0.17, mat('#ffffff', { map: tex(photo), r: 0.3 })); ph.rotation.x = -0.15; at(ph, 0, 0.1, 0.009, 0, frame);
  clue('foto_hijo', frame);
  const circ = group(id, 0.2, 0.772, 0.12, -0.2);
  const cp = plane(0.21, 0.29, paperM(textTex('COLEGIO RETIRO\nCircular a las familias\n\nTaller de alergias...\nDISPOSITIVO DE ENTRENAMIENTO\n\nNicolás Salvat — 3.º B', { w: 300, h: 420, size: 18, pad: 20, aged: false }))); cp.rotation.x = -Math.PI / 2;
  circ.add(cp);
  clue('circular_colegio', circ);
  // archivador con la póliza
  const fc = group(of, 42.25, 0, -4.2, -Math.PI / 2);
  at(box(0.5, 1.3, 0.6, mat('#3a3a3e', { m: 0.5, r: 0.4 })), 0, 0.65, 0, 0, fc);
  for (let i = 0; i < 3; i++) at(box(0.44, 0.02, 0.02, steel), 0, 0.3 + i * 0.4, 0.31, 0, fc);
  const folder = group(fc, 0, 1.31, 0, 0.2);
  at(box(0.24, 0.02, 0.32, mat('#2a4a8a', { r: 0.6 })), 0, 0.01, 0, 0, folder);
  clue('poliza_seguro', folder);
  for (let i = 0; i < 8; i++) at(box(0.05, 0.3 + rnd() * 0.08, 0.22, mat(['#b22b2b', '#1d2a44', '#e7b23a', '#e8e4da'][i % 4], { r: 0.6 })), 37.4 + i * 0.07, 1.68, -4.85, 0, of);
  at(box(1.2, 0.03, 0.3, walnut), 37.65, 1.5, -4.82, 0, of);

  // ================= ALMACÉN (x 80) =================
  const st = group(scene);
  room(st, { x: 80, z: -2.6, w: 6, d: 6, h: 3.2, floor: tiled(concreteTex('#7a7874'), 3, 3, { r: 0.6 }), wall: tiled(concreteTex('#6e737a'), 3, 1.5, { r: 0.85 }), ceil: mat('#1a1c1e', { r: 0.8 }) });
  for (const x of [-1.5, 1.5]) { at(box(0.15, 0.05, 2.6, glow('#d8f0ff')), 80 + x, 3.15, -2.6, 0, st); const fl = new THREE.PointLight('#a8d0ff', 3.2, 7, 1.5); fl.position.set(80 + x, 2.9, -2.6); scene.add(fl); }
  // estanterías con cajas y obras embaladas
  const rackM = mat('#3a5a8a', { m: 0.6, r: 0.4 });
  for (const dz of [-1.5, 0.8]) {
    const rk = group(st, 77.45, 0, -2.6 + dz);
    for (const [x, z] of [[-0.3, -0.75], [0.3, -0.75], [-0.3, 0.75], [0.3, 0.75]]) at(box(0.05, 2.6, 0.05, rackM), x, 1.3, z, 0, rk);
    for (const y of [0.15, 1.0, 1.85, 2.55]) at(box(0.66, 0.04, 1.55, mat('#6a5a40', { r: 0.8 })), 0, y, 0, 0, rk);
    for (const y of [0.17, 1.02, 1.87]) for (let j = 0; j < 2; j++) at(box(0.5, 0.35 + rnd() * 0.3, 0.6, mat(rnd() < 0.5 ? '#c9a56a' : '#bfc6c8', { r: 0.8, op: rnd() < 0.3 ? 0.85 : undefined })), 0, y + 0.25, -0.38 + j * 0.76, 0, rk);
  }
  const inv = group(st, 77.92, 1.3, -1.6, Math.PI / 2);
  at(box(0.24, 0.32, 0.01, mat('#6a4a2a', { r: 0.5 })), 0, 0, 0, 0, inv);
  at(plane(0.22, 0.28, paperM(textTex('INVENTARIO\n\nPájaro nº 1 · OK\nPájaro nº 2 · OK\nPájaro nº 3 · FALTA\nMarea · OK', { w: 256, h: 330, size: 22, pad: 18 }))), 0, -0.01, 0.006, 0, inv);
  clue('inventario', inv);
  // caja abierta con el óleo vendido y el certificado
  const crate = group(st, 81.6, 0, -3.7, -0.4);
  const ply = mat('#c9a56a', { r: 0.85 });
  at(box(1.3, 0.12, 0.25, ply), 0, 0.06, 0, 0, crate);
  at(box(1.3, 0.9, 0.04, ply), 0, 0.5, -0.12, 0, crate);
  const oil = plane(1.15, 0.8, mat('#ffffff', { map: tex(art(7, 512, 360)), r: 0.7 })); at(oil, 0, 0.55, -0.095, 0, crate);
  at(plane(0.3, 0.08, paperM(textTex('VENDIDO — A. ROLDÁN', { w: 300, h: 80, size: 20, pad: 14, align: 'center', bg: '#f4f0e6', aged: false }))), 0.35, 0.95, -0.09, 0, crate);
  const cert = group(st, 81.0, 0.13, -3.25, 0.5);
  const certP = plane(0.21, 0.29, paperM(textTex('CERTIFICADO DE AUTENTICIDAD\n\n«Marea», 2014\nÓleo sobre lienzo\n\nFdo.: Teo Marín', { w: 300, h: 420, size: 18, pad: 22, align: 'center', bg: '#f6f2e8', aged: false }))); certP.rotation.x = -Math.PI / 2; cert.add(certP);
  clue('certificado', cert);
  // silueta junto a la puerta y el autoinyector
  const out = group(st, 79.5, 0, -2.3, -0.5);
  decal(out, chalkTex(), 0.85, 1.7, 0, 0.004, 0, { r: 0.9 });
  clue('silueta', out);
  const pen = group(st, 80.55, 0.025, -2.6, 1.1);
  const penBody = cyl(0.022, 0.022, 0.16, mat('#e8c23a', { r: 0.4 }), 16); penBody.rotation.z = Math.PI / 2; at(penBody, 0, 0, 0, 0, pen);
  const cap = cyl(0.023, 0.023, 0.03, mat('#e86a1a', { r: 0.4 }), 16); cap.rotation.z = Math.PI / 2; at(cap, 0.095, 0, 0, 0, pen);
  const blue = cyl(0.02, 0.02, 0.025, mat('#2a6ad8', { r: 0.4 }), 16); blue.rotation.z = Math.PI / 2; at(blue, -0.09, 0, 0, 0, pen);
  const lab = cyl(0.0225, 0.0225, 0.08, mat('#ffffff', { map: tex(textTex('▒▒▒▒ TRAINER ▒▒', { w: 256, h: 64, size: 22, pad: 10, align: 'center', bg: '#f4f0e6', aged: false })), r: 0.6 }), 16, true); lab.rotation.z = Math.PI / 2; at(lab, 0, 0, 0, 0, pen);
  clue('autoinyector', pen);
  // panel de clima y lector de tarjeta
  at(plane(0.3, 0.18, scr(screen(['18.0 °C', '50 % HR', '', 'PUERTA: CERRADA'], { w: 256, h: 150, size: 24, color: '#9ae6ff', bg: '#04121a' }))), 82.97, 1.5, -1.2, -Math.PI / 2, st);
  at(box(0.08, 0.12, 0.03, black), 79.0, 1.2, 0.36, 0, st);
  at(box(0.02, 0.02, 0.01, mat('#ff2020', { e: '#ff2020', ei: 3 })), 79.0, 1.24, 0.34, 0, st);

  // ================= SEGURIDAD (x 120) =================
  const sc = group(scene);
  room(sc, { x: 120, z: -0.5, w: 3.6, d: 3.5, h: 2.6, floor: tiled(concreteTex('#4a4a4c'), 2, 2, { r: 0.7 }), wall: tiled(plasterTex('#4a4e56', 512, 512, 0.2), 2, 1, { r: 0.9 }), ceil: mat('#1a1a1c') });
  const desk = group(sc, 120.1, 0, -1.6);
  at(box(2.4, 0.05, 0.75, mat('#2a2a2e', { r: 0.5 })), 0, 0.75, 0, 0, desk);
  for (const x of [-1.15, 1.15]) at(box(0.05, 0.74, 0.7, black), x, 0.37, 0, 0, desk);
  const feeds = [
    screen(['CAM 2 · BARRA', '', '', '', '', '        21:52:10'], { bg: '#1a1f1a', color: '#e8f0e8', size: 18, noise: true }),
    screen(['CAM 3 · ALMACÉN', '', '', '', '', '        21:52:10'], { bg: '#121a20', color: '#e8f0e8', size: 18, noise: true }),
    screen(['CAM 4 · PASILLO', '', '  SIN SEÑAL 21:30-21:37', '', '', '        21:52:10'], { bg: '#0a0a0a', color: '#ff9a9a', size: 18, noise: true }),
  ];
  const mons: THREE.Mesh[] = [];
  feeds.forEach((f, i) => {
    const mg = group(desk, -0.8 + i * 0.8, 0.78, -0.2, 0);
    at(box(0.62, 0.4, 0.03, black), 0, 0.42, 0, 0, mg);
    const sm = plane(0.58, 0.36, scr(f)); at(sm, 0, 0.42, 0.016, 0, mg); mons.push(sm);
    at(box(0.05, 0.22, 0.05, black), 0, 0.11, 0, 0, mg);
  });
  // monitor con la grabación del discurso
  const m1 = group(sc, 120.1, 1.75, -2.2);
  at(box(0.8, 0.5, 0.03, black), 0, 0, 0, 0, m1);
  const speech = (() => { const c = screen(['CAM 1 · SALA', '', '', '', '', '   ▶  21:22:04 · discurso', ''], { bg: '#20201c', color: '#ffe8b0', size: 18, noise: true, w: 512, h: 320 }); const g = c.getContext('2d')!; g.fillStyle = '#c8c0b0'; g.fillRect(230, 120, 40, 90); g.beginPath(); g.arc(250, 105, 18, 0, 7); g.fill(); g.fillStyle = '#7a1f2b'; g.fillRect(232, 130, 36, 60); return c; })();
  at(plane(0.76, 0.46, scr(speech)), 0, 0, 0.016, 0, m1);
  clue('monitor_cctv', m1);
  // terminal de accesos
  const term = group(desk, 0.85, 0.78, 0.15, -0.35);
  at(box(0.36, 0.26, 0.04, mat('#3a3a3e', { r: 0.4 })), 0, 0.15, 0, 0, term).rotation.x = -0.3;
  const tscr = plane(0.32, 0.22, scr(screen(['ACCESOS', '21:04 DESP  G.IBARRA', '21:13 DESP  I.SALVAT', '21:30 ALM   B.VIDAL', '21:41 DESP  G.IBARRA', '21:44 ALM   G.IBARRA+1'], { w: 384, h: 260, size: 22 })));
  tscr.rotation.x = -0.3; at(tscr, 0, 0.155, 0.025, 0, term);
  clue('registro_tarjetas', term);
  const strip = group(desk, -0.6, 0.778, 0.22, 0.25);
  const sp = plane(0.08, 0.3, paperM(textTex('CAM 4\n21:30:12\nBORRADO\n07:28\nbvidal', { w: 96, h: 360, size: 16, pad: 8, aged: false }))); sp.rotation.x = -Math.PI / 2; strip.add(sp);
  clue('log_cctv', strip);
  at(cyl(0.04, 0.035, 0.1, mat('#e8e4dc', { r: 0.3 })), 120.4, 0.83, -1.35, 0, sc);
  const chair = group(sc, 121.0, 0, -0.5, -0.7);
  at(box(0.5, 0.08, 0.5, black), 0, 0.48, 0, 0, chair);
  at(box(0.5, 0.6, 0.06, black), 0, 0.85, 0.24, 0, chair);
  at(cyl(0.03, 0.03, 0.45, steel), 0, 0.23, 0, 0, chair);
  const monGlow = new THREE.PointLight('#a8c8ff', 2.2, 4, 1.6); monGlow.position.set(120.1, 1.3, -1.3); scene.add(monGlow);
  const scL = new THREE.PointLight('#ffe8d0', 0.8, 5, 1.6); scL.position.set(120, 2.4, 0.5); scene.add(scL);
  updates.push(t => { monGlow.intensity = 2.2 + Math.sin(t * 50) * 0.15; for (const m of mons) (m.material as THREE.MeshBasicMaterial).color.setScalar(0.8 + Math.sin(t * 40 + m.id) * 0.04); });

  // ================= GUARDARROPA Y ASEO (x 160) =================
  const ws = group(scene);
  room(ws, { x: 160, z: -1, w: 4.4, d: 4.6, h: 2.7, floor: tiled(tileTex('#d8d6d0', '#c8c6c0', 8), 2, 2, { r: 0.25 }), wall: tiled(tileTex('#cfd2d0', '#c4c8c6', 10), 2, 1.2, { r: 0.3 }), ceil: mat('#d8d8d8', { r: 0.8 }) });
  const wsL = new THREE.PointLight('#e8f0ff', 3.6, 8, 1.5); wsL.position.set(160, 2.5, -1); scene.add(wsL);
  at(box(1.2, 0.04, 0.05, glow('#ffffff')), 160, 2.66, -1, 0, ws);
  // percha con abrigos
  const rack = group(ws, 158.6, 0, -2.6);
  at(cyl(0.015, 0.015, 1.6, steel), 0, 1.7, 0, 0, rack).rotation.z = Math.PI / 2;
  for (const x of [-0.78, 0.78]) at(cyl(0.02, 0.02, 1.7, steel), x, 0.85, 0, 0, rack);
  ['#2a2a30', '#5a4a3a', '#1a2a3a', '#7a6a5a', '#3a1a1a'].forEach((c, i) => { const coat = box(0.42, 1.0, 0.14, mat(c, { r: 0.95 })); coat.rotation.y = (rnd() - 0.5) * 0.4; at(coat, -0.6 + i * 0.3, 1.15, 0, 0, rack); });
  const shelf = group(ws, 158.6, 1.95, -2.75);
  at(box(1.6, 0.04, 0.35, walnut), 0, 0, 0, 0, shelf);
  const bag = group(shelf, 0.35, 0.02, 0.02, -0.2);
  const bb = box(0.32, 0.22, 0.12, mat('#6a1a24', { r: 0.4 })); at(bb, 0, 0.11, 0, 0, bag);
  at(tor(0.1, 0.008, mat('#c9a96a', { m: 1, r: 0.3 }), Math.PI), 0, 0.22, 0, 0, bag);
  at(box(0.05, 0.07, 0.004, paperM(textTex('14', { w: 64, h: 96, size: 40, pad: 20, align: 'center', bg: '#f4f0e6', aged: false }))), 0.16, 0.1, 0.064, 0, bag);
  clue('bolso_irene', bag);
  at(box(0.4, 0.2, 0.15, mat('#1a1a1a', { r: 0.5 })), 157.9, 2.07, -2.75, 0, ws);
  // lavabo, espejo y contenedor
  const sink = group(ws, 161.7, 0, -1.8, -Math.PI / 2);
  at(box(0.7, 0.18, 0.45, mat('#f4f4f2', { r: 0.15 })), 0, 0.85, 0, 0, sink);
  at(cyl(0.012, 0.012, 0.18, steel), 0, 1.0, -0.15, 0, sink);
  at(box(0.6, 0.8, 0.02, new THREE.MeshStandardMaterial({ color: '#dfe4ea', metalness: 1, roughness: 0.04 })), 0, 1.6, -0.21, 0, sink);
  const bin = group(ws, 161.85, 0, -0.75, -Math.PI / 2);
  at(cyl(0.14, 0.13, 0.4, mat('#d8dadc', { m: 0.3, r: 0.4 }), 20), 0, 0.2, 0, 0, bin);
  at(cyl(0.145, 0.145, 0.03, mat('#b8babc', { m: 0.5, r: 0.3 }), 20), 0, 0.415, 0, 0, bin);
  at(box(0.08, 0.02, 0.1, mat('#5a5c5e', { m: 0.5 })), 0, 0.02, 0.17, 0, bin);
  clue('contenedor', bin);
  at(box(0.9, 2.1, 0.05, doorM), 158.2, 1.05, 1.27, 0, ws);

  const motes = dust(scene, new THREE.Vector3(0, 2.5, -6), new THREE.Vector3(12, 3, 10), 200, '#ffffff', 0.012, 0.35);

  return {
    scene, clues, ambience: 'fiesta', bloom: 0.9, exposure: 1, envIntensity: 0.3,
    update(t, dt) { motes(t); for (const u of updates) u(t, dt); },
  };
}

