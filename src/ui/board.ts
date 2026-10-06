// Tablero de corcho: fotos clavadas, hilo rojo con muelle (se balancea) y deducciones como notas a mano.
import { h, kids, toast, topLayer } from './dom';
import { photo } from './panels';
import type { Ctx } from '../game/ctx';

const W = 1150, H = 740, CW = 124;
interface Str { a: string; b: string; sag: number; v: number; el: SVGPathElement }

export function openBoard(ctx: Ctx) {
  const g = ctx.game;
  ctx.layer(true);
  ctx.sound.sfx('paper');
  const layer = h('div', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', transformOrigin: '0 0' } });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'strings'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ghost.setAttribute('class', 'ghost');
  const board = h('div', { class: 'board' }, layer);
  const side = h('aside', { class: 'side' });
  const close = () => { removeEventListener('keydown', esc); cancelAnimationFrame(raf); ro.disconnect(); wrap.remove(); ctx.layer(false); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && topLayer() === wrap) close(); };
  addEventListener('keydown', esc);
  const wrap = h('div', { class: 'board-wrap', role: 'dialog', 'aria-label': 'Tablero de deducción' }, board, side);
  document.getElementById('ui')!.appendChild(wrap);
  board.appendChild(h('button', { class: 'close', style: { color: 'var(--papel)', borderColor: 'rgba(232,222,200,.4)', background: 'rgba(20,17,15,.5)' }, onclick: close, 'aria-label': 'Cerrar' }, '✕'));
  const tip = h('div', { class: 'board-tip' }, 'Arrastra las fotos para ordenarlas. Pulsa la chincheta roja de una prueba y luego otra prueba para unirlas con hilo. Pulsa un hilo para quitarlo.');
  board.appendChild(tip);

  let k = 1;
  const fit = () => {
    const r = board.getBoundingClientRect();
    k = Math.min(r.width / W, r.height / H);
    layer.style.transform = `translate(${(r.width - W * k) / 2}px, ${(r.height - H * k) / 2}px) scale(${k})`;
  };
  const ro = new ResizeObserver(fit); ro.observe(board);
  const toLocal = (x: number, y: number) => { const r = layer.getBoundingClientRect(); return { x: (x - r.left) / k, y: (y - r.top) / k }; };

  // posiciones iniciales en rejilla con un poco de desorden
  g.s.found.forEach((id, i) => {
    if (g.s.pos[id]) return;
    const cols = 7, cx = i % cols, cy = Math.floor(i / cols);
    g.s.pos[id] = [40 + cx * 155 + ((i * 37) % 24), 40 + cy * 190 + ((i * 53) % 28)];
  });
  layer.appendChild(svg);
  const cards = new Map<string, HTMLDivElement>();
  let sel: string | null = null;
  const setSel = (id: string | null) => { sel = id; cards.forEach((c, cid) => c.classList.toggle('sel', cid === id)); if (!id) ghost.remove(); };

  const strings: Str[] = [];
  const pin = (id: string) => { const [x, y] = g.s.pos[id]; return { x: x + CW / 2, y: y + 2 }; };
  const addString = (a: string, b: string, kick = 30) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.addEventListener('click', () => { g.unstring(a, b); el.remove(); strings.splice(strings.findIndex(s => s.el === el), 1); ctx.sound.sfx('pick'); });
    svg.appendChild(el);
    strings.push({ a, b, sag: 0, v: kick, el });
  };
  for (const [a, b] of g.s.strings) addString(a, b, 0);

  const tryConnect = (a: string, b: string) => {
    setSel(null);
    if (a === b) return;
    const r = g.connect(a, b);
    if (!r.ok) {
      ctx.sound.sfx('wrong');
      const pa = pin(a), pb = pin(b);
      const f = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      f.setAttribute('d', `M${pa.x},${pa.y} Q${(pa.x + pb.x) / 2},${(pa.y + pb.y) / 2 + 60} ${pb.x},${pb.y}`);
      f.setAttribute('class', 'fall'); svg.appendChild(f); setTimeout(() => f.remove(), 900);
      msg('No hay relación directa entre estas dos pruebas.');
      return;
    }
    if (!strings.some(s => (s.a === a && s.b === b) || (s.a === b && s.b === a))) addString(a, b);
    ctx.sound.sfx('string');
    for (const d of r.formed) { setTimeout(() => ctx.sound.sfx('success'), 250); toast('Deducción', d.title, '!'); }
    drawSide(r.formed.map(d => d.id));
    ctx.refresh();
  };

  let msgEl: HTMLElement | null = null;
  const msg = (t: string) => { msgEl?.remove(); msgEl = h('div', { class: 'board-msg' }, t); board.appendChild(msgEl); setTimeout(() => msgEl?.remove(), 2200); };

  for (const id of g.s.found) {
    const c = g.clue[id];
    const card = h('div', { class: 'pin-card', style: { '--r': `${((id.length * 7) % 9) - 4}deg` } as any, 'data-id': id },
      h('div', { class: 'ph' }, photo(ctx, c)), h('span', { class: 'cap' }, c.name));
    const pinBtn = h('button', { class: 'pin', 'aria-label': `Unir ${c.name}` });
    card.appendChild(pinBtn);
    const place = () => { const [x, y] = g.s.pos[id]; card.style.left = x + 'px'; card.style.top = y + 'px'; };
    place();
    // conectar desde la chincheta (pulsar o arrastrar)
    pinBtn.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault();
      if (sel && sel !== id) return tryConnect(sel, id);
      setSel(id);
      svg.appendChild(ghost);
      const move = (ev: PointerEvent) => { const p = pin(id), q = toLocal(ev.clientX, ev.clientY); ghost.setAttribute('d', `M${p.x},${p.y} Q${(p.x + q.x) / 2},${(p.y + q.y) / 2 + 30} ${q.x},${q.y}`); };
      const up = (ev: PointerEvent) => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        const t = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement)?.closest('.pin-card') as HTMLElement | null;
        if (t && t.dataset.id !== id) tryConnect(id, t.dataset.id!);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
    // arrastrar la foto
    card.addEventListener('pointerdown', e => {
      if (sel && sel !== id) { tryConnect(sel, id); return; }
      if (sel === id) { setSel(null); return; }
      const start = toLocal(e.clientX, e.clientY), [x0, y0] = g.s.pos[id];
      card.setPointerCapture(e.pointerId);
      card.style.zIndex = '5';
      const move = (ev: PointerEvent) => {
        const p = toLocal(ev.clientX, ev.clientY);
        g.s.pos[id] = [Math.max(0, Math.min(W - CW, x0 + p.x - start.x)), Math.max(10, Math.min(H - 160, y0 + p.y - start.y))];
        place();
        for (const s of strings) if (s.a === id || s.b === id) s.v += 1.5;
      };
      const up = () => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerup', up); card.style.zIndex = ''; g.save(); };
      card.addEventListener('pointermove', move); card.addEventListener('pointerup', up);
    });
    cards.set(id, card);
    layer.appendChild(card);
  }
  layer.appendChild(svg);
  board.addEventListener('pointerdown', e => { if (e.target === board || e.target === layer) setSel(null); });

  // muelle del hilo: la comba busca su reposo y oscila al moverse las fotos
  let raf = 0, last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const s of strings) {
      const pa = pin(s.a), pb = pin(s.b);
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const rest = 14 + len * 0.08;
      s.v += ((rest - s.sag) * 60 - s.v * 5) * dt;
      s.sag += s.v * dt;
      s.el.setAttribute('d', `M${pa.x},${pa.y} Q${(pa.x + pb.x) / 2},${(pa.y + pb.y) / 2 + s.sag * 2} ${pb.x},${pb.y}`);
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  const drawSide = (fresh: string[] = []) => {
    const done = g.data.deductions.filter(d => g.s.deductions.includes(d.id));
    const todo = g.data.deductions.filter(d => !g.s.deductions.includes(d.id));
    side.replaceChildren(...kids(
      h('span', { class: 'kicker' }, `${done.length} de ${g.data.deductions.length} deducciones`),
      h('h2', {}, 'Deducciones'),
      h('p', {}, 'Cada deducción une entre dos y tres pruebas. Las deducciones desbloquean opciones en la acusación.'),
      ...done.map((d, i) => h('div', { class: 'note', style: { '--r': `${i % 2 ? 1.2 : -1.4}deg`, animationDelay: fresh.includes(d.id) ? '0s' : '-1s' } as any }, h('b', {}, d.title), h('span', {}, d.text))),
      ...todo.map(d => h('div', { class: 'note locked' }, h('b', {}, 'Por descubrir'), h('span', {}, `Une ${d.requires.length} pruebas relacionadas.`))),
      g.s.timeline ? h('div', { class: 'note', style: { '--r': '1deg', background: '#cfe3c4' } as any }, h('b', {}, g.data.timeline.deduction.title), h('span', {}, g.data.timeline.deduction.text)) : null));
  };
  drawSide();
  fit();
  if (!g.s.found.length) board.appendChild(h('p', { class: 'empty', style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', color: 'var(--papel)' } }, 'Aún no hay pruebas que clavar en el tablero.'));
}
