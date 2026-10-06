// Caso 01 · Clerkenwell, 1889. Calle con lluvia y niebla, taller de relojería, cocina y buhardilla.
import * as THREE from 'three';
import type { World } from '../../types';
import {
  box, cyl, sph, tor, plane, mat, glow, at, group, room, tiled, tex, cv, textTex, woodTex, brickTex, cobbleTex,
  wallpaperTex, plasterTex, tileTex, stoneTex, dust, rain, lightCone, decal, bloodTex, chalkTex, rnd, uvMark,
} from '../../engine/kit';

export function clockFace(hh: number, mm: number, roman = true, size = 256, bg = '#efe6d0') {
  const [c, g] = cv(size, size);
  const r = size / 2;
  g.fillStyle = bg; g.beginPath(); g.arc(r, r, r, 0, 7); g.fill();
  g.strokeStyle = '#2a2018'; g.lineWidth = size * 0.012; g.beginPath(); g.arc(r, r, r * 0.92, 0, 7); g.stroke();
  g.fillStyle = '#1f1812'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${size * 0.1}px "Bodoni Moda"`;
  const N = roman ? ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'] : ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  N.forEach((t, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(t, r + Math.cos(a) * r * 0.74, r + Math.sin(a) * r * 0.74); });
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; g.fillRect(r + Math.cos(a) * r * 0.86 - 1, r + Math.sin(a) * r * 0.86 - 1, i % 5 ? 2 : 4, i % 5 ? 2 : 4); }
  const hand = (ang: number, len: number, w: number) => { g.save(); g.translate(r, r); g.rotate(ang); g.fillRect(-w / 2, -len, w, len + w); g.restore(); };
  hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, r * 0.45, size * 0.03);
  hand((mm / 60) * Math.PI * 2, r * 0.68, size * 0.018);
  g.beginPath(); g.arc(r, r, size * 0.025, 0, 7); g.fill();
  return c;
}

function blueprint(torn: boolean) {
  const [c, g] = cv(768, 512);
  g.fillStyle = '#1f3d6e'; g.fillRect(0, 0, 768, 512);
  g.strokeStyle = 'rgba(220,235,255,.85)'; g.fillStyle = 'rgba(220,235,255,.9)';
  g.lineWidth = 1.5;
  for (let x = 0; x < 768; x += 32) { g.globalAlpha = 0.15; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y < 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(768, y); g.stroke(); }
  g.globalAlpha = 1;
  const gear = (x: number, y: number, r: number, teeth: number) => {
    g.beginPath();
    for (let i = 0; i <= teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.12; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.stroke(); g.beginPath(); g.arc(x, y, r * 0.2, 0, 7); g.stroke();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); g.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); g.stroke(); }
  };
  gear(250, 260, 120, 30); gear(430, 200, 60, 15);
  g.beginPath(); g.moveTo(430, 200); g.lineTo(520, 330); g.lineTo(340, 330); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(430, 200); g.lineTo(430, 470); g.stroke();
  g.font = '22px "Courier Prime"'; g.fillText('ESCAPE DE ÁNCORA LIBRE — MOD. 7', 40, 50);
  g.font = '15px "Courier Prime"'; g.fillText('Rueda de escape 30 d. · Áncora 2 paletas · Esc. 1:1', 40, 76);
  g.fillText('A. TULL', 640, 480);
  if (torn) {
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(768, 380); for (let x = 768; x >= 560; x -= 12) g.lineTo(x, 380 + (768 - x) * 0.6 + (rnd() - 0.5) * 10); g.lineTo(560, 512); g.lineTo(768, 512); g.fill();
  }
  return c;
}

export function build(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0c0a');
  scene.fog = new THREE.FogExp2('#1c1813', 0.045);
  const clues: Record<string, THREE.Object3D> = {};
  const clue = (id: string, o: THREE.Object3D) => { clues[id] = o; return o; };
  const updates: ((t: number, dt: number) => void)[] = [];

  const brass = mat('#b08d57', { m: 1, r: 0.3 });
  const iron = mat('#1c1b1a', { m: 0.7, r: 0.45 });
  const darkWood = mat('#ffffff', { map: tex(woodTex('#3b2414', 4), [1, 1]), r: 0.55 });
  const paperM = (c: HTMLCanvasElement) => mat('#ffffff', { map: tex(c), r: 0.9 });

  // =============== CALLE ===============
  const street = group(scene);
  const cob = plane(18, 16, mat('#ffffff', { map: tex(cobbleTex(), [6, 5]), r: 0.38, m: 0.15 }));
  cob.rotation.x = -Math.PI / 2; at(cob, 0, 0, 8, 0, street);
  const kerb = box(14, 0.14, 1.7, tiled(stoneTex('#5c5852'), 6, 1, { r: 0.6 })); at(kerb, 0, 0.07, 0.85, 0, street);
  const facade = plane(14, 9, tiled(brickTex('#5e3324', '#2d2722'), 5, 3.2, { r: 0.85, bs: 0.6 }));
  facade.castShadow = true; at(facade, 0, 4.5, 0, 0, street);
  for (const s of [-1, 1]) { const side = plane(16, 9, tiled(brickTex('#3e2a20', '#221d19', 512, 512, 0.7), 6, 3.2, { r: 0.9 })); at(side, s * 7, 4.5, 8, -s * Math.PI / 2, street); }
  // escaparate verde con rótulo dorado
  const green = mat('#183326', { r: 0.4 });
  at(box(6.6, 0.7, 0.18, green), -0.6, 3.05, 0.1, 0, street);
  const sign = plane(6.2, 0.55, mat('#ffffff', { map: tex(textTex('A. TULL · RELOJERO · DESDE 1852', { w: 1400, h: 124, bg: '#183326', color: '#d9b26a', font: 'italic 500 "Bodoni Moda", serif', size: 74, pad: 18, align: 'center', aged: false })), r: 0.35, m: 0.3 }));
  at(sign, -0.6, 3.05, 0.2, 0, street);
  at(box(0.16, 2.7, 0.16, green), -4.0, 1.35, 0.1, 0, street);
  at(box(0.16, 2.7, 0.16, green), -1.25, 1.35, 0.1, 0, street);
  at(box(0.16, 2.7, 0.16, green), 0.62, 1.35, 0.1, 0, street);
  at(box(0.16, 2.7, 0.16, green), -0.62, 1.35, 0.1, 0, street);
  at(box(2.9, 0.6, 0.2, green), -2.62, 0.3, 0.1, 0, street);
  // cristal del escaparate con relojes dentro
  const glass = plane(2.6, 1.9, new THREE.MeshPhysicalMaterial({ color: '#2a2e2a', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.55 }));
  at(glass, -2.62, 1.6, 0.12, 0, street);
  at(plane(2.6, 1.9, glow('#3a2a14')), -2.62, 1.6, 0.02, 0, street);
  for (let i = 0; i < 7; i++) {
    const d = cyl(0.12 + rnd() * 0.08, 0.12, 0.04, mat('#ffffff', { map: tex(clockFace(8, 42, true, 128)), e: '#ffcf8a', ei: 0.25, r: 0.5 }), 24);
    d.rotation.x = Math.PI / 2; at(d, -3.6 + i * 0.33, 1.1 + (i % 3) * 0.42, 0.06, 0, street);
  }
  // puerta forzada: hueco con luz cálida dentro
  at(plane(1.1, 2.4, glow('#2a1b0e')), 0, 1.2, 0.02, 0, street);
  for (const x of [-0.6, 0.6]) at(box(0.1, 2.5, 0.12, green), x, 1.25, 0.08, 0, street);
  at(box(1.3, 0.12, 0.14, green), 0, 2.5, 0.1, 0, street);
  // ventanas altas, algunas encendidas
  for (let i = 0; i < 4; i++) for (let fl = 0; fl < 2; fl++) {
    const lit = (i + fl) % 3 === 0;
    at(plane(0.9, 1.4, glow(lit ? '#c98a3d' : '#121418', 1)), -4.5 + i * 3, 4.6 + fl * 2.4, 0.02, 0, street);
    at(box(1.05, 0.08, 0.15, stoneMat()), -4.5 + i * 3, 3.85 + fl * 2.4, 0.08, 0, street);
  }
  // reloj de muestra colgante
  const bracket = group(street, 1.6, 3.4, 0.2);
  at(box(0.05, 0.05, 0.7, iron), 0, 0.3, 0.35, 0, bracket);
  const sc = cyl(0.42, 0.42, 0.12, mat('#1a1a1a', { m: 0.6, r: 0.4 }), 40); sc.rotation.x = Math.PI / 2; sc.rotation.z = Math.PI / 2; at(sc, 0, -0.15, 0.7, 0, bracket);
  for (const s of [-1, 1]) { const f = cyl(0.36, 0.36, 0.01, mat('#ffffff', { map: tex(clockFace(8, 42)), e: '#ffd8a0', ei: 0.35, r: 0.5 }), 40); f.rotation.z = Math.PI / 2; at(f, s * 0.065, -0.15, 0.7, 0, bracket); }
  // farola de gas
  const lampPost = group(street, 2.9, 0, 1.55);
  at(cyl(0.06, 0.09, 3.2, iron), 0, 1.6, 0, 0, lampPost);
  at(cyl(0.22, 0.12, 0.12, iron, 6), 0, 3.25, 0, 0, lampPost);
  at(cyl(0.14, 0.2, 0.42, glow('#ffd28a'), 6), 0, 3.5, 0, 0, lampPost);
  at(new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.22, 6), iron), 0, 3.82, 0, 0, lampPost);
  const gas = new THREE.PointLight('#ffb560', 14, 12, 1.6); gas.position.set(2.9, 3.5, 1.55); scene.add(gas);
  lightCone(street, new THREE.Vector3(2.9, 3.45, 1.55), new THREE.Vector3(2.9, 0, 1.55), 1.8, '#ffc070', 0.05);
  updates.push(t => { gas.intensity = 14 + Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.4; });
  // carro del lechero con lecheras; encima, la libreta del agente
  const cart = group(street, -1.7, 0, 2.2, 0.25);
  at(box(1.2, 0.5, 0.8, mat('#4a3020', { r: 0.8 })), 0, 0.75, 0, 0, cart);
  for (const s of [-1, 1]) { const wh = tor(0.42, 0.04, mat('#2a1c12', { r: 0.7 })); at(wh, 0, 0.45, s * 0.45, 0, cart); }
  at(box(0.06, 0.06, 1.6, mat('#3a2616', { r: 0.8 })), -0.9, 0.7, 0, 0.0, cart).rotation.z = 0.1;
  const churnM = mat('#a6a39b', { m: 0.8, r: 0.35 });
  for (const [x, z] of [[-0.3, -0.18], [0.25, 0.2], [0.3, -0.2]]) { at(cyl(0.15, 0.18, 0.62, churnM), x, 1.31, z, 0, cart); at(cyl(0.1, 0.1, 0.06, churnM), x, 1.65, z, 0, cart); }
  const book = group(cart, -0.3, 1.66, -0.18, 0.4);
  at(box(0.16, 0.03, 0.22, mat('#1b1b1b', { r: 0.6 })), 0, 0.015, 0, 0, book);
  at(box(0.15, 0.025, 0.21, mat('#efe6d0', { r: 0.9 })), 0.004, 0.016, 0, 0, book);
  at(box(0.012, 0.035, 0.226, mat('#7a1a1a', { r: 0.6 })), -0.03, 0.017, 0, 0, book);
  clue('atestado', book);
  // charcos
  for (let i = 0; i < 7; i++) {
    const [pc, pg] = cv(128, 128); const gr = pg.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(10,10,12,.85)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); pg.fillStyle = gr; pg.fillRect(0, 0, 128, 128);
    decal(street, pc, 1 + rnd() * 1.6, 0.7 + rnd(), -4 + rnd() * 8, 0.005, 2.4 + rnd() * 5, { r: 0.05, m: 0.6 });
  }
  const rainUpd = rain(scene, new THREE.Vector3(0.6, 4, 5.5), new THREE.Vector3(14, 8, 10), 1700, 0.2, '#a9b8c8', 0.32);
  const moon = new THREE.DirectionalLight('#7c90b8', 0.5); moon.position.set(-4, 10, 8); scene.add(moon);
  scene.add(new THREE.HemisphereLight('#3a3a44', '#120e0a', 0.35));

  // =============== TALLER ===============
  const shop = group(scene);
  const wp = wallpaperTex('#1f2a22', '#2c3a2e');
  room(shop, { x: 0, z: -3.75, w: 8, d: 7.5, h: 3.4, floor: tiled(woodTex('#4a2e1a', 8), 5, 4, { r: 0.5 }), wall: tiled(wp, 3, 1.4, { r: 0.85 }), ceil: tiled(plasterTex('#6a5f50'), 2, 2) });
  for (let z = -1; z > -7.5; z -= 1.6) at(box(8, 0.22, 0.22, darkWood), 0, 3.29, z, 0, shop);
  // zócalo de madera
  for (const [x, z, w, ry] of [[0, -7.48, 8, 0], [-3.98, -3.75, 7.5, Math.PI / 2], [3.98, -3.75, 7.5, -Math.PI / 2]] as const) at(box(w, 1.0, 0.04, darkWood), x, 0.5, z, ry, shop);
  // puerta reventada por dentro
  const broken = box(1.04, 2.3, 0.05, darkWood); broken.geometry.translate(0.52, 0, 0); at(broken, -0.55, 1.16, -0.04, 1.15, shop);
  for (let i = 0; i < 9; i++) { const s = box(0.02 + rnd() * 0.03, 0.01, 0.12 + rnd() * 0.15, mat('#8a6a48', { r: 0.9 })); at(s, (rnd() - 0.5) * 1.6, 0.01, -0.5 - rnd() * 1.2, rnd() * 3, shop); }
  const bolt = group(shop, -0.45, 0.02, -3.3, 0.6);
  at(box(0.32, 0.03, 0.07, iron), 0, 0.015, 0, 0, bolt);
  at(cyl(0.018, 0.018, 0.2, mat('#3a3632', { m: 0.8, r: 0.35 })), 0.05, 0.05, 0, 0, bolt).rotation.z = Math.PI / 2;
  for (const x of [-0.12, 0.12]) at(cyl(0.012, 0.008, 0.06, mat('#5a5048', { m: 0.8, r: 0.4 })), x, 0.04, 0.02, 0, bolt);
  const frame = box(0.12, 0.04, 0.2, mat('#7e5d3c', { r: 0.9 })); frame.rotation.y = 0.3; at(frame, -0.2, 0.02, 0.1, 0, bolt);
  clue('cerrojo', bolt);
  // taburete con el informe del forense
  const stool = group(shop, 1.15, 0, -2.85);
  at(cyl(0.2, 0.2, 0.05, darkWood), 0, 0.6, 0, 0, stool);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = cyl(0.025, 0.025, 0.62, darkWood); l.rotation.z = Math.cos(a) * 0.12; l.rotation.x = Math.sin(a) * 0.12; at(l, Math.cos(a) * 0.14, 0.3, Math.sin(a) * 0.14, 0, stool); }
  const report = plane(0.24, 0.32, paperM(textTex('POLICÍA METROPOLITANA\nInforme del cirujano\n\nExamen a las 8:25 h.\nFractura parietal... sangre TODAVÍA LÍQUIDA...', { w: 384, h: 512, size: 22, pad: 28 })));
  report.rotation.x = -Math.PI / 2; report.rotation.z = 0.3; at(report, 0, 0.63, 0, 0, stool);
  const repGroup = group(stool); repGroup.add(report); clue('informe_forense', repGroup);

  // pared del fondo: reloj de pie y pared de relojes
  const tallClock = group(shop, 0, 0, -7.22);
  const cabinet = mat('#ffffff', { map: tex(woodTex('#4a2615', 2)), r: 0.35 });
  at(box(0.66, 0.5, 0.42, cabinet), 0, 0.25, 0, 0, tallClock);
  at(box(0.54, 1.3, 0.36, cabinet), 0, 1.15, 0, 0, tallClock);
  at(box(0.72, 0.62, 0.44, cabinet), 0, 2.11, 0, 0, tallClock);
  at(box(0.78, 0.08, 0.48, cabinet), 0, 2.46, 0, 0, tallClock);
  const face = plane(0.46, 0.46, mat('#ffffff', { map: tex(clockFace(8, 42)), r: 0.45 })); at(face, 0, 2.11, 0.225, 0, tallClock);
  at(plane(0.3, 1.0, new THREE.MeshPhysicalMaterial({ color: '#1a1410', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.4 })), 0, 1.2, 0.185, 0, tallClock);
  const pend = group(tallClock, 0, 1.75, 0.12);
  at(cyl(0.008, 0.008, 0.7, brass), 0, -0.35, 0, 0, pend);
  at(cyl(0.09, 0.09, 0.02, brass, 32), 0, -0.72, 0, 0, pend).rotation.x = Math.PI / 2;
  updates.push(t => { pend.rotation.z = Math.sin(t * Math.PI) * 0.12; });
  const wall = group(shop);
  const spots: [number, number, number][] = [];
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) spots.push([side * (0.75 + (i % 3) * 0.95 + rnd() * 0.15), 1.45 + Math.floor(i / 3) * 0.6 + rnd() * 0.1, 0.12 + rnd() * 0.12]);
  for (const [x, y, r] of spots) {
    const rim = cyl(r + 0.02, r + 0.02, 0.06, rnd() < 0.5 ? brass : cabinet, 32); rim.rotation.x = Math.PI / 2; at(rim, x, y, -7.44, 0, wall);
    const f = plane(r * 2, r * 2, mat('#ffffff', { map: tex(clockFace(8, 42, rnd() < 0.6, 128, rnd() < 0.3 ? '#f4f0e6' : '#e9dcc0')), r: 0.5 }));
    at(f, x, y, -7.405, 0, wall);
  }
  clue('relojes_pared', wall);

  // banco de trabajo (pared izquierda)
  const bench = group(shop, -3.6, 0, -4.1);
  const benchTop = box(0.75, 0.08, 3.8, mat('#ffffff', { map: tex(woodTex('#6a4428', 3), [1, 3]), r: 0.6 })); at(benchTop, 0, 0.9, 0, 0, bench);
  for (const z of [-1.8, 1.8]) for (const x of [-0.3, 0.3]) at(box(0.07, 0.86, 0.07, darkWood), x, 0.43, z, 0, bench);
  at(box(0.04, 0.7, 3.7, darkWood), 0.36, 0.5, 0, 0, bench);
  for (let i = 0; i < 4; i++) { at(box(0.02, 0.18, 0.7, darkWood), 0.39, 0.72, -1.3 + i * 0.9, 0, bench); at(sph(0.02, brass), 0.41, 0.72, -1.3 + i * 0.9, 0, bench); }
  // engranajes y herramientas
  for (let i = 0; i < 9; i++) {
    const r = 0.03 + rnd() * 0.06;
    const gear = cyl(r, r, 0.008, brass, 18); at(gear, -0.1 + rnd() * 0.25, 0.946, -1.6 + rnd() * 1.6, 0, bench);
  }
  for (let i = 0; i < 6; i++) { const t = cyl(0.008, 0.008, 0.14, iron, 6); t.rotation.z = Math.PI / 2; t.rotation.y = rnd() * 3; at(t, -0.05 + rnd() * 0.2, 0.95, 0.4 + rnd() * 1.2, 0, bench); }
  const movement = group(bench, 0.05, 0.95, 1.0);
  at(cyl(0.12, 0.12, 0.05, brass, 32), 0, 0.025, 0, 0, movement);
  for (let i = 0; i < 4; i++) { const g2 = cyl(0.03 + i * 0.012, 0.03 + i * 0.012, 0.01, mat('#d6b06a', { m: 1, r: 0.25 }), 16); at(g2, (i - 1.5) * 0.04, 0.06, (i % 2) * 0.03, 0, movement); }
  // lámpara del banco
  const bl = group(bench, -0.15, 0.94, -0.6);
  at(cyl(0.08, 0.09, 0.03, brass), 0, 0, 0, 0, bl);
  at(cyl(0.01, 0.01, 0.5, brass), 0, 0.25, 0, 0, bl);
  const shadeB = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 24, 1, true), mat('#123c26', { r: 0.3, side: THREE.DoubleSide }));
  at(shadeB, 0.08, 0.52, 0, 0, bl).rotation.z = 0.5;
  at(sph(0.035, glow('#ffe7b0')), 0.1, 0.48, 0, 0, bl);
  const benchSpot = new THREE.SpotLight('#ffcf8c', 9, 5, 0.9, 0.6, 1.5);
  benchSpot.position.set(-3.65, 1.4, -4.7); benchSpot.target.position.set(-3.3, 0.9, -4.2);
  benchSpot.castShadow = true; benchSpot.shadow.mapSize.set(1024, 1024); benchSpot.shadow.bias = -0.0005;
  scene.add(benchSpot, benchSpot.target);
  // plano del escape (con la esquina arrancada)
  const bpC = blueprint(true);
  const bpM = mat('#ffffff', { map: tex(bpC), r: 0.85 }); bpM.alphaTest = 0.5; bpM.transparent = false;
  const bp = plane(0.6, 0.4, bpM); bp.rotation.x = -Math.PI / 2; bp.rotation.z = -1.45;
  const bpG = group(shop, -3.4, 0.946, -4.45); bpG.add(bp); clue('plano_escape', bpG);
  // llave de cuerda bajo el banco
  const key = group(shop, -2.78, 0.025, -4.7, 0.9);
  at(cyl(0.022, 0.022, 0.3, brass, 12), 0, 0, 0, 0, key).rotation.z = Math.PI / 2;
  at(box(0.05, 0.03, 0.2, brass), -0.16, 0, 0, 0, key);
  const bit = cyl(0.035, 0.035, 0.06, brass, 10); bit.rotation.z = Math.PI / 2; at(bit, 0.17, 0, 0, 0, key);
  for (let i = 0; i < 4; i++) at(box(0.012, 0.03, 0.012, brass), 0.2, 0, -0.024 + i * 0.016, 0, key);
  uvMark(at(box(0.04, 0.035, 0.07, glow('#5cff9a')), 0.2, 0, 0, 0, key));
  clue('llave_cuerda', key);
  // escalera a la buhardilla (rincón del fondo izquierdo)
  for (let i = 0; i < 10; i++) at(box(0.8, 0.06, 0.28, darkWood), -3.58, 0.2 + i * 0.32, -6.0 - i * 0.14, 0, shop);
  // puerta a la cocina (pared derecha)
  at(box(0.08, 2.3, 1.1, darkWood), 3.94, 1.15, -1.6, 0, shop);
  at(box(0.04, 0.06, 0.06, brass), 3.88, 1.05, -2.0, 0, shop);
  at(plane(0.95, 0.06, glow('#ffb860', 0.9)), 3.89, 0.02, -1.6, -Math.PI / 2, shop);
  // escritorio de Tull (pared derecha)
  const desk = group(shop, 3.15, 0, -5.4);
  const deskTop = box(0.8, 0.06, 1.6, mat('#ffffff', { map: tex(woodTex('#3a1e10', 2), [1, 2]), r: 0.3 })); at(deskTop, 0, 0.78, 0, 0, desk);
  at(box(0.76, 0.7, 0.5, darkWood), 0.02, 0.4, -0.52, 0, desk);
  at(box(0.76, 0.7, 0.5, darkWood), 0.02, 0.4, 0.52, 0, desk);
  at(box(0.5, 0.01, 0.75, mat('#2a4a32', { r: 0.7 })), -0.05, 0.815, 0.05, 0, desk);
  // tintero, libros, quinqué
  at(cyl(0.04, 0.05, 0.06, mat('#141820', { r: 0.1 })), 0.15, 0.84, 0.45, 0, desk);
  for (let i = 0; i < 4; i++) at(box(0.2, 0.05, 0.28, mat(['#5a1a1a', '#1a2a4a', '#3a3a1a', '#2a1a10'][i], { r: 0.7 })), 0.2, 0.835 + i * 0.05, -0.62, (i - 1.5) * 0.12, desk);
  const lampD = group(desk, 0.25, 0.81, 0.2);
  at(cyl(0.06, 0.08, 0.1, brass), 0, 0.05, 0, 0, lampD);
  at(sph(0.09, new THREE.MeshPhysicalMaterial({ color: '#ffe6b8', transmission: 0.6, roughness: 0.3, emissive: '#ffb050', emissiveIntensity: 1.2 })), 0, 0.22, 0, 0, lampD);
  const deskLight = new THREE.PointLight('#ffb766', 4, 6, 1.6); deskLight.position.set(3.4, 1.15, -5.2); scene.add(deskLight);
  updates.push(t => { deskLight.intensity = 4 + Math.sin(t * 11) * 0.15; });
  const letterC = textTex('S.:\n\nMañana a primera hora hablaremos de los planos del escape. Sé a quién se los has llevado y sé por cuánto.\n\nTe enseñé el oficio como a un hijo. No me obligues a acudir a Scotland Yard.\n\n— A. T.', { w: 512, h: 680, size: 36, pad: 40, font: '"Reenie Beanie", cursive', color: '#1f2348', line: 1.1 });
  const letter = plane(0.22, 0.29, paperM(letterC)); letter.rotation.x = -Math.PI / 2; letter.rotation.z = Math.PI / 2 + 0.15;
  const letterG = group(shop, 3.05, 0.818, -5.0); letterG.add(letter); clue('carta_borrador', letterG);
  // taza
  const cup = group(shop, 2.92, 0.81, -5.85);
  at(cyl(0.075, 0.075, 0.008, mat('#f2ede4', { r: 0.25 }), 32), 0, 0.004, 0, 0, cup);
  at(cyl(0.042, 0.032, 0.06, mat('#f2ede4', { r: 0.25 }), 32), 0, 0.038, 0, 0, cup);
  at(cyl(0.038, 0.038, 0.002, mat('#3b220f', { r: 0.15 })), 0, 0.055, 0, 0, cup);
  at(tor(0.018, 0.005, mat('#f2ede4', { r: 0.25 })), 0.047, 0.04, 0, 0, cup).rotation.y = 0;
  at(box(0.006, 0.005, 0.07, mat('#c0c0c0', { m: 1, r: 0.2 })), -0.04, 0.012, 0.03, 0.4, cup);
  clue('taza', cup);
  // papelera con el frasco
  const bin = group(shop, 3.5, 0, -4.35);
  at(cyl(0.17, 0.13, 0.36, mat('#6b5534', { r: 0.95 }), 16, true), 0, 0.18, 0, 0, bin);
  for (let i = 0; i < 4; i++) at(sph(0.06, mat('#e6dcc6', { r: 0.95 }), 8), (rnd() - 0.5) * 0.12, 0.3, (rnd() - 0.5) * 0.12, 0, bin);
  const vial = group(shop, 3.48, 0.38, -4.33, 0.4);
  const vialG = new THREE.MeshPhysicalMaterial({ color: '#5a2e0e', roughness: 0.08, transmission: 0.35, thickness: 0.02 });
  const vb = cyl(0.03, 0.03, 0.1, vialG, 16); vb.rotation.z = 0.6; at(vb, 0, 0, 0, 0, vial);
  const vn = cyl(0.012, 0.012, 0.035, vialG, 12); vn.rotation.z = 0.6; at(vn, -0.04, 0.065, 0, 0, vial);
  const lab = cyl(0.031, 0.031, 0.05, mat('#ffffff', { map: tex(textTex('BOTICA HOLLIS\nLÁUDANO\nMrs. E. Pell', { w: 256, h: 128, size: 22, pad: 14, align: 'center' })), r: 0.9 }), 16, true);
  lab.rotation.z = 0.6; at(lab, 0, 0, 0, 0, vial);
  clue('frasco', vial);
  // silla volcada, silueta de tiza, sangre y reloj de bolsillo
  const chair = group(shop, 2.35, 0, -5.0, 0.5);
  at(box(0.45, 0.04, 0.45, darkWood), 0, 0.22, 0, 0, chair).rotation.x = Math.PI / 2;
  at(box(0.45, 0.6, 0.04, darkWood), 0, 0.03, 0.25, 0, chair);
  for (const x of [-0.2, 0.2]) at(box(0.04, 0.04, 0.45, darkWood), x, 0.45, -0.02, 0, chair);
  const outline = group(shop, 2.05, 0, -4.7, 0.45);
  decal(outline, chalkTex(), 0.95, 1.85, 0, 0.004, 0, { r: 0.9 });
  decal(outline, bloodTex(), 0.8, 0.8, 0.05, 0.006, -0.85, { r: 0.18, m: 0.1 });
  clue('silueta', outline);
  const pw = group(shop, 2.6, 0.012, -4.25, 2.2);
  at(cyl(0.045, 0.045, 0.014, mat('#c9a14a', { m: 1, r: 0.25 }), 40), 0, 0, 0, 0, pw);
  at(cyl(0.039, 0.039, 0.002, mat('#ffffff', { map: tex(clockFace(23, 40, true, 128)), r: 0.4 }), 40), 0, 0.008, 0, 0, pw);
  at(cyl(0.008, 0.008, 0.016, mat('#c9a14a', { m: 1, r: 0.25 })), 0, 0, -0.052, 0, pw).rotation.x = Math.PI / 2;
  const crackG = new THREE.Mesh(new THREE.CircleGeometry(0.04, 7), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 0.9, transparent: true, opacity: 0.4 }));
  crackG.rotation.x = -Math.PI / 2; at(crackG, 0, 0.011, 0, 0, pw);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0.06, 0, -0.14), new THREE.Vector3(0.02, 0, -0.24), new THREE.Vector3(0.12, 0, -0.3)]), 20, 0.003, 5), mat('#c9a14a', { m: 1, r: 0.3 }));
  pw.add(chain);
  clue('reloj_bolsillo', pw);
  // apliques de gas en las paredes
  for (const [x, z] of [[-3.9, -2.0], [3.9, -3.2], [-1.5, -7.4], [1.5, -7.4]]) {
    const sconce = group(shop, x, 2.3, z);
    at(sph(0.05, mat('#ffcf8a', { e: '#ffb050', ei: 1.4, r: 0.4 })), 0, 0, 0, 0, sconce);
    at(box(0.04, 0.04, 0.15, brass), 0, -0.05, 0, 0, sconce);
  }
  const s1 = new THREE.PointLight('#ffb766', 6, 7, 1.7); s1.position.set(-1.5, 2.2, -6.8); scene.add(s1);
  const s2 = new THREE.PointLight('#ffb766', 5, 7, 1.7); s2.position.set(1.5, 2.2, -6.8); scene.add(s2);
  const s3 = new THREE.PointLight('#ffae60', 4, 6, 1.7); s3.position.set(-3.5, 2.2, -2.0); scene.add(s3);
  const s4 = new THREE.PointLight('#ffae60', 4, 6, 1.7); s4.position.set(3.5, 2.2, -3.2); scene.add(s4);
  updates.push(t => { s1.intensity = 6 + Math.sin(t * 7.1) * 0.25; s3.intensity = 4 + Math.sin(t * 8.3 + 1) * 0.2; });
  const motes = dust(scene, new THREE.Vector3(-2.6, 1.6, -4.4), new THREE.Vector3(3, 2, 4), 160, '#ffe6b8', 0.014, 0.4);
  const motes2 = dust(scene, new THREE.Vector3(2.5, 1.5, -5), new THREE.Vector3(2.5, 1.8, 3), 100, '#ffe6b8', 0.014, 0.4);

  // =============== COCINA (x+20) ===============
  const kit = group(scene);
  room(kit, { x: 20.3, z: -3, w: 7, d: 6, h: 3, floor: tiled(tileTex('#cfc5b0', '#3a302a', 8), 4, 3.5, { r: 0.6 }), wall: tiled(plasterTex('#a8987c', 512, 512, 0.25), 3, 1.3, { r: 0.9 }), ceil: tiled(plasterTex('#5a5040'), 2, 2) });
  for (let z = -0.5; z > -6; z -= 1.4) at(box(7, 0.2, 0.2, darkWood), 20.3, 2.9, z, 0, kit);
  // fogón de hierro
  const range = group(kit, 20.3, 0, -5.6);
  at(box(1.9, 0.9, 0.7, mat('#1a1918', { m: 0.6, r: 0.5 })), 0, 0.45, 0, 0, range);
  at(box(0.5, 0.4, 0.02, glow('#ff7a2a')), -0.45, 0.4, 0.36, 0, range);
  at(box(0.3, 2.2, 0.3, mat('#1a1918', { m: 0.6, r: 0.5 })), 0.6, 1.95, -0.1, 0, range);
  const kettle = group(range, 0.3, 0.9, 0.1);
  at(sph(0.14, mat('#8a5a2a', { m: 1, r: 0.3 })), 0, 0.1, 0, 0, kettle).scale.set(1, 0.8, 1);
  const fire = new THREE.PointLight('#ff7a30', 5, 5, 1.6); fire.position.set(19.85, 0.5, -5.0); scene.add(fire);
  updates.push(t => { fire.intensity = 5 + Math.sin(t * 13) * 0.8 + Math.sin(t * 5.1) * 0.6; });
  // cacerolas de cobre
  for (let i = 0; i < 5; i++) { const pan = cyl(0.12 + i * 0.02, 0.1 + i * 0.02, 0.1, mat('#b5653a', { m: 1, r: 0.28 })); pan.rotation.x = Math.PI / 2; at(pan, 17.6 + i * 0.4, 1.9, -5.92, 0, kit); }
  // mesa con el té y el bolso de Margaret
  const table = group(kit, 20.4, 0, -3.3);
  at(box(1.7, 0.06, 0.95, mat('#ffffff', { map: tex(woodTex('#8a6a48', 4)), r: 0.7 })), 0, 0.78, 0, 0, table);
  for (const [x, z] of [[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]]) at(box(0.07, 0.76, 0.07, darkWood), x, 0.38, z, 0, table);
  const pot = group(table, 0.4, 0.81, -0.15);
  at(sph(0.11, mat('#2a4a6a', { r: 0.25 })), 0, 0.09, 0, 0, pot).scale.set(1, 0.85, 1);
  const spout = cyl(0.015, 0.025, 0.12, mat('#2a4a6a', { r: 0.25 })); spout.rotation.z = -0.9; at(spout, 0.12, 0.12, 0, 0, pot);
  at(box(0.3, 0.12, 0.18, mat('#c8a46a', { r: 0.9 })), -0.5, 0.87, 0.2, 0.3, table);
  const bag = group(kit, 20.1, 0.81, -3.15, 0.5);
  const bagBody = sph(0.15, mat('#4a1f45', { r: 0.95 }), 24); bagBody.scale.set(1.2, 0.85, 0.6); at(bagBody, 0, 0.11, 0, 0, bag);
  at(tor(0.09, 0.01, mat('#b08d57', { m: 1, r: 0.3 }), Math.PI), 0, 0.2, 0, 0, bag);
  at(box(0.2, 0.02, 0.02, brass), 0, 0.2, 0, 0, bag);
  clue('bolso_margaret', bag);
  // alacena de Mrs. Pell (pared derecha)
  const cab = group(kit, 23.62, 0.9, -3.0, -Math.PI / 2);
  const pine = mat('#ffffff', { map: tex(woodTex('#7a5634', 3)), r: 0.75 });
  at(box(1.0, 1.4, 0.4, pine), 0, 0.3, -0.2, 0, cab);
  at(box(0.94, 0.03, 0.36, pine), 0, 0.3, -0.18, 0, cab);
  at(box(0.94, 0.03, 0.36, pine), 0, 0.72, -0.18, 0, cab);
  at(box(0.5, 1.36, 0.03, pine), -0.72, 0.3, 0.12, -0.9, cab);
  const bottleCols = ['#3a5a2a', '#6a3a1a', '#2a3a5a', '#e8e0d0'];
  for (let i = 0; i < 6; i++) { if (i === 3) continue; const b = cyl(0.035, 0.04, 0.16 + (i % 2) * 0.06, new THREE.MeshPhysicalMaterial({ color: bottleCols[i % 4], roughness: 0.1, transmission: 0.3 }), 12); at(b, -0.38 + i * 0.15, 0.4, -0.15, 0, cab); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.04, 24), mat('#efe6d0', { r: 0.9 })); ring.rotation.x = -Math.PI / 2; at(ring, 0.07, 0.319, -0.15, 0, cab);
  at(box(0.36, 0.12, 0.02, mat('#ffffff', { map: tex(textTex('MEDICINAS — E. P.', { w: 256, h: 64, size: 22, pad: 10, align: 'center' })), r: 0.9 })), 0, 1.06, 0.01, 0, cab);
  clue('alacena', cab);
  // ventana nocturna
  at(plane(1.0, 1.2, glow('#24304a')), 17.6, 1.7, -5.98, 0, kit);
  for (let i = 0; i < 3; i++) at(box(0.04, 1.2, 0.04, iron), 17.3 + i * 0.3, 1.7, -5.95, 0, kit);
  at(box(0.08, 2.2, 1.0, darkWood), 16.84, 1.1, -1.6, 0, kit);
  scene.add(at(new THREE.PointLight('#ffcf9a', 3, 6, 1.7), 20.6, 2.5, -2.4));

  // =============== BUHARDILLA (x-20) ===============
  const att = group(scene, -20, 0, -3);
  const planks = tiled(woodTex('#5a3a22', 6), 2, 2, { r: 0.75 });
  const fl = plane(6, 6, planks); fl.rotation.x = -Math.PI / 2; att.add(fl);
  const roofM = tiled(woodTex('#3a2516', 8), 2, 1, { r: 0.85, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(3.62, 6).rotateX(-Math.PI / 2), roofM); r.receiveShadow = true; r.rotation.z = -s * 0.588; at(r, s * 1.5, 1.9, 0, 0, att); }
  const gable = new THREE.Shape(); gable.moveTo(-3, 0); gable.lineTo(-3, 0.9); gable.lineTo(0, 2.9); gable.lineTo(3, 0.9); gable.lineTo(3, 0); gable.lineTo(-3, 0);
  const gm = tiled(plasterTex('#8a7a62'), 1, 1, { r: 0.9 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(gable), gm); back.receiveShadow = true; at(back, 0, 0, -3, 0, att);
  const front = new THREE.Mesh(new THREE.ShapeGeometry(gable), gm); at(front, 0, 0, 3, Math.PI, att);
  for (const s of [-1, 1]) at(box(0.05, 0.9, 6, gm), s * 3, 0.45, 0, 0, att);
  at(box(0.2, 0.2, 6, darkWood), 0, 2.85, 0, 0, att);
  // ventanuco con luna
  at(plane(0.7, 0.7, glow('#2c3d60')), 0, 1.8, -2.98, 0, att);
  at(box(0.04, 0.7, 0.04, darkWood), 0, 1.8, -2.96, 0, att); at(box(0.7, 0.04, 0.04, darkWood), 0, 1.8, -2.96, 0, att);
  const moonIn = new THREE.SpotLight('#8aa0d0', 6, 6, 0.6, 0.6, 1.2); moonIn.position.set(-20, 1.8, -5.8); moonIn.target.position.set(-20.5, 0, -2.5); moonIn.castShadow = true; scene.add(moonIn, moonIn.target);
  lightCone(att, new THREE.Vector3(0, 1.8, -2.9), new THREE.Vector3(-0.5, 0, 0.5), 0.9, '#9fb3e0', 0.06);
  // cama de hierro y la lata
  const bed = group(att, -1.9, 0, -0.5);
  at(box(0.95, 0.2, 1.95, mat('#d8cfbc', { r: 0.95 })), 0, 0.48, 0, 0, bed);
  at(box(0.85, 0.06, 0.5, mat('#ece6d8', { r: 0.95 })), 0, 0.6, -0.65, 0, bed);
  at(box(0.98, 0.08, 1.2, mat('#5a2a2a', { r: 0.95 })), 0, 0.6, 0.35, 0, bed);
  for (const z of [-1, 1]) { for (const x of [-0.47, 0.47]) at(cyl(0.02, 0.02, 0.9, iron), x, 0.45, z, 0, bed); at(cyl(0.015, 0.015, 0.94, iron), 0, 0.85, z, 0, bed).rotation.z = Math.PI / 2; }
  const tin = group(att, -1.25, 0.06, -0.15, -0.3);
  at(box(0.22, 0.11, 0.16, mat('#8a1f1f', { m: 0.6, r: 0.4 })), 0, 0, 0, 0, tin);
  at(box(0.23, 0.02, 0.17, mat('#c9a14a', { m: 0.8, r: 0.35 })), 0, 0.06, 0, 0, tin);
  at(plane(0.18, 0.08, mat('#ffffff', { map: tex(textTex('HUNTLEY & PALMERS', { w: 256, h: 96, size: 20, pad: 8, align: 'center', bg: '#8a1f1f', color: '#e8c97a', aged: false })), r: 0.5 })), 0, 0, 0.081, 0, tin);
  for (const x of [-0.55, -0.45]) at(box(0.12, 0.25, 0.28, mat('#2a1d14', { r: 0.6 })), x, 0.125, 0.1, 0.2, att).position.set(-1.4 + x, 0.125, 0.25);
  clue('lata', tin);
  // mesita con vela y la cuenta de la taberna
  const nt = group(att, 1.4, 0, -1.6);
  at(box(0.6, 0.05, 0.45, darkWood), 0, 0.7, 0, 0, nt);
  for (const [x, z] of [[-0.26, -0.18], [0.26, -0.18], [-0.26, 0.18], [0.26, 0.18]]) at(box(0.04, 0.7, 0.04, darkWood), x, 0.35, z, 0, nt);
  at(cyl(0.02, 0.02, 0.12, mat('#efe8d8', { r: 0.6 })), 0.18, 0.79, 0.05, 0, nt);
  const flame = at(sph(0.012, glow('#ffd48a')), 0.18, 0.865, 0.05, 0, nt); flame.scale.set(1, 2, 1);
  const candle = new THREE.PointLight('#ffb05a', 2.5, 4, 1.6); candle.position.set(-18.42, 0.95, -4.55); candle.castShadow = true; candle.shadow.mapSize.set(512, 512); scene.add(candle);
  updates.push(t => { candle.intensity = 2.5 + Math.sin(t * 17) * 0.3 + Math.sin(t * 6.3) * 0.25; flame.scale.y = 2 + Math.sin(t * 19) * 0.3; });
  const bill = plane(0.14, 0.2, paperM(textTex('THE EAGLE\nCity Road\n\nMr. S. Reed\n3 pintas ... 9 d.\n1 pastel ... 6 d.\n\n21:45 — 23:55', { w: 256, h: 360, size: 20, pad: 18 })));
  bill.rotation.x = -Math.PI / 2; bill.rotation.z = 0.4;
  const billG = group(att, 1.3, 0.73, -1.6); billG.add(bill); clue('cuenta_taberna', billG);
  // delantal colgado
  const apron = group(att, 1.6, 0, -2.92);
  at(cyl(0.012, 0.012, 0.06, iron), 0, 1.75, 0.02, 0, apron).rotation.x = Math.PI / 2;
  const leather = mat('#5a3a20', { r: 0.7 });
  const ap = box(0.55, 0.85, 0.02, leather); at(ap, 0, 1.25, 0.04, 0, apron);
  at(box(0.04, 0.3, 0.01, leather), -0.2, 1.7, 0.04, 0, apron).rotation.z = 0.5;
  at(box(0.04, 0.3, 0.01, leather), 0.2, 1.7, 0.04, 0, apron).rotation.z = -0.5;
  at(box(0.3, 0.2, 0.012, mat('#4a2e18', { r: 0.7 })), 0, 1.12, 0.055, 0, apron);
  at(box(0.12, 0.06, 0.04, mat('#d9cfb8', { r: 0.95 })), 0.05, 1.23, 0.06, 0.2, apron);
  clue('delantal', apron);
  // bocetos de engranajes clavados en la pared (copias de los planos)
  for (let i = 0; i < 3; i++) at(plane(0.32, 0.22, mat('#ffffff', { map: tex(blueprint(false)), r: 0.9 })), -1.2 + i * 0.42, 1.25 + (i % 2) * 0.18, -2.97, 0, att).rotation.z = (i - 1) * 0.08;
  // trampilla de la escalera
  at(box(0.9, 0.05, 0.7, darkWood), 2.3, 0.02, 0.8, 0, att);
  at(box(0.05, 0.9, 0.9, darkWood), 2.0, 0.45, 0.8, 0, att);
  const motes3 = dust(scene, new THREE.Vector3(-20.3, 1.0, -4.5), new THREE.Vector3(2, 1.6, 2.5), 140, '#c8d4ff', 0.018, 0.45);

  function stoneMat() { return mat('#6a655c', { r: 0.8 }); }

  return {
    scene, clues, ambience: 'londres', bloom: 0.85, exposure: 1.0,
    update(t, dt) { rainUpd(dt); motes(t); motes2(t); motes3(t); for (const u of updates) u(t, dt); },
  };
}

