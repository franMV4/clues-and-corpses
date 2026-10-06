// Paneles de papel: expediente, sospechosos, cronología, acusación, ayudas, informe inicial, documentos y resultado.
import { h, kids, sheet, icon, rot, toast, topLayer, fmtTime } from './dom';
import type { Ctx } from '../game/ctx';
import type { ClueDef } from '../types';

const KIND: Record<string, string> = { objeto: 'Objeto', documento: 'Documento', testimonio: 'Testimonio', hallazgo: 'Hallazgo' };

export function photo(ctx: Ctx, c: ClueDef) {
  const t = ctx.thumb(c.id);
  if (t) return h('img', { src: t, alt: '' });
  if (c.kind === 'testimonio') return h('span', { class: 'say-ico' }, '«»');
  return h('span', { class: 'doc-ico' });
}

export function polaroid(ctx: Ctx, c: ClueDef, onclick: () => void, sel = false) {
  return h('button', { class: 'polaroid' + (sel ? ' sel' : ''), style: { '--r': rot(c.id) } as any, onclick, 'aria-label': c.name },
    h('div', { class: 'ph' }, photo(ctx, c)),
    h('span', { class: 'cap' }, c.name));
}

function findings(ctx: Ctx, c: ClueDef) {
  return (c.actions ?? []).map((a, i) => ctx.game.isRevealed(c.id, i) ? h('p', { class: 'finding' }, a.reveals) : null);
}

// ---------- expediente ----------
export function openFiles(ctx: Ctx, focus?: string) {
  const g = ctx.game;
  ctx.layer(true);
  const [p] = sheet(() => ctx.layer(false));
  ctx.sound.sfx('paper');
  const found = g.s.found.map(id => g.clue[id]);
  let sel = focus ?? found[found.length - 1]?.id;
  const total = g.data.clues.length;
  const cards = h('div', { class: 'cards' });
  const detail = h('div', { class: 'detail' });
  const draw = () => {
    cards.replaceChildren(...found.map(c => polaroid(ctx, c, () => { sel = c.id; draw(); }, c.id === sel)));
    const c = sel ? g.clue[sel] : null;
    detail.replaceChildren(c
      ? h('div', {},
        h('div', { class: 'big' }, photo(ctx, c)),
        h('span', { class: 'tag' }, KIND[c.kind]),
        h('h3', {}, c.name),
        h('p', {}, c.desc),
        ...findings(ctx, c),
        h('div', { class: 'row', style: { marginTop: '14px' } },
          c.doc ? h('button', { class: 'btn', onclick: () => ctx.doc(c) }, 'Leer documento') : null,
          c.node ? h('button', { class: 'btn', onclick: () => ctx.inspect(c.id) }, 'Examinar de nuevo') : null))
      : h('p', { class: 'empty' }, 'Todavía no has recogido ninguna pista.'));
  };
  p.append(
    h('span', { class: 'kicker' }, `Expediente ${g.data.num} · ${g.s.found.length} de ${total} pruebas`),
    h('h2', {}, 'Pruebas ', h('em', {}, 'reunidas')),
    h('hr', { class: 'rule' }),
    found.length ? h('div', { class: 'files' }, cards, detail) : h('p', { class: 'empty' }, 'El expediente está vacío. Recorre la escena y pulsa los objetos para examinarlos.'));
  draw();
}

// ---------- selector de pruebas ----------
export function pickClue(ctx: Ctx, title: string, onPick: (id: string) => void) {
  const g = ctx.game;
  const close = () => { removeEventListener('keydown', esc); wrap.remove(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && topLayer() === wrap) close(); };
  addEventListener('keydown', esc);
  const wrap = h('div', { class: 'picker', onclick: (e: Event) => { if (e.target === wrap) close(); } },
    h('div', { class: 'drawer paper' },
      h('button', { class: 'close', onclick: close, 'aria-label': 'Cerrar' }, '✕'),
      h('span', { class: 'kicker' }, 'Presentar prueba'),
      h('h2', { style: { fontSize: '30px' } }, title),
      h('div', { class: 'cards', style: { marginTop: '16px' } }, g.s.found.map(id => polaroid(ctx, g.clue[id], () => { close(); onPick(id); })))));
  document.getElementById('ui')!.appendChild(wrap);
}

