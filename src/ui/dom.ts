// Helpers mínimos de DOM: h() para crear nodos, iconos SVG en línea y avisos.
type Child = Node | string | null | undefined | false | Child[];
type Attrs = Record<string, any>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}
function append(el: Node, kids: Child[]) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }
}

/** Quita null/false para replaceChildren/append (que si no pintarían «null»). */
export const kids = (...a: any[]): (Node | string)[] => a.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false);

export const ui = () => document.getElementById('ui')!;

const P: Record<string, string> = {
  file: '<path d="M4 4h6l2 2h8v13H4z"/><path d="M4 9h16"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 13.9c2.6-.2 4.4 1.4 4.9 4.6"/>',
  board: '<rect x="3" y="4" width="18" height="15" rx="1"/><circle cx="8" cy="9" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="15" r="1.2"/><path d="M8 9l8-1-4 7z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  seal: '<circle cx="12" cy="12" r="7.5"/><path d="M9 9.5c1-1.3 5-1.3 5 1 0 2.6-5 1.4-5 4 0 2.2 4.2 2.2 5.2.8"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  lupa: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/>',
  girar: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  abrir: '<path d="M4 8h16v11H4z"/><path d="M4 8l3-4h10l3 4"/><path d="M10 12h4"/>',
  frotar: '<path d="M4 20l3-1 11-11-2-2L5 17z"/><path d="M14 6l2 2"/><path d="M3 22h8" stroke-dasharray="2 2"/>',
  uv: '<path d="M9 3h6v5l3 4v9H6v-9l3-4z"/><path d="M12 12v4"/><circle cx="12" cy="18" r=".6"/>',
  comparar: '<path d="M12 3v18M5 7h14"/><path d="M5 7l-3 6h6zM19 7l-3 6h6z"/>',
  leer: '<path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z"/><path d="M12 6v14"/>',
  exit: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
};
export function icon(name: string) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
}

let toastBox: HTMLDivElement | null = null;
export function toast(kicker: string, title: string, mark = 'B') {
  if (!toastBox || !toastBox.isConnected) { toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastBox); }
  const t = h('div', { class: 'toast paper' }, h('span', { class: 'ico' }, mark), h('span', { class: 'kicker' }, kicker), h('b', {}, title));
  toastBox.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}

/** Capa con papel y botón de cerrar; devuelve [contenedor, cerrar]. Esc cierra. */
export function sheet(onClose?: () => void, cls = '') {
  const paper = h('div', { class: 'paper ' + cls, role: 'dialog', 'aria-modal': 'true' });
  const wrap = h('div', { class: 'sheet' }, paper);
  const close = () => {
    removeEventListener('keydown', esc);
    wrap.classList.add('closing');
    setTimeout(() => wrap.remove(), 280);
    onClose?.();
  };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && wrap === topLayer()) close(); };
  addEventListener('keydown', esc);
  paper.appendChild(h('button', { class: 'close', 'aria-label': 'Cerrar', onclick: close }, '✕'));
  ui().appendChild(wrap);
  return [paper, close, wrap] as const;
}

export function topLayer() {
  const all = document.querySelectorAll('.sheet, .board-wrap, .inspect, .docview, .rub, .picker');
  return all[all.length - 1] ?? null;
}

export const rot = (seed: string) => {
  let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) | 0;
  return ((x % 7) - 3) * 0.9 + 'deg';
};

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
