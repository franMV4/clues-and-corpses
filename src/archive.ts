// Portada «Archivo Baker»: la mesa del detective con los expedientes. Al pulsar uno, se rompe el lacre y se abre.
import * as THREE from 'three';
import type { Stage } from './engine/stage';
import type { Sound } from './engine/audio';
import type { CaseData, World } from './types';
import { box, cyl, tor, mat, at, group, tex, cv, textTex, woodTex, dust, rnd, reseed, plane } from './engine/kit';
import { h, ui } from './ui/dom';
import { loadSave } from './game/state';

function leatherTex() {
  const [c, g] = cv(1024, 1024);
  g.fillStyle = '#1c3527'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '120,170,130'},${rnd() * 0.07})`; g.fillRect(rnd() * 1024, rnd() * 1024, 2, 2); }
  for (let i = 0; i < 30; i++) { const x = rnd() * 1024, y = rnd() * 1024, r = 60 + rnd() * 200; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = 'rgba(200,160,80,.55)'; g.lineWidth = 3; g.strokeRect(40, 40, 944, 944);
  g.lineWidth = 1.2; g.strokeRect(52, 52, 920, 920);
  return c;
}

function folderCover(d: CaseData, solved: boolean) {
  const [c, g] = cv(720, 900);
  g.fillStyle = '#c9a66b'; g.fillRect(0, 0, 720, 900);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(90,60,20,${rnd() * 0.08})`; g.fillRect(rnd() * 720, rnd() * 900, 2, 2); }
  const gr = g.createRadialGradient(360, 450, 200, 360, 450, 640); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(70,40,10,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 720, 900);
  g.fillStyle = '#2a1f14';
  g.font = '700 26px "Courier Prime"'; g.fillText('ARCHIVO BAKER', 60, 90);
  g.font = '22px "Courier Prime"'; g.fillText(`EXPEDIENTE Nº ${d.num}`, 60, 126);
  g.fillRect(60, 146, 600, 3);
  // etiqueta pegada
  g.fillStyle = '#efe6d2'; g.fillRect(60, 300, 600, 250);
  g.strokeStyle = 'rgba(40,30,20,.5)'; g.strokeRect(72, 312, 576, 226);
  g.fillStyle = '#1d1712'; g.font = 'italic 500 58px "Bodoni Moda"';
  const words = d.title.split(' '); let line = '', y = 395;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 540 && line) { g.fillText(line, 92, y); y += 62; line = w; } else line = t; }
  g.fillText(line, 92, y);
  g.font = '22px "Courier Prime"'; g.fillStyle = '#5a4630'; g.fillText(`${d.place.toUpperCase()} · ${d.date.toUpperCase()}`, 92, 525);
  // sello de clase
  g.save(); g.translate(470, 700); g.rotate(-0.18);
  g.strokeStyle = solved ? 'rgba(40,90,50,.8)' : 'rgba(142,27,27,.8)'; g.lineWidth = 6; g.strokeRect(-150, -46, 300, 92);
  g.fillStyle = g.strokeStyle; g.font = '700 30px "Courier Prime"'; g.textAlign = 'center';
  g.fillText(solved ? 'RESUELTO' : d.classification.split('·')[0].trim(), 0, 12);
  g.restore();
  return c;
}

export interface CaseEntry { data: CaseData }