// ---------- sospechosos ----------
export function openSuspects(ctx: Ctx, focus?: string) {
  const g = ctx.game;
  ctx.layer(true);
  const [p] = sheet(() => ctx.layer(false));
  ctx.sound.sfx('paper');
  let sel = focus ?? g.data.suspects[0].id;
  const list = h('div', { class: 'sus-list' });
  const body = h('div', {});
  const fresh = new Set<string>();
  const draw = () => {
    list.replaceChildren(...g.data.suspects.map(s => h('button', { class: 'sus-tab' + (s.id === sel ? ' sel' : ''), onclick: () => { sel = s.id; draw(); } },
      h('img', { src: ctx.portrait(s.id), alt: '' }), h('div', {}, h('b', {}, s.name), h('span', {}, s.role)))));
    const s = g.data.suspects.find(x => x.id === sel)!;
    body.replaceChildren(h('div', { class: 'dossier' },
      h('div', { class: 'mug' }, h('span', { class: 'clip' }), h('img', { src: ctx.portrait(s.id), alt: `Retrato de ${s.name}` })),
      h('div', {},
        h('span', { class: 'kicker' }, s.role),
        h('h3', {}, s.name),
        h('dl', { class: 'facts' },
          h('dt', {}, 'Edad'), h('dd', {}, `${s.age} años`),
          h('dt', {}, 'Quién es'), h('dd', {}, s.bio),
          h('dt', {}, 'Coartada'), h('dd', {}, s.alibi)),
        h('span', { class: 'kicker' }, 'Declaraciones'),
        ...g.visibleStatements(s.id).map(st => {
          const contra = g.isContradicted(s.id, st.id);
          const el = h('div', { class: 'stmt' + (contra ? ' contra' : '') + (fresh.has(s.id + st.id) ? ' new-stmt' : '') },
            contra ? h('span', { class: 'stamp-mini' }, 'CONTRADICHO') : null,
            h('q', {}, st.text),
            contra && st.reply ? h('div', { class: 'reply' }, '— ' + st.reply) : null,
            !contra && st.contradictedBy ? h('button', {
              class: 'btn', onclick: () => pickClue(ctx, `¿Qué contradice a ${s.name.split(' ')[0]}?`, cid => {
                const r = g.present(s.id, st.id, cid);
                if (r.ok) {
                  ctx.sound.sfx('stamp');
                  for (const u of st.unlocks ?? []) fresh.add(s.id + u);
                  if (r.clue) { toast('Nuevo testimonio', r.clue.name, '«'); ctx.sound.sfx('clue'); }
                  draw(); ctx.refresh();
                } else {
                  ctx.sound.sfx('wrong');
                  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
                  toast('No encaja', `${g.clue[cid].name} no contradice esa declaración`, '?');
                  ctx.refresh();
                }
              }),
            }, 'Presentar prueba') : null);
          return el;
        }))));
  };
  p.append(h('span', { class: 'kicker' }, 'Sala de interrogatorios'), h('h2', {}, 'Los ', h('em', {}, 'sospechosos')), h('hr', { class: 'rule' }), h('div', { class: 'suspects' }, list, body));
  draw();
}

