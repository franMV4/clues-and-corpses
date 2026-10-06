// Capa de inspección: el objeto girable a la izquierda y la ficha con acciones (lupa, girar, abrir, frotar, UV, comparar).
import { h, kids, icon, toast, topLayer } from './dom';
import type { Ctx } from '../game/ctx';
import type { ActionDef } from '../types';

const KIND: Record<string, string> = { objeto: 'Objeto', documento: 'Documento', testimonio: 'Testimonio', hallazgo: 'Hallazgo' };
const HELP = 'Arrastra para girar · Rueda o pellizco para acercar · Esc para salir';

export function openInspect(ctx: Ctx, id: string) {
  const g = ctx.game, c = g.clue[id], src = ctx.world.clues[id];
  if (!src) return;
  ctx.layer(true);
  ctx.sound.sfx('open');
  const fresh = g.examine(id);
  if (fresh) { toast('Pista añadida al expediente', c.name, '+'); ctx.sound.sfx('clue'); ctx.refresh(); }

  const view = h('div', { class: 'view' });
  const card = h('div', { class: 'card paper' });
  const help = h('div', { class: 'help' }, HELP);
  const close = () => {
    removeEventListener('keydown', esc);
    ctx.inspector.close();
    host.appendChild(ctx.inspector.canvas);
    host.appendChild(ctx.inspector.ring);
    wrap.remove();
    ctx.layer(false);
  };
  const esc = (e: KeyboardEvent) => {
    if (topLayer() !== wrap) return;
    if (e.key === 'Escape') close();
    if (e.key.toLowerCase() === 'l') toggleLens();
  };
  addEventListener('keydown', esc);
  const wrap = h('div', { class: 'inspect', role: 'dialog', 'aria-label': `Examinar ${c.name}` }, view, card);
  document.getElementById('ui')!.appendChild(wrap);
  const host = ctx.inspector.canvas.parentElement!;
  view.append(ctx.inspector.canvas, ctx.inspector.ring, help,
    h('button', { class: 'close', style: { color: 'var(--papel)', borderColor: 'rgba(232,222,200,.4)' }, onclick: close, 'aria-label': 'Cerrar' }, '✕'));
  ctx.inspector.open(src);

  let lensFor = -1;
  const toggleLens = () => {
    const i = (c.actions ?? []).findIndex((a, j) => a.type === 'lupa' && !g.isRevealed(id, j));
    const on = !ctx.inspector.lens;
    ctx.inspector.setLens(on);
    lensFor = on ? i : -1;
    help.textContent = on ? 'Pasa la lupa despacio por el objeto · L para guardarla' : HELP;
    draw();
  };
  ctx.inspector.onLupa = () => {
    if (lensFor < 0) return;
    const i = lensFor;
    ctx.inspector.setLens(false);
    lensFor = -1;
    help.textContent = HELP;
    reveal(i);
  };

  const reveal = (i: number) => {
    const before = g.isRevealed(id, i);
    const unlocked = g.reveal(id, i);
    if (!before) ctx.sound.sfx('clue');
    if (unlocked) { toast('Nuevo hallazgo', unlocked.name, '!'); ctx.refresh(); }
    draw(i);
  };

  const run = (a: ActionDef, i: number) => {
    if (g.isRevealed(id, i) && a.type !== 'lupa' && a.type !== 'uv') return;
    switch (a.type) {
      case 'lupa': toggleLens(); break;
      case 'girar': ctx.sound.sfx('flip'); ctx.inspector.flip(); setTimeout(() => reveal(i), 700); break;
      case 'abrir': case 'comparar': ctx.sound.sfx('open'); ctx.inspector.flip(); setTimeout(() => reveal(i), 650); break;
      case 'uv': { const on = !ctx.inspector.uv; ctx.inspector.setUV(on); ctx.sound.sfx('pick'); if (on) setTimeout(() => reveal(i), 900); draw(); break; }
      case 'frotar': rub(ctx, a.rub ?? a.reveals, () => reveal(i)); break;
      case 'leer': ctx.doc(c); break;
    }
  };

  const draw = (justRevealed = -1) => {
    card.replaceChildren(...kids(
      h('span', { class: 'tag' }, KIND[c.kind]),
      h('h3', {}, c.name),
      h('p', {}, c.desc),
      c.actions?.length || c.doc ? h('div', { class: 'actions' },
        c.doc ? h('button', { class: 'act', onclick: () => ctx.doc(c) }, h('span', { html: icon('leer') }), 'Leer el documento') : null,
        (c.actions ?? []).map((a, i) => h('button', {
          class: 'act' + (g.isRevealed(id, i) ? ' done' : '') + ((a.type === 'lupa' && lensFor === i) || (a.type === 'uv' && ctx.inspector.uv) ? ' on' : ''),
          onclick: () => run(a, i),
        }, h('span', { html: icon(a.type) }), a.label + (g.isRevealed(id, i) ? '  ✓' : '')))) : null,
      ...(c.actions ?? []).map((a, i) => g.isRevealed(id, i) ? h('p', { class: 'finding', style: i === justRevealed ? { animation: 'glowIn 1.4s var(--curva)' } : {} }, a.reveals) : null),
      h('div', { class: 'row', style: { marginTop: '18px' } }, h('button', { class: 'btn', onclick: close }, 'Volver a la escena'))));
  };
  draw();
}

