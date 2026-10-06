import { Stage } from './engine/stage';
import { Sound } from './engine/audio';
import { archive } from './archive';
import { play } from './game/play';
import { h } from './ui/dom';
import type { CaseData, World } from './types';
import relojero from './cases/relojero/case.json';
import faro from './cases/faro/case.json';
import galeria from './cases/galeria/case.json';

const CASES: { data: CaseData; scene: () => Promise<{ build: () => World }> }[] = [
  { data: relojero as CaseData, scene: () => import('./cases/relojero/scene') },
  { data: faro as CaseData, scene: () => import('./cases/faro/scene') },
  { data: galeria as CaseData, scene: () => import('./cases/galeria/scene') },
];

const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement);
const sound = new Sound();
const fade = document.getElementById('fade')!;
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

let teardown: () => void = () => {};
let busy = false;

async function route() {
  if (busy) return;
  busy = true;
  const loader = h('div', { class: 'loading' }, h('span', { class: 'k' }, 'Abriendo el archivo…'));
  document.body.appendChild(loader);
  teardown();
  teardown = () => {};
  const m = location.hash.match(/^#\/caso\/(\w+)/);
  const c = m && CASES.find(x => x.data.id === m[1]);
  try {
    if (c) {
      loader.firstElementChild!.textContent = `Expediente ${c.data.num}…`;
      const { build } = await c.scene();
      await new Promise(r => setTimeout(r, 0));
      teardown = play(stage, sound, c.data, build, () => { location.hash = '#/'; });
    } else {
      teardown = archive(stage, sound, CASES, id => { location.hash = `#/caso/${id}`; });
    }
  } catch (e) {
    console.error(e);
    loader.firstElementChild!.textContent = 'No se pudo abrir el expediente. Recarga la página.';
    busy = false;
    return;
  }
  fade.classList.remove('on', 'slow');
  setTimeout(() => { loader.classList.add('gone'); setTimeout(() => loader.remove(), 900); }, 30);
  busy = false;
}

addEventListener('hashchange', route);
// las texturas de los objetos usan estas fuentes: esperar a que carguen antes de construir escenas
Promise.all(['500 40px "Bodoni Moda"', 'italic 500 40px "Bodoni Moda"', '20px "Courier Prime"', '700 20px "Courier Prime"', '20px "Newsreader"', '20px "Reenie Beanie"'].map(f => document.fonts.load(f)))
  .catch(() => {})
  .finally(route);

if (import.meta.env.DEV) (window as any).__sg = { stage, sound, step: (n = 30) => { const s = stage as any, d = s.clock.getDelta; s.clock.getDelta = () => 0.05; for (let i = 0; i < n; i++) s.frame(); s.clock.getDelta = d; } };
