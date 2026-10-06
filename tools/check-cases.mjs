// Comprueba que cada caso se puede resolver: pistas alcanzables, deducciones formables,
// solución desbloqueable y objetos 3D presentes en scene.ts. Sale con código 1 si algo falla.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../src/cases/', import.meta.url);
let fails = 0;
const bad = (id, msg) => { fails++; console.error(`✗ [${id}] ${msg}`); };

for (const dir of readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory())) {
  const file = new URL(`${dir.name}/case.json`, root);
  if (!existsSync(file)) continue;
  const c = JSON.parse(readFileSync(file, 'utf8'));
  const id = c.id;
  const clue = Object.fromEntries(c.clues.map(x => [x.id, x]));
  const node = Object.fromEntries(c.nodes.map(x => [x.id, x]));
  const ded = Object.fromEntries(c.deductions.map(x => [x.id, x]));
  const sus = Object.fromEntries(c.suspects.map(x => [x.id, x]));

  // ids únicos
  for (const [k, list] of Object.entries({ clues: c.clues, nodes: c.nodes, deductions: c.deductions, suspects: c.suspects }))
    if (new Set(list.map(x => x.id)).size !== list.length) bad(id, `ids repetidos en ${k}`);

  // nodos: enlaces válidos y simétricos, todos alcanzables
  for (const n of c.nodes) for (const l of n.links) {
    if (!node[l]) bad(id, `nodo ${n.id} enlaza a ${l}, que no existe`);
    else if (!node[l].links.includes(n.id)) bad(id, `enlace ${n.id}→${l} no es recíproco`);
  }
  const seen = new Set([c.start]), q = [c.start];
  while (q.length) for (const l of node[q.shift()]?.links ?? []) if (!seen.has(l)) { seen.add(l); q.push(l); }
  for (const n of c.nodes) if (!seen.has(n.id)) bad(id, `nodo ${n.id} inalcanzable`);

  // pistas alcanzables: punto fijo sobre escena + acciones + declaraciones
  const got = new Set(c.clues.filter(x => x.node && seen.has(x.node)).map(x => x.id));
  for (const x of c.clues) {
    if (x.node && !node[x.node]) bad(id, `pista ${x.id} en nodo inexistente ${x.node}`);
    if (x.thumb && !clue[x.thumb]) bad(id, `pista ${x.id}: thumb ${x.thumb} no existe`);
    for (const a of x.actions ?? []) if (a.unlocks && !clue[a.unlocks]) bad(id, `${x.id} desbloquea ${a.unlocks}, que no existe`);
  }
  const statements = c.suspects.flatMap(s => s.statements.map(st => ({ ...st, sus: s.id })));
  const visible = new Set(statements.filter(s => !s.hidden).map(s => s.sus + '/' + s.id));
  for (let grew = true; grew;) {
    grew = false;
    const add = (set, v) => { if (v && !set.has(v)) { set.add(v); grew = true; } };
    for (const x of c.clues) if (got.has(x.id)) for (const a of x.actions ?? []) add(got, a.unlocks);
    for (const s of statements) if (visible.has(s.sus + '/' + s.id) && s.contradictedBy && got.has(s.contradictedBy)) {
      add(got, s.unlocksClue);
      for (const u of s.unlocks ?? []) add(visible, s.sus + '/' + u);
    }
  }
  for (const x of c.clues) if (!got.has(x.id)) bad(id, `pista ${x.id} no se puede conseguir`);
  for (const s of statements) {
    if (s.contradictedBy && !clue[s.contradictedBy]) bad(id, `declaración ${s.sus}/${s.id}: prueba ${s.contradictedBy} no existe`);
    if (!visible.has(s.sus + '/' + s.id)) bad(id, `declaración ${s.sus}/${s.id} nunca se muestra`);
  }

  // deducciones
  for (const d of c.deductions) {
    if (d.requires.length < 2) bad(id, `deducción ${d.id} necesita al menos 2 pistas`);
    for (const r of d.requires) if (!got.has(r)) bad(id, `deducción ${d.id} necesita ${r}, inalcanzable`);
  }
  // acusación
  const opt = [...c.accusation.methods, ...c.accusation.motives];
  for (const o of opt) if (o.requires && !ded[o.requires]) bad(id, `opción ${o.id} requiere deducción ${o.requires} inexistente`);
  const s = c.solution;
  if (!sus[s.culprit]) bad(id, `culpable ${s.culprit} no es sospechoso`);
  if (!c.accusation.methods.find(m => m.id === s.method)) bad(id, `método ${s.method} no existe`);
  if (!c.accusation.motives.find(m => m.id === s.motive)) bad(id, `móvil ${s.motive} no existe`);
  if (c.hints.length !== 3) bad(id, 'se esperan 3 ayudas');
  if (c.timeline.events.length < 4) bad(id, 'cronología demasiado corta');

  // cada pista con nodo necesita su objeto en scene.ts: clue('id', ...)
  const scenePath = new URL(`${dir.name}/scene.ts`, root);
  if (!existsSync(scenePath)) bad(id, 'falta scene.ts');
  else {
    const src = readFileSync(scenePath, 'utf8');
    for (const x of c.clues) if (x.node && !src.includes(`'${x.id}'`)) bad(id, `scene.ts no crea el objeto de la pista ${x.id}`);
  }
  if (!fails) console.log(`✓ ${id}: ${c.clues.length} pistas, ${c.deductions.length} deducciones, ${c.suspects.length} sospechosos`);
}
process.exit(fails ? 1 : 0);