// ---------- cronología ----------
export function openTimeline(ctx: Ctx) {
  const g = ctx.game;
  ctx.layer(true);
  const [p] = sheet(() => ctx.layer(false));
  ctx.sound.sfx('paper');
  const ev = g.data.timeline.events;
  const key = `sg.tl.${g.data.id}`;
  let order: string[] = (() => { try { const o = JSON.parse(localStorage.getItem(key) || 'null'); if (o?.length === ev.length) return o; } catch { /* */ } return shuffle(ev.map(e => e.id), g.data.id); })();
  if (g.s.timeline) order = ev.map(e => e.id);
  const list = h('ol', { class: 'tl' + (g.s.timeline ? ' solved' : '') });
  const msg = h('div', {});
  const save = () => { try { localStorage.setItem(key, JSON.stringify(order)); } catch { /* */ } };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; save(); draw(); ctx.sound.sfx('pick'); };
  const draw = () => {
    list.replaceChildren(...order.map((id, i) => {
      const e = ev.find(x => x.id === id)!;
      const li = h('li', { 'data-id': id },
        h('span', { class: 'time' + (g.s.timeline ? '' : ' hid') }, g.s.timeline ? e.time : '··:··'),
        h('span', {}, e.text),
        g.s.timeline ? h('span', {}) : h('span', { class: 'mv' }, h('button', { 'aria-label': 'Subir', onclick: () => move(i, -1) }, '↑'), h('button', { 'aria-label': 'Bajar', onclick: () => move(i, 1) }, '↓')));
      if (!g.s.timeline) dragSort(li, list, () => { order = [...list.children].map(c => (c as HTMLElement).dataset.id!); save(); ctx.sound.sfx('pick'); });
      return li;
    }));
    msg.replaceChildren(g.s.timeline
      ? h('div', { class: 'note', style: { '--r': '-1deg', maxWidth: '560px' } as any }, h('b', {}, g.data.timeline.deduction.title), h('span', {}, g.data.timeline.deduction.text))
      : h('div', { class: 'row', style: { marginTop: '18px' } }, h('button', {
        class: 'btn red', onclick: () => {
          if (g.checkTimeline(order)) { ctx.sound.sfx('success'); toast('Cronología', 'Los hechos encajan', '✓'); list.classList.add('solved'); draw(); ctx.refresh(); }
          else { ctx.sound.sfx('wrong'); list.classList.remove('shake'); void list.offsetWidth; list.classList.add('shake'); }
        },
      }, 'Comprobar orden'), h('span', { class: 'lead', style: { fontSize: '14px' } }, 'Ordena los hechos del primero al último. Las horas se revelan al acertar.')));
  };
  p.append(h('span', { class: 'kicker' }, 'Reconstrucción'), h('h2', {}, 'La ', h('em', {}, 'cronología')), h('hr', { class: 'rule' }), list, msg);
  draw();
}

function shuffle(a: string[], seed: string) {
  let x = 0; for (const c of seed) x = (x * 33 + c.charCodeAt(0)) >>> 0;
  const r = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  if (o.join() === a.join()) [o[0], o[1]] = [o[1], o[0]];
  return o;
}

/** Reordenar <li> arrastrando con el puntero (ratón o dedo). */
function dragSort(li: HTMLElement, list: HTMLElement, done: () => void) {
  li.addEventListener('pointerdown', e => {
    if ((e.target as HTMLElement).closest('button')) return;
    li.setPointerCapture(e.pointerId);
    li.classList.add('drag');
    const move = (ev: PointerEvent) => {
      const sibs = [...list.children].filter(c => c !== li) as HTMLElement[];
      const after = sibs.find(s => { const r = s.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; }) ?? null;
      if (after !== li.nextElementSibling) list.insertBefore(li, after);
    };
    const up = () => { li.classList.remove('drag'); li.removeEventListener('pointermove', move); li.removeEventListener('pointerup', up); done(); };
    li.addEventListener('pointermove', move);
    li.addEventListener('pointerup', up);
  });
}

