// Caso 02 · Punta Negra, 1957. Islote con faro en pleno temporal: mar animado, haz giratorio, relámpagos;
// interiores de la casa del farero, la torre y la sala de la linterna.
import * as THREE from 'three';
import type { World } from '../../types';
import {
  box, cyl, sph, tor, plane, mat, glow, at, group, room, tiled, tex, cv, textTex, woodTex, stoneTex,
  plasterTex, dust, rain, lightCone, decal, chalkTex, bloodTex, rnd, uvMark,
} from '../../engine/kit';

function noise2(x: number, z: number) {
  return Math.sin(x * 0.31 + Math.cos(z * 0.27) * 2) * 0.5 + Math.sin(z * 0.43 + x * 0.12) * 0.35 + Math.sin((x + z) * 0.9) * 0.15;
}
/** Altura del islote: meseta central con costa rocosa; la cala al oeste baja suave hasta el agua. */
export function islandH(x: number, z: number) {
  const r = Math.hypot(x * 0.9, (z - 4) * 0.75);
  let h = 1.25 - Math.pow(Math.max(0, r - 9) / 13, 1.6) * 4.5 + noise2(x, z) * 0.35 * Math.min(1, r / 8);
  const cove = Math.hypot(x + 19, z - 7);
  if (cove < 8) h = THREE.MathUtils.lerp(-0.75 + cove * 0.04, h, Math.pow(cove / 8, 2));
  return h;
}

