// Juega cada caso con las reglas reales (Game) por el camino correcto y comprueba que se resuelve con rango alto.
// Uso: node tools/playthrough.ts
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Game, connected } from '../src/game/state.ts';

const assert = (c: unknown, m: string) => { if (!c) { console.error('✗ ' + m); process.exit(1); } };

assert(connected(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]), 'connected: cadena');
assert(!connected(['a', 'b', 'c'], [['a', 'b']]), 'connected: falta c');

const root = new URL('../src/cases/', import.meta.url);
for (const d of readdirSync(root, { withFileTypes: true }).filter(x => x.isDirectory())) {
  const f = new URL(`${d.name}/case.json`, root);
  if (!existsSync(f)) continue;
  const data = JSON.parse(readFileSync(f, 'utf8'));
  const g = new Game(data);
  // 1) examinar todo lo que hay en escena y usar todas sus acciones, repetir hasta que no salga nada nuevo
  for (let grew = true; grew;) {
    const before = g.s.found.length + g.s.contradicted.length;
    for (const c of data.clues) if (c.node) g.examine(c.id);
    for (const id of [...g.s.found]) (g.clue[id].actions ?? []).forEach((_: unknown, i: number) => g.reveal(id, i));
    for (const s of data.suspects) for (const st of g.visibleStatements(s.id))
      if (st.contradictedBy && !g.isContradicted(s.id, st.id) && g.has(st.contradictedBy)) assert(g.present(s.id, st.id, st.contradictedBy).ok, `${data.id}: contradicción ${s.id}/${st.id}`);
    grew = g.s.found.length + g.s.contradicted.length > before;
  }
  assert(g.s.found.length === data.clues.length, `${data.id}: faltan pistas (${g.s.found.length}/${data.clues.length})`);
  // una prueba equivocada cuenta como fallo
  const wrong = data.suspects[0].statements.find((s: any) => s.contradictedBy);
  // 2) tablero: unir las pistas de cada deducción en cadena
  for (const dd of data.deductions) for (let i = 1; i < dd.requires.length; i++) g.connect(dd.requires[i - 1], dd.requires[i]);
  assert(g.s.deductions.length === data.deductions.length, `${data.id}: deducciones ${g.s.deductions.length}/${data.deductions.length}`);
  assert(!g.connect(data.clues[0].id, data.clues[data.clues.length - 1].id).ok || g.pairValid(data.clues[0].id, data.clues[data.clues.length - 1].id), `${data.id}: hilo inválido aceptado`);
  // 3) cronología y acusación
  assert(!g.checkTimeline([...data.timeline.events].reverse().map((e: any) => e.id)), `${data.id}: cronología al revés aceptada`);
  assert(g.checkTimeline(data.timeline.events.map((e: any) => e.id)), `${data.id}: cronología correcta rechazada`);
  const sol = data.solution;
  for (const o of [...data.accusation.methods, ...data.accusation.motives]) if ([sol.method, sol.motive].includes(o.id)) assert(g.unlocked(o), `${data.id}: opción ${o.id} bloqueada`);
  const bad = data.suspects.find((s: any) => s.id !== sol.culprit).id;
  assert(!g.accuse(bad, sol.method, sol.motive).ok, `${data.id}: culpable equivocado aceptado`);
  const r = g.accuse(sol.culprit, sol.method, sol.motive);
  assert(r.ok && g.s.done?.ok, `${data.id}: solución rechazada`);
  console.log(`✓ ${data.id}: resuelto · ${g.s.done!.rank} (${g.s.done!.score}) · ${g.s.badStrings} hilos malos${wrong ? '' : ''}`);
}
