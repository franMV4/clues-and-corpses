// Estado y reglas de un caso: pistas, interrogatorios, deducciones, cronología, acusación y rango. Guardado en localStorage.
import type { CaseData, ClueDef, DeductionDef, Option, StatementDef } from '../types';

export interface Save {
  found: string[]; examined: string[]; revealed: string[];
  statements: string[]; contradicted: string[];
  strings: [string, string][]; pos: Record<string, [number, number]>;
  deductions: string[]; timeline: boolean;
  hints: number; wrongPresent: number; badStrings: number; attempts: number;
  visited: string[]; node: string; time: number; seenBrief: boolean;
  done?: { ok: boolean; rank: string; score: number };
}

const KEY = (id: string) => `sg.caso.${id}`;
export const RANKS = ['Agente', 'Inspector', 'Detective', 'Sherlock'] as const;

export function loadSave(id: string): Save | null {
  try { return JSON.parse(localStorage.getItem(KEY(id)) || 'null'); } catch { return null; }
}

type Ev = 'clue' | 'deduction' | 'any';

export class Game {
  s: Save;
  clue: Record<string, ClueDef>;
  private subs: ((e: Ev, payload?: any) => void)[] = [];

  data: CaseData;
  constructor(data: CaseData) {
    this.data = data;
    this.clue = Object.fromEntries(data.clues.map(c => [c.id, c]));
    this.s = loadSave(data.id) ?? this.fresh();
  }

  private fresh(): Save {
    return { found: [], examined: [], revealed: [], statements: [], contradicted: [], strings: [], pos: {}, deductions: [], timeline: false, hints: 0, wrongPresent: 0, badStrings: 0, attempts: 0, visited: [this.data.start], node: this.data.start, time: 0, seenBrief: false };
  }

  reset() { localStorage.removeItem(KEY(this.data.id)); this.s = this.fresh(); this.emit('any'); }
  save() { try { localStorage.setItem(KEY(this.data.id), JSON.stringify(this.s)); } catch { /* modo privado */ } }
  on(f: (e: Ev, payload?: any) => void) { this.subs.push(f); }
  private emit(e: Ev, p?: any) { this.save(); for (const f of this.subs) f(e, p); }

  has(id: string) { return this.s.found.includes(id); }
  get sceneClues() { return this.data.clues.filter(c => c.node); }

  addClue(id: string) {
    if (this.has(id)) return false;
    this.s.found.push(id);
    this.emit('clue', this.clue[id]);
    return true;
  }

  examine(id: string) {
    if (!this.s.examined.includes(id)) this.s.examined.push(id);
    return this.addClue(id);
  }

  isRevealed(clue: string, i: number) { return this.s.revealed.includes(`${clue}:${i}`); }

  /** Revela el detalle i de una pista. Devuelve la pista desbloqueada, si la hay y es nueva. */
  reveal(clue: string, i: number): ClueDef | null {
    const k = `${clue}:${i}`;
    if (!this.s.revealed.includes(k)) this.s.revealed.push(k);
    const u = this.clue[clue].actions?.[i]?.unlocks;
    if (u && this.addClue(u)) return this.clue[u];
    this.save();
    return null;
  }

  visit(node: string) {
    this.s.node = node;
    if (!this.s.visited.includes(node)) this.s.visited.push(node);
    this.save();
  }

  // ---- interrogatorios ----
  visibleStatements(sus: string): StatementDef[] {
    const sp = this.data.suspects.find(s => s.id === sus)!;
    return sp.statements.filter(st => !st.hidden || this.s.statements.includes(`${sus}/${st.id}`));
  }
  isContradicted(sus: string, st: string) { return this.s.contradicted.includes(`${sus}/${st}`); }