export function archive(stage: Stage, sound: Sound, cases: CaseEntry[], go: (id: string) => void) {
  reseed(2026);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0907');
  scene.fog = new THREE.FogExp2('#0b0907', 0.22);
  const clues: Record<string, THREE.Object3D> = {};

  // mesa
  const top = plane(3.6, 2.2, mat('#ffffff', { map: tex(leatherTex()), r: 0.75 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; scene.add(top);
  const woodM = mat('#ffffff', { map: tex(woodTex('#3a2414', 8), [2, 1]), r: 0.45 });
  for (const [x, z, w, d] of [[0, -1.2, 3.9, 0.2], [0, 1.2, 3.9, 0.2], [-1.9, 0, 0.2, 2.6], [1.9, 0, 0.2, 2.6]] as const) at(box(w, 0.06, d, woodM), x, -0.01, z, 0, scene);

  // lámpara de banquero
  const brass = mat('#b08d57', { m: 1, r: 0.28 });
  const lamp = group(scene, 0.95, 0, -0.62, -0.5);
  at(cyl(0.13, 0.15, 0.03, brass), 0, 0.015, 0, 0, lamp);
  at(cyl(0.012, 0.012, 0.42, brass), 0, 0.22, 0, 0, lamp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.12, 32, 1, true, 0, Math.PI), mat('#0f4a2c', { r: 0.25, side: THREE.DoubleSide, m: 0.1 }));
  shade.rotation.z = Math.PI / 2; shade.rotation.y = Math.PI / 2; at(shade, 0, 0.44, 0.05, 0, lamp);
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 12), new THREE.MeshBasicMaterial({ color: '#ffe3a8' })), 0, 0.41, 0.05, 0, lamp).rotation.x = Math.PI / 2;
  const spot = new THREE.SpotLight('#ffd49a', 22, 5, 0.85, 0.65, 1.6);
  spot.position.set(0.85, 0.42, -0.5); spot.target.position.set(-0.05, 0, 0.1);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.radius = 4;
  scene.add(spot, spot.target);
  const fill = new THREE.DirectionalLight('#6d84b8', 0.35); fill.position.set(-2, 2, 1); scene.add(fill);
  scene.add(new THREE.HemisphereLight('#3a3024', '#0b0907', 0.35));
  const motes = dust(scene, new THREE.Vector3(0.3, 0.35, -0.15), new THREE.Vector3(1.4, 0.7, 1), 120, '#ffe1b0', 0.008, 0.35);

  // atrezo: lupa, pipa, tintero, reloj, té, recortes
  const lupa = group(scene, -1.05, 0.012, 0.32, 0.6);
  at(tor(0.085, 0.009, brass), 0, 0, 0, 0, lupa).rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, roughness: 0.02, thickness: 0.02, ior: 1.5 }));
  glass.rotation.x = -Math.PI / 2; at(glass, 0, 0.002, 0, 0, lupa);
  at(box(0.025, 0.02, 0.17, mat('#2a1a10', { r: 0.4 })), 0, 0, 0.17, 0, lupa);
  const ink = group(scene, -0.95, 0, -0.55);
  at(cyl(0.05, 0.06, 0.07, new THREE.MeshPhysicalMaterial({ color: '#16202e', roughness: 0.05, transmission: 0.3, thickness: 0.05 })), 0, 0.035, 0, 0, ink);
  const quill = box(0.008, 0.008, 0.32, mat('#efe8da', { r: 0.9 })); quill.rotation.x = -0.9; quill.rotation.z = 0.2; at(quill, 0.02, 0.17, 0.08, 0, ink);
  const watch = group(scene, 0.62, 0.008, 0.48, 0.4);
  at(cyl(0.05, 0.05, 0.014, mat('#c9a14a', { m: 1, r: 0.25 }), 40), 0, 0, 0, 0, watch);
  at(cyl(0.043, 0.043, 0.002, mat('#efe8d8', { r: 0.4 }), 40), 0, 0.008, 0, 0, watch);
  at(tor(0.012, 0.003, mat('#c9a14a', { m: 1, r: 0.25 })), 0, 0, -0.06, 0, watch);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.07), new THREE.Vector3(0.05, 0, -0.16), new THREE.Vector3(0.16, 0, -0.14), new THREE.Vector3(0.22, 0, -0.24)]), 30, 0.003, 6), mat('#c9a14a', { m: 1, r: 0.3 }));
  watch.add(chain);
  const cup = group(scene, 1.15, 0, 0.18);
  at(cyl(0.11, 0.11, 0.008, mat('#f2ede4', { r: 0.3 }), 40), 0, 0.004, 0, 0, cup);
  at(cyl(0.045, 0.035, 0.065, mat('#f2ede4', { r: 0.3 }), 32), 0, 0.04, 0, 0, cup);
  at(cyl(0.041, 0.041, 0.002, mat('#4a2412', { r: 0.1 })), 0, 0.068, 0, 0, cup);
  for (let i = 0; i < 4; i++) {
    const p = plane(0.24, 0.3, mat('#ffffff', { map: tex(textTex(['THE TIMES · ESQUELAS', 'SE BUSCA TESTIGO', 'CARTA SIN FIRMA', 'INFORME FORENSE'][i] + '\n\n' + 'Lorem ipsum '.repeat(30), { w: 256, h: 320, size: 13, pad: 16 })), r: 0.9 }));
    p.rotation.x = -Math.PI / 2; p.rotation.z = rnd() * 1.2 - 0.6; p.receiveShadow = true;
    at(p, [-1.35, 1.45, -0.55, 1.3][i], 0.002 + i * 0.0005, [-0.15, -0.35, 0.62, 0.7][i], 0, scene);
  }

  // expedientes
  const folders: { id: string; g: THREE.Group; cover: THREE.Group; seal: THREE.Group; y: number; open: number }[] = [];
  cases.forEach((c, i) => {
    const solved = !!loadSave(c.data.id)?.done?.ok;
    const g = group(scene, (i - 1) * 0.5, 0, 0.05 + (i === 1 ? -0.04 : 0.02), (i - 1) * -0.07 + (rnd() - 0.5) * 0.06);
    const kraft = mat('#c19d63', { r: 0.85 });
    at(box(0.36, 0.006, 0.46, kraft), 0, 0.003, 0, 0, g);
    const tab = box(0.12, 0.006, 0.04, kraft); at(tab, 0.08 - i * 0.05, 0.003, -0.245, 0, g);
    for (let k = 0; k < 3; k++) at(box(0.33, 0.002, 0.43, mat(k % 2 ? '#e9e1cf' : '#f1ebdd', { r: 0.9 })), 0.008 * k - 0.004, 0.008 + k * 0.002, 0.004 * k, 0.02 * (k - 1), g);
    const cover = group(g, -0.18, 0.016, 0);
    const front = box(0.36, 0.005, 0.46, [kraft, kraft, mat('#ffffff', { map: tex(folderCover(c.data, solved)), r: 0.85 }), kraft, kraft, kraft] as any);
    at(front, 0.18, 0, 0, 0, cover);
    const seal = group(g, 0.165, 0.02, 0.06);
    const wax = mat('#8e1b1b', { r: 0.35, m: 0.05 });
    for (const s of [-1, 1]) {
      const half = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.037, 0.008, 24, 1, false, s < 0 ? 0 : Math.PI, Math.PI), wax);
      half.castShadow = true; half.userData.side = s; seal.add(half);
    }
    at(tor(0.022, 0.003, mat('#6e1212', { r: 0.4 })), 0, 0.005, 0, 0, seal).rotation.x = Math.PI / 2;
    if (solved) seal.visible = false;
    clues[c.data.id] = g;
    folders.push({ id: c.data.id, g, cover, seal, y: 0, open: 0 });
  });

  let opening: (typeof folders)[number] | null = null;
  let openT = 0;
  const shards: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
  let hot: string | null = null;

  const world: World = {
    scene, clues, ambience: 'archivo', bloom: 0.8, exposure: 1, liveShadows: true,
    update(t, dt) {
      motes(t);
      spot.intensity = 22 + Math.sin(t * 13) * 0.25 + Math.sin(t * 7.3) * 0.2;
      const hov = stage.hover ?? hot;
      for (const f of folders) {
        const want = f === opening ? 0.06 : f.id === hov ? 0.035 : 0;
        f.y += (want - f.y) * (1 - Math.pow(0.001, dt));
        f.g.position.y = f.y;
      }
      document.querySelectorAll<HTMLElement>('.case-row').forEach(r => r.classList.toggle('hot', r.dataset.id === hov));
      if (opening) {
        openT += dt;
        // el lacre se parte y salen esquirlas
        for (const half of opening.seal.children) if (half.userData.side) { half.position.x += half.userData.side * dt * 0.25; half.rotation.z += half.userData.side * dt * 2; half.position.y -= dt * 0.05; }
        for (const s of shards) { s.v.y -= 2.5 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 8; }
        const k = Math.min(1, Math.max(0, (openT - 0.35) / 0.9));
        opening.cover.rotation.z = (k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2) * 2.9;
      }
    },
  };

  stage.canClick = () => !opening;
  stage.isDone = () => false;
  stage.markerLabel = n => n.label;
  stage.onNode = undefined;
  stage.onClue = id => open(id);
  stage.setWorld(world, [{ id: 'mesa', label: 'Mesa', area: 'mesa', pos: [0, 1.32, 1.02], look: [0, 0, -0.06], marker: [0, 0, 0], links: [] }], 'mesa');
  sound.ambience('archivo');

  const open = (id: string) => {
    if (opening) return;
    const f = folders.find(x => x.id === id)!;
    opening = f; openT = 0;
    sound.sfx('seal');
    setTimeout(() => sound.sfx('paper'), 400);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.004 + rnd() * 0.005), mat('#8e1b1b', { r: 0.4 }));
      m.position.copy(f.seal.getWorldPosition(new THREE.Vector3()));
      scene.add(m);
      shards.push({ m, v: new THREE.Vector3((rnd() - 0.5) * 0.8, 0.5 + rnd() * 0.6, (rnd() - 0.5) * 0.8) });
    }
    // la cámara se acerca a la carpeta
    const p = f.g.position;
    stage.nodes['zoom'] = { id: 'zoom', label: '', area: 'mesa', pos: [p.x * 0.8, 0.62, p.z + 0.32], look: [p.x - 0.06, 0, p.z - 0.02], marker: [0, 0, 0], links: [] };
    stage.goto('zoom');
    setTimeout(() => { const fd = document.getElementById('fade')!; fd.classList.add('slow', 'on'); }, 1100);
    setTimeout(() => go(id), 2000);
  };

  // capa DOM: marca y lista de casos
  const list = h('div', { class: 'case-list', role: 'list' }, cases.map(c => {
    const s = loadSave(c.data.id);
    const st = s?.done ? (s.done.ok ? `Resuelto · ${s.done.rank}` : 'Archivado') : s?.found.length ? 'En curso' : 'Sin abrir';
    return h('button', { class: 'case-row', role: 'listitem', 'data-id': c.data.id, onclick: () => open(c.data.id), onmouseenter: () => { hot = c.data.id; }, onmouseleave: () => { hot = null; }, onfocus: () => { hot = c.data.id; } },
      h('span', { class: 'no' }, c.data.num),
      h('span', {}, h('b', {}, c.data.title), h('small', {}, `${c.data.place}, ${c.data.date.split(' ').pop()} · ${c.data.minutes} min`, h('span', { class: 'diff' }, [1, 2, 3].map(i => h('i', { class: i <= c.data.difficulty ? 'f' : '' }))))),
      h('span', { class: 'st' + (s?.done?.ok ? ' ok' : '') }, st));
  }));
  ui().replaceChildren(h('div', { class: 'archive' },
    h('div', { class: 'brand' },
      h('span', { class: 'kicker' }, 'Archivo Baker · Expedientes reabiertos'),
      h('h1', {}, 'Clues ', h('i', {}, '& Corpses')),
      h('p', {}, 'Tres crímenes que se dieron por cerrados. Recorre la escena, examina cada objeto y señala al culpable.')),
    list));

  document.body.classList.add('archive-on');
  return () => { document.body.classList.remove('archive-on'); ui().replaceChildren(); document.getElementById('fade')!.classList.remove('slow'); };
}