// ---------- acusación ----------
export function openAccuse(ctx: Ctx) {
  const g = ctx.game;
  if (g.s.done) return showResult(ctx);
  ctx.layer(true);
  const [p, close] = sheet(() => ctx.layer(false));
  ctx.sound.sfx('paper');
  const pick = { c: '', m: '', mo: '' };
  const cols = h('div', { class: 'accuse-grid' });
  const foot = h('div', { class: 'row', style: { marginTop: '24px', justifyContent: 'space-between' } });
  const lockedTxt = '▒▒▒▒▒▒ Necesitas una deducción del tablero para esta opción';
  const draw = () => {
    const a = g.data.accusation;
    cols.replaceChildren(
      h('div', {}, h('h4', {}, 'I · Culpable'), g.data.suspects.map(s => h('button', { class: 'opt who' + (pick.c === s.id ? ' sel' : ''), onclick: () => { pick.c = s.id; ctx.sound.sfx('pick'); draw(); } },
        h('img', { src: ctx.portrait(s.id), alt: '' }), h('span', {}, h('b', {}, s.name), s.role)))),
      h('div', {}, h('h4', {}, 'II · Cómo lo hizo'), a.methods.map(o => g.unlocked(o)
        ? h('button', { class: 'opt' + (pick.m === o.id ? ' sel' : ''), onclick: () => { pick.m = o.id; ctx.sound.sfx('pick'); draw(); } }, o.text)
        : h('div', { class: 'opt locked' }, lockedTxt))),
      h('div', {}, h('h4', {}, 'III · Por qué'), a.motives.map(o => g.unlocked(o)
        ? h('button', { class: 'opt' + (pick.mo === o.id ? ' sel' : ''), onclick: () => { pick.mo = o.id; ctx.sound.sfx('pick'); draw(); } }, o.text)
        : h('div', { class: 'opt locked' }, lockedTxt))));
    foot.replaceChildren(
      h('div', { class: 'seals', title: 'Intentos que te quedan' }, [0, 1, 2].map(i => h('span', { class: 'seal' + (i < g.s.attempts ? ' used' : '') }, 'B')), h('span', { class: 'kicker', style: { marginLeft: '8px' } }, `${g.attemptsLeft} intentos`)),
      h('button', {
        class: 'btn red', disabled: !(pick.c && pick.m && pick.mo) || undefined, onclick: () => {
          const r = g.accuse(pick.c, pick.m, pick.mo);
          ctx.refresh();
          if (r.over) { close(); setTimeout(() => showResult(ctx), 320); return; }
          ctx.sound.sfx('wrong');
          toast('Acusación rechazada', r.right === 2 ? 'Dos de las tres piezas encajan' : r.right === 1 ? 'Solo una pieza encaja' : 'Nada encaja', '✕');
          p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
          draw();
        },
      }, 'Acusar formalmente'));
  };
  p.append(h('span', { class: 'kicker' }, 'Acta de acusación'), h('h2', {}, 'Señala al ', h('em', {}, 'culpable')),
    h('p', { class: 'lead' }, 'Elige quién, cómo y por qué. Algunas opciones solo aparecen cuando has formado la deducción correspondiente en el tablero. Tienes tres intentos.'),
    h('hr', { class: 'rule' }), cols, foot);
  draw();
}

// ---------- resultado ----------
export function showResult(ctx: Ctx) {
  const g = ctx.game, d = g.s.done!;
  ctx.layer(true);
  const [p] = sheet(() => ctx.layer(false), 'result');
  ctx.sound.sfx('stamp');
  if (d.ok) setTimeout(() => ctx.sound.sfx('success'), 500);
  const culprit = g.data.suspects.find(s => s.id === g.data.solution.culprit)!;
  p.append(
    h('div', { class: 'stamp' + (d.ok ? '' : ' grey') }, d.ok ? 'CASO CERRADO' : 'ARCHIVADO'),
    h('span', { class: 'kicker' }, `Expediente ${g.data.num} · ${g.data.title}`),
    h('h2', {}, d.ok ? 'Caso ' : 'Sin ', h('em', {}, d.ok ? 'resuelto' : 'resolver')),
    h('div', { class: 'rankbox' },
      h('span', { class: 'r' }, d.rank),
      h('span', { class: 's' }, d.ok ? `${d.score} / 100 puntos` : 'Has agotado los tres intentos'),
      h('span', { class: 's' }, `${g.s.found.length}/${g.data.clues.length} pruebas · ${g.s.deductions.length}/${g.data.deductions.length} deducciones · ${fmtTime(g.s.time)}`)),
    h('div', { class: 'row', style: { gap: '18px', margin: '10px 0 20px' } },
      h('img', { src: ctx.portrait(culprit.id), alt: '', style: { width: '90px', border: '5px solid #f4efe4', boxShadow: '0 8px 16px -6px rgba(0,0,0,.5)', transform: 'rotate(-2deg)' } }),
      h('div', {}, h('span', { class: 'kicker' }, 'Culpable'), h('div', { class: 'display', style: { fontSize: '34px' } }, culprit.name))),
    h('hr', { class: 'rule' }),
    h('div', { class: 'story' }, g.data.solution.story.map(t => h('p', {}, t))),
    h('div', { class: 'row', style: { marginTop: '24px' } },
      h('button', { class: 'btn red', onclick: () => ctx.exit() }, 'Volver al archivo'),
      h('button', { class: 'btn', onclick: () => { if (confirm('¿Borrar el progreso de este caso y empezar de cero?')) { g.reset(); location.reload(); } } }, 'Jugar de nuevo')));
}