/** Frotar con lápiz una hoja con surcos: el grafito revela el texto marcado. */
function rub(ctx: Ctx, text: string, done: () => void) {
  const W = 560, H = 380;
  const cvs = h('canvas', { width: W * 2, height: H * 2 });
  const g = cvs.getContext('2d')!;
  // la hoja
  g.scale(2, 2);
  g.fillStyle = '#ece3cf'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(90,60,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // máscara con el texto en surco
  const [mk, mg] = [document.createElement('canvas'), null as any];
  mk.width = W * 2; mk.height = H * 2;
  const m = mk.getContext('2d')!; m.scale(2, 2);
  m.fillStyle = '#000'; m.font = '28px "Reenie Beanie", cursive';
  let y = 60;
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (m.measureText(t).width > W - 80 && line) { m.fillText(line, 40, y); y += 34; line = w; } else line = t; }
    m.fillText(line, 40, y); y += 34;
  }
  void mg;
  const maskData = m.getImageData(0, 0, W * 2, H * 2).data;
  let covered = 0, total = 0;
  const hit = new Uint8Array((W / 10 | 0) * (H / 10 | 0));
  for (let yy = 0; yy < H; yy += 10) for (let xx = 0; xx < W; xx += 10) if (maskData[((yy * 2) * W * 2 + xx * 2) * 4 + 3] > 0) total++;
  const cell = (x: number, y2: number) => (y2 / 10 | 0) * (W / 10 | 0) + (x / 10 | 0);

  let stop: (() => void) | null = null;
  let finished = false;
  const stroke = (x: number, y2: number) => {
    // grafito encima, salvo donde están los surcos (que quedan claros)
    for (let i = 0; i < 14; i++) {
      const px = x + (Math.random() - 0.5) * 34, py = y2 + (Math.random() - 0.5) * 22;
      const mi = ((Math.round(py) * 2) * W * 2 + Math.round(px) * 2) * 4 + 3;
      if (maskData[mi] > 40) continue;
      g.fillStyle = `rgba(48,46,50,${0.18 + Math.random() * 0.2})`;
      g.fillRect(px, py, 3 + Math.random() * 4, 1.4);
    }
    for (let dx = -20; dx <= 20; dx += 10) for (let dy = -10; dy <= 10; dy += 10) {
      const xx = x + dx, yy = y2 + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const ci = cell(xx, yy);
      if (!hit[ci] && maskData[((Math.floor(yy / 10) * 10 * 2) * W * 2 + Math.floor(xx / 10) * 10 * 2) * 4 + 3] > 0) { hit[ci] = 1; covered++; }
    }
    if (!finished && covered > total * 0.55) {
      finished = true;
      setTimeout(() => { close(); done(); }, 900);
    }
  };
  const close = () => { stop?.(); removeEventListener('keydown', esc); wrap.remove(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && topLayer() === wrap) close(); };
  addEventListener('keydown', esc);
  cvs.addEventListener('pointerdown', e => { cvs.setPointerCapture(e.pointerId); stop = ctx.sound.scratch(); draw(e); });
  const draw = (e: PointerEvent) => { const r = cvs.getBoundingClientRect(); stroke(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H); };
  cvs.addEventListener('pointermove', e => { if (e.buttons) draw(e); });
  cvs.addEventListener('pointerup', () => { stop?.(); stop = null; });
  const wrap = h('div', { class: 'rub' }, h('div', { class: 'wrap' }, cvs, h('p', {}, 'Frota la hoja con el lápiz (arrastra) para que aparezcan las marcas del papel'), h('button', { class: 'close', style: { color: 'var(--papel)', top: '-30px', right: '0' }, onclick: close }, '✕')));
  document.getElementById('ui')!.appendChild(wrap);
}