export function build(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06090d');
  scene.fog = new THREE.FogExp2('#0b1218', 0.026);
  const clues: Record<string, THREE.Object3D> = {};
  const clue = (id: string, o: THREE.Object3D) => { clues[id] = o; return o; };
  const updates: ((t: number, dt: number) => void)[] = [];
  const brass = mat('#b08d57', { m: 1, r: 0.3 });
  const iron = mat('#1e2a26', { m: 0.6, r: 0.45 });
  const wood = mat('#ffffff', { map: tex(woodTex('#5a4030', 4)), r: 0.75 });
  const granite = tiled(stoneTex('#6e6c68', 512, 512, false), 2, 2, { r: 0.9 });
  const paperM = (c: HTMLCanvasElement) => mat('#ffffff', { map: tex(c), r: 0.9 });

  // ================= EXTERIOR =================
  // cielo con degradado
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { flash: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float flash; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.5, 0., 1.); vec3 c = mix(vec3(.10,.14,.17), vec3(.015,.02,.03), h); c += flash * vec3(.55,.6,.75) * (1. - h * .5); gl_FragColor = vec4(c, 1.); }',
  }));
  scene.add(sky);
  // mar con olas en el shader
  const seaU = { uTime: { value: 0 } };
  const seaM = mat('#051017', { r: 0.1, m: 0.3 });
  seaM.onBeforeCompile = sh => {
    sh.uniforms.uTime = seaU.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        vec2 p = position.xy; float t = uTime;
        float dx = cos(p.x*.15 + t*.9)*.35*.15 + cos((p.x+p.y)*.4 + t*1.7)*.08*.4;
        float dy = -sin(p.y*.21 - t*1.1)*.25*.21*-1. + cos((p.x+p.y)*.4 + t*1.7)*.08*.4;
        vec3 objectNormal = normalize(vec3(-dx, -dy, 1.));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.z += sin(p.x*.15 + t*.9)*.35 + sin(p.y*.21 - t*1.1)*.25 + sin((p.x+p.y)*.4 + t*1.7)*.08;`);
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 140, 140), seaM);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1.25; sea.receiveShadow = true; scene.add(sea);
  // islote con color por vértice (hierba arriba, granito en la costa)
  const ig = new THREE.PlaneGeometry(70, 70, 110, 110); ig.rotateX(-Math.PI / 2);
  const ip = ig.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(ip.count * 3);
  const grass = new THREE.Color('#2f3a24'), rockC = new THREE.Color('#4a4844'), sand = new THREE.Color('#2a2622');
  for (let i = 0; i < ip.count; i++) {
    const x = ip.getX(i), z = ip.getZ(i), y = islandH(x, z);
    ip.setY(i, y);
    const c = y > 0.8 && noise2(x * 2, z * 2) > -0.3 ? grass.clone().lerp(rockC, rnd() * 0.3) : Math.hypot(x + 19, z - 7) < 6 ? sand : rockC.clone().multiplyScalar(0.8 + rnd() * 0.3);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  ig.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  ig.computeVertexNormals();
  const islandM = mat('#ffffff', { map: tex(stoneTex('#8a8780', 512, 512, false), [10, 10]), r: 0.95 });
  islandM.vertexColors = true;
  const island = new THREE.Mesh(ig, islandM); island.receiveShadow = true; island.castShadow = true; scene.add(island);
  // rocas sueltas
  const rockM = mat('#3c3b38', { r: 0.85 });
  const rock = (x: number, z: number, s: number) => { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), rockM); r.scale.set(1 + rnd() * 0.6, 0.6 + rnd() * 0.5, 1 + rnd() * 0.4); r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); r.castShadow = r.receiveShadow = true; return at(r, x, islandH(x, z) - s * 0.2, z, 0, scene); };
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, d = 17 + rnd() * 9; rock(Math.cos(a) * d / 0.9, 4 + Math.sin(a) * d / 0.75, 0.6 + rnd() * 1.6); }
  for (let i = 0; i < 14; i++) rock(-19 + (rnd() - 0.5) * 10, 7 + (rnd() - 0.2) * 9, 0.4 + rnd() * 0.9);

  // faro
  const g0 = islandH(0, 0);
  const tower = group(scene, 0, g0, 0);
  const white = tiled(plasterTex('#d9d6cc', 512, 512, 0.2), 3, 4, { r: 0.85 });
  at(cyl(1.7, 2.35, 16, white, 48), 0, 8, 0, 0, tower);
  at(cyl(1.74, 1.78, 1.2, mat('#7a1d18', { r: 0.6 }), 48), 0, 13.6, 0, 0, tower);
  at(cyl(2.4, 2.4, 0.18, iron, 48), 0, 16.05, 0, 0, tower);
  const rail = tor(2.35, 0.03, iron); rail.rotation.x = Math.PI / 2; at(rail, 0, 17.0, 0, 0, tower);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; at(cyl(0.02, 0.02, 0.9, iron, 6), Math.cos(a) * 2.35, 16.55, Math.sin(a) * 2.35, 0, tower); }
  at(cyl(1.4, 1.4, 2.3, new THREE.MeshStandardMaterial({ color: '#8fa5a8', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.35, emissive: '#ffe9b0', emissiveIntensity: 0.25 }), 32, true), 0, 17.3, 0, 0, tower);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; at(box(0.06, 2.3, 0.06, iron), Math.cos(a) * 1.4, 17.3, Math.sin(a) * 1.4, 0, tower); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#28463a', { m: 0.5, r: 0.4 })); at(dome, 0, 18.45, 0, 0, tower); dome.castShadow = true;
  at(sph(0.22, iron), 0, 20.1, 0, 0, tower);
  at(sph(0.45, glow('#fff3d0')), 0, 17.3, 0, 0, tower);
  // haz giratorio (dos conos opuestos)
  const beam = new THREE.Group();
  lightCone(beam, new THREE.Vector3(0, 0, 0), new THREE.Vector3(55, -4, 0), 7, '#ffeec0', 0.32);
  lightCone(beam, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-55, -4, 0), 7, '#ffeec0', 0.32);
  beam.position.set(0, g0 + 17.3, 0); scene.add(beam);
  const beamSpot = new THREE.SpotLight('#ffefc8', 900, 120, 0.12, 0.5, 1.4); beamSpot.position.set(0, g0 + 17.3, 0); scene.add(beamSpot, beamSpot.target);
  const lamp = new THREE.PointLight('#ffe2a0', 30, 30, 1.8); lamp.position.set(0, g0 + 17.3, 0); scene.add(lamp);
  updates.push(t => { const a = t * 0.55; beam.rotation.y = a; beamSpot.target.position.set(Math.cos(-a) * 60, -2, Math.sin(-a) * 60); });

  // casa del farero
  const hy = islandH(8, 1);
  const house = group(scene, 8, hy - 0.3, 1);
  const wallW = tiled(plasterTex('#d4cfc2', 512, 512, 0.35), 3, 1, { r: 0.9 });
  at(box(9, 3.4, 6, wallW), 0, 1.7, 0, 0, house);
  for (const [x, z] of [[-4.5, -3], [4.5, -3], [-4.5, 3], [4.5, 3]]) at(box(0.4, 3.45, 0.4, granite), x, 1.72, z, 0, house);
  const roofShape = new THREE.Shape(); roofShape.moveTo(-3.4, 0); roofShape.lineTo(0, 1.7); roofShape.lineTo(3.4, 0); roofShape.lineTo(-3.4, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 9.6, bevelEnabled: false }), mat('#2c3134', { r: 0.6, m: 0.2 }));
  roof.rotation.y = Math.PI / 2; roof.castShadow = true; at(roof, -4.8, 3.4, 0, 0, house).rotation.y = Math.PI / 2;
  at(box(0.7, 1.6, 0.7, granite), 2.5, 4.6, -0.6, 0, house);
  const winGlow = mat('#ffb45a', { e: '#ff9a3a', ei: 1.6, r: 0.4 });
  for (const x of [-2.8, 2.8]) { at(plane(1.0, 1.2, winGlow), x, 1.9, 3.02, 0, house); at(box(1.2, 1.4, 0.08, mat('#2f5a3a', { r: 0.6 })), x, 1.9, 2.99, 0, house); at(box(0.06, 1.2, 0.1, mat('#2f5a3a')), x, 1.9, 3.05, 0, house); }
  at(box(1.1, 2.2, 0.1, mat('#2f5a3a', { r: 0.5 })), 0, 1.1, 3.02, 0, house);
  at(plane(0.4, 0.4, winGlow), 0, 2.4, 3.08, 0, house);
  const porch = new THREE.PointLight('#ffb460', 6, 9, 1.6); porch.position.set(8, hy + 2.4, 4.6); scene.add(porch);
  // hórreo gallego
  const hor = group(scene, 15.5, islandH(15.5, 7) - 0.1, 7.5, 0.3);
  for (const x of [-1.2, 0, 1.2]) for (const z of [-0.5, 0.5]) { at(box(0.25, 0.9, 0.25, granite), x, 0.45, z, 0, hor); at(cyl(0.3, 0.3, 0.08, granite, 12), x, 0.94, z, 0, hor); }
  at(box(3.0, 1.3, 1.3, wood), 0, 1.65, 0, 0, hor);
  for (let i = 0; i < 9; i++) at(box(0.04, 1.2, 1.32, mat('#2a1d14')), -1.4 + i * 0.35, 1.65, 0, 0, hor);
  const hr = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.85, 0); s.lineTo(0, 0.6); s.lineTo(0.85, 0); s.lineTo(-0.85, 0); return s; })(), { depth: 3.3, bevelEnabled: false }), granite);
  at(hr, -1.65, 2.3, 0, Math.PI / 2, hor);
  at(box(0.06, 0.45, 0.06, granite), 1.5, 3.1, 0, 0, hor); at(box(0.06, 0.06, 0.3, granite), 1.5, 3.2, 0, 0, hor);

  // muelle y caseta
  const dock = group(scene);
  for (let z = 13; z <= 27.5; z += 0.32) at(box(2.3, 0.08, 0.28, wood), 3.1, 0.25, z, (rnd() - 0.5) * 0.02, dock);
  for (let z = 13.5; z <= 27.5; z += 2.2) for (const x of [2.0, 4.2]) at(cyl(0.12, 0.14, 3.2, mat('#2a2018', { r: 0.9 })), x, -1.3, z, 0, dock);
  for (const z of [19, 25]) at(cyl(0.12, 0.15, 0.35, iron), 4.05, 0.45, z, 0, dock);
  // farol del muelle
  const post = group(dock, 2.1, 0.29, 21.5);
  at(cyl(0.05, 0.07, 2.2, iron), 0, 1.1, 0, 0, post);
  at(box(0.22, 0.3, 0.22, mat('#ffe2a8', { e: '#ffb050', ei: 2.2, r: 0.3 })), 0, 2.3, 0, 0, post);
  at(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 4), iron), 0, 2.52, 0, Math.PI / 4, post);
  const dockL = new THREE.PointLight('#ffb460', 14, 16, 1.5); dockL.position.set(2.1, 2.6, 21.5); scene.add(dockL);
  updates.push(t => { dockL.intensity = 14 + Math.sin(t * 7) * 0.8; });
  const shed = group(scene, -2.4, islandH(-2.4, 16) - 0.2, 16.4, 0.15);
  const shedWood = mat('#ffffff', { map: tex(woodTex('#4a3a2c', 10), [1, 1]), r: 0.9 });
  at(box(3.2, 2.4, 0.1, shedWood), 0, 1.2, -1.8, 0, shed);
  at(box(0.1, 2.4, 3.6, shedWood), -1.6, 1.2, 0, 0, shed);
  at(box(0.1, 2.4, 3.6, shedWood), 1.6, 1.2, 0, 0, shed);
  const sr = box(3.6, 0.08, 4.0, mat('#3a3e40', { m: 0.4, r: 0.6 })); sr.rotation.x = 0.12; at(sr, 0, 2.5, 0, 0, shed);
  const shedLight = new THREE.PointLight('#ffb460', 3, 5, 1.6); shedLight.position.set(-2.4, islandH(-2.4, 16) + 2.0, 16.5); scene.add(shedLight);
  at(sph(0.06, glow('#ffd28a')), 0, 2.15, -1.6, 0, shed);
  const crates = group(shed, 0, 0, -0.5);
  const crateM = mat('#ffffff', { map: tex(textTex('⚓ C', { w: 256, h: 256, size: 110, pad: 60, align: 'center', bg: '#7a5a38', color: 'rgba(30,15,5,.75)', font: '"Bodoni Moda", serif', aged: false })), r: 0.85 });
  for (const [x, y, z] of [[-0.5, 0.25, 0], [0.15, 0.25, 0.1], [0.75, 0.25, -0.1], [-0.2, 0.75, 0], [0.45, 0.75, 0.05]]) at(box(0.6, 0.5, 0.5, crateM), x, y, z, (rnd() - 0.5) * 0.3, crates);
  const tarp = box(1.5, 0.04, 0.9, mat('#3a4a3a', { r: 0.95 })); tarp.rotation.z = 0.12; at(tarp, 0.2, 1.03, 0, 0, crates);
  clue('cajas_tabaco', crates);
  // barca de Lino (balanceándose)
  const boat = group(scene, 6.4, -1.0, 22.5, 0.1);
  const hull = (() => { const s = new THREE.Shape(); s.moveTo(0, -2.4); s.quadraticCurveTo(1.1, -1.2, 1.0, 1.6); s.lineTo(-1.0, 1.6); s.quadraticCurveTo(-1.1, -1.2, 0, -2.4); return s; })();
  const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(hull, { depth: 0.75, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }), mat('#2c5d8a', { r: 0.55 }));
  hm.rotation.x = Math.PI / 2; hm.castShadow = true; at(hm, 0, 0.75, 0, 0, boat);
  at(box(1.9, 0.08, 0.3, mat('#d9d4c8', { r: 0.7 })), 0, 0.72, 0.2, 0, boat);
  at(box(1.75, 0.06, 3.6, mat('#3a2a1c', { r: 0.8 })), 0, 0.15, -0.3, 0, boat);
  const packs = group(boat, 0.3, 0.2, 0.25);
  for (let i = 0; i < 5; i++) at(box(0.09, 0.03, 0.055, mat(i % 2 ? '#c9b37a' : '#e8e0c8', { r: 0.7 })), (rnd() - 0.5) * 0.4, 0.02 + (i % 2) * 0.03, (rnd() - 0.5) * 0.2, rnd() * 3, packs);
  clue('cajetillas', packs);
  updates.push(t => { boat.position.y = -1.0 + Math.sin(t * 1.1) * 0.12; boat.rotation.z = Math.sin(t * 0.9) * 0.06; boat.rotation.x = Math.sin(t * 0.7 + 1) * 0.04; });
  // cala: farol rojo escondido
  const lantern = group(scene, -18.1, islandH(-18.1, 8.2) + 0.12, 8.2, -0.8);
  at(cyl(0.11, 0.13, 0.04, iron), 0, 0.02, 0, 0, lantern);
  at(cyl(0.09, 0.09, 0.22, mat('#c01818', { e: '#ff2a1a', ei: 0.6, r: 0.15, op: 0.85 }), 16), 0, 0.15, 0, 0, lantern);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; at(box(0.015, 0.24, 0.015, iron), Math.cos(a) * 0.1, 0.15, Math.sin(a) * 0.1, 0, lantern); }
  at(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 12), iron), 0, 0.31, 0, 0, lantern);
  at(tor(0.06, 0.008, iron), 0, 0.4, 0, 0, lantern);
  clue('linterna_roja', lantern);
  const redGlow = new THREE.PointLight('#ff2a18', 1.2, 3, 2); redGlow.position.set(-18.1, islandH(-18.1, 8.2) + 0.4, 8.2); scene.add(redGlow);
  // clima
  const rainUpd = rain(scene, new THREE.Vector3(-4, 6, 17), new THREE.Vector3(36, 14, 26), 3000, 0.55, '#9fb0c0', 0.2, 0.45);
  scene.add(new THREE.HemisphereLight('#3a4c60', '#0a0a0a', 0.7));
  const flashL = new THREE.DirectionalLight('#c8d4ff', 0); flashL.position.set(-30, 40, 20); scene.add(flashL);
  const moon = new THREE.DirectionalLight('#6a80a0', 0.35); moon.position.set(10, 20, 30); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 90 }); scene.add(moon);
  let flash = 0, nextFlash = 4;
  updates.push((t, dt) => {
    if (t > nextFlash) { flash = 1; nextFlash = t + 6 + rnd() * 9; }
    flash = Math.max(0, flash - dt * 2.4);
    const f = flash > 0.55 ? flash : flash * (Math.sin(t * 60) > 0 ? 0.6 : 0.1);
    flashL.intensity = f * 6;
    (sky.material as THREE.ShaderMaterial).uniforms.flash.value = f;
    seaU.uTime.value = t;
    for (const w of storms) (w.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + f * 3;
  });

  // ================= INTERIORES =================
  const storms: THREE.Mesh[] = [];
  const stormWindow = (parent: THREE.Object3D, x: number, y: number, z: number, ry: number, w = 0.8, hgt = 0.9) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), mat('#0e1824', { e: '#9ab0ff', ei: 0.15, r: 0.2 }));
    storms.push(m); at(m, x, y, z, ry, parent);
    at(box(w + 0.12, 0.06, 0.12, wood), x, y - hgt / 2, z, ry, parent);
    at(box(0.04, hgt, 0.06, wood), x, y, z, ry, parent);
    at(box(w, 0.04, 0.06, wood), x, y, z, ry, parent);
  };
  const floorStone = tiled(stoneTex('#5e5a54'), 3, 3, { r: 0.85, bs: 0.4 });
  const whitewash = tiled(plasterTex('#cfc8b6', 512, 512, 0.3), 2, 1, { r: 0.92 });
  const beams = (parent: THREE.Object3D, x: number, z0: number, z1: number, w: number, h: number) => { for (let z = z0; z > z1; z -= 1.1) at(box(w, 0.16, 0.16, mat('#3a2818', { r: 0.8 })), x, h - 0.08, z, 0, parent); };

  // --- cocina (x 60) ---
  const k = group(scene);
  room(k, { x: 60, z: -3, w: 6, d: 6, h: 2.7, floor: floorStone, wall: whitewash, ceil: mat('#3a2a1c', { r: 0.9 }) });
  beams(k, 60, -0.3, -6, 6, 2.7);
  // lareira
  const hearth = group(k, 58.3, 0, -5.55);
  at(box(1.8, 0.35, 0.9, granite), 0, 0.17, 0, 0, hearth);
  at(box(2.0, 0.9, 1.0, granite), 0, 2.2, 0, 0, hearth);
  at(box(0.2, 1.8, 0.9, granite), -0.9, 1.0, 0, 0, hearth);
  at(box(0.2, 1.8, 0.9, granite), 0.9, 1.0, 0, 0, hearth);
  for (let i = 0; i < 6; i++) { const f = sph(0.08 + rnd() * 0.06, glow(i % 2 ? '#ff5a10' : '#ff9a20'), 8); f.scale.y = 1.6; at(f, (rnd() - 0.5) * 0.6, 0.45, (rnd() - 0.5) * 0.3, 0, hearth); }
  at(sph(0.22, mat('#1a1a1a', { m: 0.6, r: 0.5 })), 0, 0.85, 0, 0, hearth);
  const fire = new THREE.PointLight('#ff7a2a', 6, 7, 1.6); fire.position.set(58.3, 0.7, -5.0); scene.add(fire);
  updates.push(t => { fire.intensity = 6 + Math.sin(t * 13) * 1.0 + Math.sin(t * 4.7) * 0.8; });
  // mesa con quinqué y telegrama
  const table = group(k, 60.3, 0, -3);
  at(box(1.6, 0.07, 0.9, mat('#ffffff', { map: tex(woodTex('#6a4a2e', 3)), r: 0.75 })), 0, 0.78, 0, 0, table);
  for (const [x, z] of [[-0.7, -0.38], [0.7, -0.38], [-0.7, 0.38], [0.7, 0.38]]) at(box(0.07, 0.76, 0.07, wood), x, 0.38, z, 0, table);
  for (const x of [-0.95, 0.95]) at(box(0.25, 0.45, 1.0, wood), x, 0.23, 0, 0, table);
  const oil = group(table, -0.45, 0.815, -0.2);
  at(cyl(0.06, 0.08, 0.12, brass), 0, 0.06, 0, 0, oil);
  at(cyl(0.035, 0.05, 0.2, new THREE.MeshStandardMaterial({ color: '#fff1d0', emissive: '#ffb050', emissiveIntensity: 1.6, transparent: true, opacity: 0.8 })), 0, 0.22, 0, 0, oil);
  const oilL = new THREE.PointLight('#ffb766', 4, 6, 1.6); oilL.position.set(59.85, 1.15, -3.2); scene.add(oilL);
  updates.push(t => { oilL.intensity = 4 + Math.sin(t * 9) * 0.2; });
  at(sph(0.12, mat('#a87a4a', { r: 0.9 })), 0.45, 0.86, 0.15, 0, table).scale.set(1.4, 0.7, 1);
  const tg = plane(0.2, 0.15, paperM(textTex('TELEGRAMA\nVIRXE DO MAR STOP PERDIMOS SU LUZ A LAS 0210 STOP', { w: 384, h: 288, size: 26, pad: 24, bg: '#e9e0c4' })));
  tg.rotation.x = -Math.PI / 2; tg.rotation.z = -0.3;
  const tgG = group(k, 60.4, 0.82, -2.8); tgG.add(tg); clue('telegrama', tgG);
  // vasar con loza y el diario
  const shelf = group(k, 62.88, 0, -1.9, -Math.PI / 2);
  for (const y of [1.2, 1.65]) at(box(1.5, 0.04, 0.26, wood), 0, y, -0.1, 0, shelf);
  for (let i = 0; i < 6; i++) { const p = cyl(0.11, 0.11, 0.015, mat(i % 2 ? '#e8e4dc' : '#2e4a7a', { r: 0.3 }), 24); p.rotation.x = Math.PI / 2 - 0.2; at(p, -0.6 + i * 0.24, 1.78, -0.12, 0, shelf); }
  const diary = group(shelf, 0.35, 1.22, -0.05, 0.25);
  at(box(0.17, 0.03, 0.23, mat('#1a1a1a', { r: 0.35 })), 0, 0.015, 0, 0, diary);
  at(box(0.16, 0.024, 0.22, mat('#ece4d0', { r: 0.9 })), 0.003, 0.016, 0, 0, diary);
  clue('diario', diary);
  for (let i = 0; i < 3; i++) at(box(0.06, 0.2, 0.15, mat(['#5a2a1a', '#2a3a2a', '#4a3a1a'][i])), -0.6 + i * 0.08, 1.32, -0.1, 0, shelf);
  // aparador con la póliza
  const dresser = group(k, 57.32, 0, -1.6, Math.PI / 2);
  at(box(1.4, 0.95, 0.5, wood), 0, 0.48, 0, 0, dresser);
  at(box(1.3, 0.2, 0.05, mat('#4a3020', { r: 0.7 })), 0, 0.78, 0.29, 0, dresser);
  const env = group(dresser, -0.25, 0.96, 0.05, 0.3);
  at(box(0.24, 0.006, 0.15, mat('#d8c9a4', { r: 0.9 })), 0, 0.003, 0, 0, env);
  at(box(0.22, 0.004, 0.13, mat('#f1ead8', { r: 0.9 })), 0.04, 0.008, 0.02, 0.2, env);
  clue('poliza', env);
  // puertas y ventana
  for (const [x, z, ry] of [[57.02, -3.2, Math.PI / 2], [62.98, -3.2, -Math.PI / 2], [61.6, -5.97, 0]] as const) at(box(1.0, 2.1, 0.06, mat('#2f5a3a', { r: 0.6 })), x, 1.05, z, ry, k);
  stormWindow(k, 59.6, 1.6, 0.0 - 0.02, Math.PI);
  stormWindow(k, 62.97, 1.5, -4.6, -Math.PI / 2);

  // --- cuarto del médico (x 80) ---
  const md = group(scene);
  room(md, { x: 80, z: -0.6, w: 4.2, d: 4.4, h: 2.6, floor: tiled(woodTex('#5a3a22', 6), 2, 2, { r: 0.8 }), wall: whitewash, ceil: mat('#3a2a1c', { r: 0.9 }) });
  const bed = group(md, 78.9, 0, -1.6);
  at(box(1.0, 0.25, 1.9, mat('#e3dccb', { r: 0.95 })), 0, 0.5, 0, 0, bed);
  at(box(1.02, 0.08, 1.2, mat('#6a3a3a', { r: 0.95 })), 0, 0.64, 0.3, 0, bed);
  for (const z of [-0.95, 0.95]) at(box(1.05, z < 0 ? 1.0 : 0.6, 0.06, wood), 0, z < 0 ? 0.5 : 0.3, z, 0, bed);
  const bag = group(md, 79.0, 0.68, -1.3, 0.3);
  at(box(0.42, 0.22, 0.2, mat('#141210', { r: 0.4 })), 0, 0.11, 0, 0, bag);
  const bh = tor(0.08, 0.012, mat('#141210', { r: 0.4 }), Math.PI); at(bh, 0, 0.22, 0, 0, bag);
  at(box(0.44, 0.03, 0.04, brass), 0, 0.2, 0, 0, bag);
  at(plane(0.1, 0.05, paperM(textTex('R.C.', { w: 128, h: 64, size: 36, pad: 8, align: 'center', bg: '#141210', color: '#c9a14a', aged: false }))), 0, 0.12, 0.101, 0, bag);
  clue('maletin', bag);
  const shoes = group(md, 79.6, 0.04, -0.5, 0.4);
  for (const x of [-0.07, 0.07]) { const s = box(0.1, 0.07, 0.27, mat('#2a1810', { r: 0.25, m: 0.1 })); at(s, x, 0.035, 0, 0, shoes); }
  decal(shoes, (() => { const [c, g] = cv(64, 64); g.fillStyle = 'rgba(40,30,20,.6)'; g.beginPath(); g.ellipse(32, 32, 28, 20, 0, 0, 7); g.fill(); return c; })(), 0.4, 0.4, 0, -0.03, 0);
  clue('zapatos', shoes);
  const nst = group(md, 80.5, 0, -2.4);
  at(box(0.5, 0.6, 0.4, wood), 0, 0.3, 0, 0, nst);
  at(cyl(0.02, 0.02, 0.1, mat('#efe8d8')), -0.15, 0.65, 0, 0, nst);
  const cflame = at(sph(0.012, glow('#ffd48a')), -0.15, 0.715, 0, 0, nst); cflame.scale.y = 2;
  const candle = new THREE.PointLight('#ffb05a', 2.6, 5, 1.6); candle.position.set(80.35, 0.85, -2.4); scene.add(candle);
  updates.push(t => { candle.intensity = 2.6 + Math.sin(t * 17) * 0.3; });
  const ag = group(nst, 0.08, 0.605, 0.02, 0.2);
  at(box(0.1, 0.012, 0.15, mat('#3a1a1a', { r: 0.5 })), 0, 0, 0, 0, ag);
  at(box(0.095, 0.004, 0.145, mat('#efe6d0')), 0.002, 0.008, 0, 0, ag);
  clue('agenda', ag);
  const chair = group(md, 81.25, 0, -0.9, -0.6);
  at(box(0.45, 0.05, 0.45, wood), 0, 0.45, 0, 0, chair);
  at(box(0.45, 0.6, 0.05, wood), 0, 0.75, -0.22, 0, chair);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) at(box(0.04, 0.45, 0.04, wood), x, 0.22, z, 0, chair);
  const jacket = group(chair, 0, 0.72, -0.17);
  const cloth = mat('#5a4030', { r: 0.95 });
  at(box(0.55, 0.7, 0.12, cloth), 0, -0.05, 0, 0, jacket);
  for (const s of [-1, 1]) { const sl = box(0.13, 0.6, 0.12, cloth); sl.rotation.z = s * 0.15; at(sl, s * 0.33, -0.1, 0, 0, jacket); }
  for (let i = 0; i < 4; i++) if (i !== 2) at(cyl(0.018, 0.018, 0.01, mat('#3a2a1a', { r: 0.4 }), 12), 0.05, 0.15 - i * 0.12, 0.065, 0, jacket).rotation.x = Math.PI / 2;
  clue('chaqueta', jacket);
  const cane = group(md, 81.45, 0, -2.68, 0);
  const shaft = cyl(0.016, 0.014, 0.9, mat('#141010', { r: 0.25 })); shaft.rotation.z = 0.12; at(shaft, -0.05, 0.45, 0, 0, cane);
  const knob = sph(0.04, mat('#d0d0d4', { m: 1, r: 0.22 })); at(knob, -0.1, 0.92, 0, 0, cane);
  uvMark(at(sph(0.043, glow('#7dffb0', 0.85)), -0.1, 0.92, 0.0, 0, cane));
  clue('baston', cane);
  stormWindow(md, 77.92, 1.5, -0.6, Math.PI / 2);
  const mdFill = new THREE.PointLight('#ffc27a', 5, 7, 1.5); mdFill.position.set(80.6, 2.2, 0.9); scene.add(mdFill);
  at(box(0.12, 0.2, 0.12, mat('#ffe2a8', { e: '#ffb050', ei: 1.8 })), 0.6, 2.2, 1.5, 0, md).position.set(80.6, 2.2, 1.52);
  at(box(0.9, 2.05, 0.06, mat('#2f5a3a', { r: 0.6 })), 81.8, 1.03, 1.55, 0, md);

  // --- cuarto de Benigno (x 100) ---
  const bn = group(scene);
  room(bn, { x: 100, z: -0.6, w: 4.2, d: 4.4, h: 2.6, floor: tiled(woodTex('#4a3220', 6), 2, 2, { r: 0.85 }), wall: whitewash, ceil: mat('#3a2a1c', { r: 0.9 }) });
  const bed2 = group(bn, 101.2, 0, -1.6);
  at(box(0.95, 0.25, 1.9, mat('#cfc6b2', { r: 0.95 })), 0, 0.45, 0, 0, bed2);
  at(box(0.97, 0.1, 1.3, mat('#2a3a5a', { r: 0.95 })), 0, 0.6, 0.25, 0.08, bed2);
  const btab = group(bn, 100.2, 0, -2.2);
  at(box(0.7, 0.05, 0.5, wood), 0, 0.72, 0, 0, btab);
  for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) at(box(0.04, 0.72, 0.04, wood), x, 0.36, z, 0, btab);
  const drink = group(btab, 0.05, 0.745, 0.05);
  const bottleM = new THREE.MeshPhysicalMaterial({ color: '#cfe0d4', roughness: 0.05, transmission: 0.7, thickness: 0.05, transparent: true, opacity: 0.85 });
  at(cyl(0.05, 0.05, 0.22, bottleM, 16), -0.08, 0.11, 0, 0, drink);
  at(cyl(0.018, 0.022, 0.08, bottleM, 12), -0.08, 0.26, 0, 0, drink);
  at(cyl(0.045, 0.045, 0.16, mat('#e8d9a0', { r: 0.1, op: 0.55 }), 16), -0.08, 0.09, 0, 0, drink);
  at(cyl(0.035, 0.028, 0.08, bottleM, 16), 0.12, 0.04, 0.05, 0, drink);
  at(cyl(0.026, 0.026, 0.004, mat('#f4f2ec', { r: 0.9 }), 12), 0.12, 0.005, 0.05, 0, drink);
  clue('aguardiente', drink);
  const lampB = new THREE.PointLight('#ffb766', 2.4, 5, 1.6); lampB.position.set(99.6, 1.2, -2.0); scene.add(lampB);
  at(cyl(0.05, 0.06, 0.18, new THREE.MeshStandardMaterial({ color: '#fff1d0', emissive: '#ffb050', emissiveIntensity: 1.2 })), -0.25, 0.84, -0.1, 0, btab);
  // botas de goma e impermeable (son de Benigno: no son las huellas)
  for (const x of [-0.08, 0.08]) at(box(0.12, 0.4, 0.28, mat('#1a1a14', { r: 0.4 })), 98.6 + x, 0.2, -2.3, 0, bn);
  at(box(0.6, 1.1, 0.12, mat('#c9a020', { r: 0.4 })), 98.0 + 0.1, 1.4, -2.75, 0, bn);
  stormWindow(bn, 102.08, 1.5, -0.8, -Math.PI / 2);
  const bnFill = new THREE.PointLight('#ffc27a', 4, 7, 1.5); bnFill.position.set(99.4, 2.2, 0.9); scene.add(bnFill);
  at(box(0.9, 2.05, 0.06, mat('#2f5a3a', { r: 0.6 })), 98.2, 1.03, 1.55, 0, bn);

  // --- torre por dentro (x -60) ---
  const tw = group(scene, -60, 0, 0);
  const towerIn = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 14, 40, 1, true), tiled(plasterTex('#b8b2a4', 512, 512, 0.4), 4, 4, { r: 0.92, side: THREE.BackSide }));
  towerIn.receiveShadow = true; at(towerIn, 0, 7, 0, 0, tw);
  const tf = new THREE.Mesh(new THREE.CircleGeometry(2.35, 40), tiled(stoneTex('#5a5650'), 1, 1, { r: 0.85 })); tf.rotation.x = -Math.PI / 2; tf.receiveShadow = true; tw.add(tf);
  at(cyl(0.22, 0.22, 14, mat('#9a9488', { r: 0.8 }), 20), 0, 7, 0, 0, tw);
  const stepM = mat('#7a766c', { r: 0.8 });
  const steps: THREE.Object3D[] = [];
  for (let i = 0; i < 52; i++) {
    const a = Math.PI * 0.9 + i * 0.3, y = 0.18 + i * 0.2;
    const s = box(1.95, 0.08, 0.55, stepM); s.position.set(Math.cos(a) * 1.25, y, Math.sin(a) * 1.25); s.rotation.y = -a; tw.add(s); steps.push(s);
    if (i % 2 === 0) at(cyl(0.012, 0.012, 0.9, iron, 6), Math.cos(a) * 2.2, y + 0.45, Math.sin(a) * 2.2, 0, tw);
  }
  const helix = new THREE.CatmullRomCurve3(Array.from({ length: 53 }, (_, i) => { const a = Math.PI * 0.9 + i * 0.3; return new THREE.Vector3(Math.cos(a) * 2.2, 1.08 + i * 0.2, Math.sin(a) * 2.2); }));
  tw.add(new THREE.Mesh(new THREE.TubeGeometry(helix, 300, 0.025, 6), iron));
  // huellas de barro en los primeros peldaños
  const prints = group(tw);
  const printC = (() => { const [c, g] = cv(64, 128); g.fillStyle = 'rgba(46,36,24,.85)'; g.beginPath(); g.ellipse(32, 40, 18, 32, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(32, 104, 14, 18, 0, 0, 7); g.fill(); return c; })();
  for (let i = 0; i < 5; i++) {
    const st = steps[i];
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.26), new THREE.MeshStandardMaterial({ map: tex(printC), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    p.rotation.x = -Math.PI / 2; p.rotation.z = -st.rotation.y + Math.PI / 2 + (i % 2 ? 0.1 : -0.1);
    const a = Math.PI * 0.9 + i * 0.3, r = 1.05 + (i % 2) * 0.25;
    p.position.set(Math.cos(a) * r, st.position.y + 0.042, Math.sin(a) * r);
    prints.add(p);
  }
  clue('huellas', prints);
  const out = group(tw, -0.6, 0, 0.9, 2.2);
  decal(out, chalkTex(), 0.85, 1.7, 0, 0.004, 0, { r: 0.9 });
  decal(out, bloodTex(), 0.55, 0.55, 0.08, 0.006, -0.78, { r: 0.2, m: 0.1 });
  clue('silueta', out);
  const tray = group(tw, 0.55, 0.01, 1.35, 0.4);
  at(box(0.3, 0.02, 0.2, mat('#9aa0a6', { m: 0.9, r: 0.3 })), 0, 0.01, 0, 0, tray);
  at(cyl(0.022, 0.022, 0.008, mat('#4a3424', { r: 0.4 }), 14), 0, 0.025, 0, 0, tray);
  at(plane(0.08, 0.04, paperM(textTex('Nº 7', { w: 128, h: 64, size: 34, pad: 10, align: 'center' }))), 0.09, 0.024, 0.05, 0, tray).rotation.x = -Math.PI / 2;
  clue('boton', tray);
  const twl = new THREE.PointLight('#ffb766', 6, 9, 1.5); twl.position.set(-58.2, 2.4, -1.2); scene.add(twl);
  at(sph(0.06, glow('#ffd28a')), 1.85, 2.4, -1.2, 0, tw);
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.9), mat('#0e1824', { e: '#9ab0ff', ei: 0.2 })); storms.push(slit);
  at(slit, -2.32, 2.6, 0.3, Math.PI / 2, tw);
  at(box(0.9, 2.05, 0.08, mat('#2f5a3a', { r: 0.6 })), 1.75, 1.03, 1.55, -0.85, tw);

  // --- sala de la linterna (x -90, y 20) ---
  const lr = group(scene, -90, 20, 0);
  const grating = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#1e2422'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#3a4440'; g.lineWidth = 6; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } return c; })();
  const lf = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), mat('#ffffff', { map: tex(grating, [6, 6]), m: 0.6, r: 0.5 })); lf.rotation.x = -Math.PI / 2; lf.receiveShadow = true; lr.add(lf);
  at(cyl(2.42, 2.42, 1.0, mat('#24382e', { m: 0.4, r: 0.5, side: THREE.BackSide }), 40, true), 0, 0.5, 0, 0, lr);
  at(cyl(2.4, 2.4, 2.4, new THREE.MeshStandardMaterial({ color: '#9fb4b8', roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.18, side: THREE.DoubleSide }), 40, true), 0, 2.2, 0, 0, lr);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; at(box(0.06, 2.4, 0.06, iron), Math.cos(a) * 2.38, 2.2, Math.sin(a) * 2.38, -a, lr); }
  const rimT = tor(2.38, 0.05, iron); rimT.rotation.x = Math.PI / 2; at(rimT, 0, 3.4, 0, 0, lr);
  const lroof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.4, 40, 1, true), mat('#1e2a24', { m: 0.5, r: 0.5, side: THREE.DoubleSide })); at(lroof, 0, 4.1, 0, 0, lr);
  // lente de Fresnel
  const lens = group(lr, 0, 1.15, 0); lens.scale.setScalar(0.8);
  at(cyl(0.45, 0.6, 0.45, mat('#24382e', { m: 0.6, r: 0.4 }), 24), 0, -0.9, 0, 0, lens);
  const prism = new THREE.MeshStandardMaterial({ color: '#d8f0ec', roughness: 0.02, metalness: 0.9, transparent: true, opacity: 0.3, emissive: '#ffe2a0', emissiveIntensity: 0.2 });
  for (let i = 0; i < 9; i++) { const y = -0.55 + i * 0.14, r = 0.78 - Math.abs(i - 4) * 0.05; const ring = tor(r, 0.055, prism); ring.rotation.x = Math.PI / 2; at(ring, 0, y, 0, 0, lens); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; at(box(0.03, 1.3, 0.03, brass), Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82, 0, lens); }
  at(sph(0.16, glow('#fff3d0')), 0, 0, 0, 0, lens);
  const lampIn = new THREE.PointLight('#ffe2a0', 9, 9, 1.6); lampIn.position.set(-90, 21.15, 0); scene.add(lampIn);
  updates.push(t => { lens.rotation.y = t * 0.55; });
  // depósito de parafina con la llave de paso
  const tank = group(lr, 0.8, 0, -1.1, 0.9);
  at(cyl(0.18, 0.18, 0.55, brass, 24), 0, 0.3, 0, 0, tank);
  at(cyl(0.02, 0.02, 0.6, brass), -0.25, 0.5, 0, 0, tank).rotation.z = 1.2;
  const wheel = tor(0.07, 0.012, mat('#7a1d18', { m: 0.4, r: 0.4 })); at(wheel, 0.2, 0.42, 0, Math.PI / 2, tank);
  at(cyl(0.012, 0.012, 0.08, brass), 0.17, 0.42, 0, 0, tank).rotation.z = Math.PI / 2;
  const gauge = plane(0.06, 0.25, mat('#ffffff', { map: tex((() => { const [c, g] = cv(32, 128); g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, 32, 128); g.fillStyle = '#c87a2a'; g.fillRect(4, 64, 24, 60); g.strokeStyle = '#222'; for (let i = 8; i < 128; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(10, i); g.stroke(); } return c; })()), r: 0.4 }));
  at(gauge, 0, 0.32, 0.182, 0, tank);
  clue('valvula', tank);
  // mesa del registro contra el cristal
  const ldesk = group(lr, 1.6, 0, -1.25, -0.75);
  at(box(0.8, 0.05, 0.45, wood), 0, 0.85, 0, 0, ldesk);
  for (const [x, z] of [[-0.35, -0.18], [0.35, -0.18], [-0.35, 0.18], [0.35, 0.18]]) at(box(0.04, 0.85, 0.04, wood), x, 0.42, z, 0, ldesk);
  const book = group(ldesk, 0, 0.88, 0);
  const pages = plane(0.42, 0.3, paperM(textTex('22:00 · NO 7 · OK · A.R.\n00:00 · NO 8 · OK · A.R.\n01:30 · NO 9 · OK · A.R.\n\n02:45 · Lámpara apagada al despertar. Encendida. B.S.', { w: 512, h: 368, size: 24, pad: 24, ruled: true })));
  pages.rotation.x = -Math.PI / 2; at(pages, 0, 0.012, 0, 0, book);
  at(box(0.44, 0.02, 0.32, mat('#2a3a2a', { r: 0.6 })), 0, 0, 0, 0, book);
  clue('registro', book);
  at(box(0.8, 0.04, 0.8, mat('#1e2422', { m: 0.6, r: 0.5 })), -1.1, 0.02, -0.9, 0.4, lr);

  const motesL = dust(scene, new THREE.Vector3(-90, 21.2, 0), new THREE.Vector3(3, 1.6, 3), 120, '#ffe7b0', 0.012, 0.5);
  const motesT = dust(scene, new THREE.Vector3(-60, 2, 0), new THREE.Vector3(3.5, 3, 3.5), 120, '#d8e0ff', 0.012, 0.4);

  return {
    scene, clues, ambience: 'temporal', bloom: 1.0, exposure: 1,
    update(t, dt) { rainUpd(dt); motesL(t); motesT(t); for (const u of updates) u(t, dt); },
    flash: () => flash,
  };
}