// ---------- ayudas ----------
export function openHints(ctx: Ctx) {
  const g = ctx.game;
  ctx.layer(true);
  const [p] = sheet(() => ctx.layer(false));
  const box = h('div', { class: 'hints' });
  const draw = () => box.replaceChildren(...g.data.hints.map((t, i) => i < g.s.hints
    ? h('div', { class: 'hintc shown' }, h('span', { class: 'kicker' }, ['Un empujón', 'Una dirección', 'Casi la solución'][i]), t)
    : i === g.s.hints
      ? h('button', { class: 'hintc btn', style: { justifyContent: 'flex-start', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--f-texto)', fontSize: '16px' }, onclick: () => { g.useHint(); ctx.sound.sfx('paper'); draw(); ctx.refresh(); } }, `Pedir ayuda ${i + 1} de 3 (resta puntos al rango final)`)
      : h('div', { class: 'hintc', style: { opacity: '.4' } }, '· · ·')));
  p.append(h('span', { class: 'kicker' }, 'Notas de su colega'), h('h2', {}, 'Pregúntale a ', h('em', {}, 'Watson')), h('p', { class: 'lead' }, 'Cada ayuda te acerca a la solución, pero descuenta puntos del rango final.'), h('hr', { class: 'rule' }), box);
  draw();
}

// ---------- informe inicial ----------
export function showBrief(ctx: Ctx, onStart: () => void) {
  const d = ctx.game.data;
  const dots = h('span', { class: 'diff' }, [1, 2, 3].map(i => h('i', { class: i <= d.difficulty ? 'f' : '' })));
  ctx.layer(true);
  const [p, close] = sheet(() => { ctx.layer(false); onStart(); }, 'brief');
  p.append(...kids(
    h('span', { class: 'class' }, d.classification),
    h('span', { class: 'num' }, `ARCHIVO BAKER · EXPEDIENTE Nº ${d.num}`),
    h('h1', {}, d.title),
    h('div', { class: 'meta' }, `${d.place} · ${d.date} · ~${d.minutes} min`, dots),
    h('dl', { class: 'victim facts' }, h('dt', {}, 'Víctima'), h('dd', {}, `${d.victim.name}, ${d.victim.age} años`), h('dt', {}, 'Hallazgo'), h('dd', {}, d.victim.desc)),
    ...d.briefing.map(t => h('p', {}, t)),
    d.difficulty === 1 ? h('ul', { class: 'tips' },
      h('li', {}, 'Arrastra para mirar alrededor; la rueda o el pellizco acercan la vista.'),
      h('li', {}, 'Pulsa los objetos que se iluminan para examinarlos. Mantén Espacio para ver dónde hay algo.'),
      h('li', {}, 'Los anillos de latón (y la lista de abajo a la izquierda) te llevan a otros lugares.'),
      h('li', {}, 'Une pruebas con hilo rojo en el tablero para deducir, y presenta pruebas a quien mienta.')) : null,
    h('div', { class: 'row', style: { marginTop: '26px' } }, h('button', { class: 'btn red', onclick: () => close() }, 'Abrir la investigación'))));
}

// ---------- documento ----------
export function openDoc(ctx: Ctx, c: ClueDef) {
  if (!c.doc) return;
  ctx.sound.sfx('paper');
  const close = () => { removeEventListener('keydown', esc); wrap.remove(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && topLayer() === wrap) close(); };
  addEventListener('keydown', esc);
  const wrap = h('div', { class: 'docview', onclick: (e: Event) => { if (e.target === wrap) close(); } },
    h('div', { class: `sheet-doc paper ${c.doc.font ?? 'imprenta'}` },
      h('button', { class: 'close', onclick: close, 'aria-label': 'Cerrar' }, '✕'),
      h('div', { class: 'ttl' }, c.doc.title),
      h('div', { class: 'body' }, c.doc.text)));
  document.getElementById('ui')!.appendChild(wrap);
}

export { icon };
