// Una partida: monta la escena del caso, el HUD y conecta motor, reglas y paneles.
import { Game } from './state';
import type { Ctx } from './ctx';
import type { CaseData, World } from '../types';
import type { Stage } from '../engine/stage';
import type { Sound } from '../engine/audio';
import { Inspector, Snap } from '../engine/inspect';
import { bust, reseed } from '../engine/kit';
import { h, icon, ui, fmtTime, topLayer } from '../ui/dom';
import { openFiles, openSuspects, openTimeline, openAccuse, openHints, showBrief, openDoc, showResult } from '../ui/panels';
import { openBoard } from '../ui/board';
import { openInspect } from '../ui/inspect-ui';

let inspector: Inspector | null = null;
const snap = new Snap();

export function play(stage: Stage, sound: Sound, data: CaseData, build: () => World, exit: () => void) {
  reseed(data.id.length * 977);
  const world = build();
  const game = new Game(data);
  if (!data.nodes.some(n => n.id === game.s.node)) game.s.node = data.start;
  if (!inspector) {
    const host = h('div', { style: { display: 'none' } }, h('canvas', {}));
    document.body.appendChild(host);
    inspector = new Inspector(host.querySelector('canvas')!);
    if (import.meta.env.DEV) (window as any).__insp = inspector;
  }
  let layers = 0;
  const ctx: Ctx = {
    game, stage, sound, snap, inspector, world,
    thumb(id) {
      const c = game.clue[id];
      const o = c.node ? id : c.thumb;
      return o && world.clues[o] ? snap.object(`${data.id}.${o}`, world.clues[o]) : null;
    },
    portrait(id) {
      const s = data.suspects.find(x => x.id === id)!;
      reseed(id.length * 131 + s.age);
      return snap.portrait(`${data.id}.${id}`, bust(s.bust));
    },
    layer(open) {
      layers = Math.max(0, layers + (open ? 1 : -1));
      document.body.classList.toggle('dim', layers > 0);
      stage.paused = layers > 0;
    },
    inspect: id => openInspect(ctx, id),
    doc: c => openDoc(ctx, c),
    refresh: () => hud.update(),
    exit,
  };

  const hud = makeHud(ctx);
  stage.canClick = id => game.clue[id]?.node === stage.current?.id;
  stage.isDone = id => game.s.examined.includes(id);
  stage.onClue = id => { if (!topLayer()) ctx.inspect(id); };
  stage.onNode = id => { game.visit(id); hud.where(id); sound.sfx('step'); };
  stage.setWorld(world, data.nodes, game.s.node);
  sound.ambience(world.ambience);
  let thunder = 0;
  const timer = setInterval(() => {
    if (!document.hidden && !game.s.done) { game.tick(1); hud.clock(); }
  }, 1000);
  const flashCheck = setInterval(() => {
    const f = world.flash?.() ?? 0;
    if (f > 0.6 && performance.now() - thunder > 4000) { thunder = performance.now(); setTimeout(() => sound.sfx('thunder'), 400 + Math.random() * 900); }
  }, 120);

  if (!game.s.seenBrief) showBrief(ctx, () => { game.s.seenBrief = true; game.save(); });
  else if (game.s.done) showResult(ctx);

  return () => {
    clearInterval(timer); clearInterval(flashCheck);
    game.save();
    document.querySelectorAll('.sheet, .board-wrap, .inspect, .docview, .rub, .picker, .toasts').forEach(e => e.remove());
    inspector?.close();
    document.body.classList.remove('dim');
    stage.paused = false;
    ui().replaceChildren();
  };
}

function makeHud(ctx: Ctx) {
  const { game: g, stage, sound } = ctx;
  const where = h('div', { class: 'where' });
  const time = h('span', {});
  const muteBtn = h('button', { class: 'chip', 'aria-label': 'Sonido', onclick: () => { const m = sound.toggleMute(); muteBtn.innerHTML = icon(m ? 'mute' : 'sound'); } });
  muteBtn.innerHTML = icon(sound.muted ? 'mute' : 'sound');
  const top = h('div', { class: 'hud-top' },
    h('div', { class: 'case-id' }, h('span', { class: 'kicker' }, `Exp. ${g.data.num}`, h('span', { class: 'ttl' }, ` · ${g.data.title}`)), where),
    h('div', { class: 'tools' },
      h('span', { class: 'chip', title: 'Tiempo de investigación' }, h('span', { html: icon('clock') }), time),
      h('button', { class: 'chip', onclick: () => openHints(ctx) }, h('span', { html: icon('bulb') }), h('span', { class: 'lbl' }, 'Watson')),
      muteBtn,
      h('button', { class: 'chip', onclick: () => ctx.exit(), 'aria-label': 'Volver al archivo' }, h('span', { html: icon('exit') }), h('span', { class: 'lbl' }, 'Archivo'))));
  const badge = (n: number) => h('span', { class: 'n' }, String(n));
  const btn = (ic: string, t: string, f: () => void, cls = '') => h('button', { class: cls, onclick: f }, h('span', { html: icon(ic) }), h('span', { class: 't' }, t));
  const bFiles = btn('file', 'Expediente', () => openFiles(ctx));
  const bSus = btn('people', 'Sospechosos', () => openSuspects(ctx));
  const bBoard = btn('board', 'Tablero', () => openBoard(ctx));
  const bTl = btn('clock', 'Cronología', () => openTimeline(ctx));
  const bAcc = btn('seal', 'Acusar', () => openAccuse(ctx), 'accuse');
  const dock = h('nav', { class: 'dock', 'aria-label': 'Herramientas del detective' }, bFiles, bSus, bBoard, bTl, bAcc);
  const places = h('div', { class: 'places' });
  const keys = h('div', { class: 'hint-key', html: 'Arrastra para mirar · <kbd>Espacio</kbd> revela objetos<br>Pulsa un objeto para examinarlo' });
  ui().replaceChildren(top, places, dock, keys);

  let lastFound = g.s.found.length, lastDed = g.s.deductions.length;
  const api = {
    where(id: string) {
      const n = g.data.nodes.find(x => x.id === id);
      if (!n) return;
      where.textContent = n.label;
      where.classList.add('swap'); void where.offsetWidth; where.classList.remove('swap');
      places.replaceChildren(h('span', { class: 'kicker' }, 'Ir a'), ...n.links.map(l => h('button', { class: 'chip', onclick: () => stage.goto(l) }, g.data.nodes.find(x => x.id === l)!.label)));
    },
    clock() { time.textContent = fmtTime(g.s.time); },
    update() {
      bFiles.querySelector('.n')?.remove();
      bFiles.appendChild(badge(g.s.found.length));
      if (g.s.found.length > lastFound) { bFiles.querySelector('.n')!.classList.add('pop'); lastFound = g.s.found.length; }
      bBoard.querySelector('.n')?.remove();
      bBoard.appendChild(badge(g.s.deductions.length));
      if (g.s.deductions.length > lastDed) { bBoard.querySelector('.n')!.classList.add('pop'); lastDed = g.s.deductions.length; }
      api.clock();
    },
  };
  api.where(g.s.node);
  api.update();
  return api;
}