  present(sus: string, stId: string, clueId: string): { ok: boolean; reply?: string; clue?: ClueDef } {
    const st = this.data.suspects.find(s => s.id === sus)!.statements.find(x => x.id === stId)!;
    if (st.contradictedBy !== clueId) { this.s.wrongPresent++; this.emit('any'); return { ok: false }; }
    this.s.contradicted.push(`${sus}/${stId}`);
    for (const u of st.unlocks ?? []) this.s.statements.push(`${sus}/${u}`);
    let clue: ClueDef | undefined;
    if (st.unlocksClue && this.addClue(st.unlocksClue)) clue = this.clue[st.unlocksClue];
    this.emit('any');
    return { ok: true, reply: st.reply, clue };
  }

  // ---- tablero ----
  pairValid(a: string, b: string) { return this.data.deductions.some(d => d.requires.includes(a) && d.requires.includes(b)); }

  connect(a: string, b: string): { ok: boolean; formed: DeductionDef[] } {
    if (a === b || this.s.strings.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return { ok: true, formed: [] };
    if (!this.pairValid(a, b)) { this.s.badStrings++; this.emit('any'); return { ok: false, formed: [] }; }
    this.s.strings.push([a, b]);
    const formed: DeductionDef[] = [];
    for (const d of this.data.deductions) {
      if (this.s.deductions.includes(d.id) || !d.requires.every(r => this.has(r))) continue;
      if (connected(d.requires, this.s.strings)) { this.s.deductions.push(d.id); formed.push(d); }
    }
    this.emit(formed.length ? 'deduction' : 'any', formed);
    return { ok: true, formed };
  }

  unstring(a: string, b: string) {
    this.s.strings = this.s.strings.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
    this.emit('any');
  }

  // ---- cronología ----
  checkTimeline(order: string[]) {
    const ok = order.join() === this.data.timeline.events.map(e => e.id).join();
    if (ok && !this.s.timeline) { this.s.timeline = true; this.emit('deduction', []); }
    return ok;
  }

  // ---- acusación ----
  unlocked(o: Option) { return !o.requires || this.s.deductions.includes(o.requires); }
  get attemptsLeft() { return 3 - this.s.attempts; }

  accuse(culprit: string, method: string, motive: string) {
    const sol = this.data.solution;
    const hits = [culprit === sol.culprit, method === sol.method, motive === sol.motive];
    this.s.attempts++;
    const ok = hits.every(Boolean);
    if (ok || this.s.attempts >= 3) this.s.done = { ok, ...this.score(ok) };
    this.emit('any');
    return { ok, right: hits.filter(Boolean).length, over: !!this.s.done };
  }

  score(ok: boolean) {
    const sceneTotal = this.data.clues.length;
    const pct = this.s.found.length / sceneTotal;
    let score = ok ? 100 : 0;
    if (ok) {
      score -= (this.s.attempts - 1) * 18;
      score -= this.s.hints * 10;
      score -= Math.min(15, this.s.badStrings * 2);
      score -= Math.min(15, this.s.wrongPresent * 2);
      score -= Math.round((1 - pct) * 20);
      if (this.s.timeline) score += 5;
      score = Math.max(5, Math.min(100, score));
    }
    const rank = !ok ? 'Sin resolver' : score >= 90 ? 'Sherlock' : score >= 72 ? 'Detective' : score >= 50 ? 'Inspector' : 'Agente';
    return { score, rank };
  }

  useHint() { if (this.s.hints < this.data.hints.length) { this.s.hints++; this.emit('any'); } }
  tick(sec: number) { this.s.time += sec; if (Math.round(this.s.time) % 5 === 0) this.save(); }
}

/** ¿Las pistas `nodes` forman un grafo conexo usando solo hilos entre ellas? */
export function connected(nodes: string[], edges: [string, string][]) {
  const seen = new Set([nodes[0]]), q = [nodes[0]];
  while (q.length) {
    const n = q.shift()!;
    for (const [a, b] of edges) {
      const o = a === n ? b : b === n ? a : null;
      if (o && nodes.includes(o) && !seen.has(o)) { seen.add(o); q.push(o); }
    }
  }
  return nodes.every(n => seen.has(n));
}
