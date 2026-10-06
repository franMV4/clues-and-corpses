import type * as THREE from 'three';

export type V3 = [number, number, number];

/** marker: dónde aparece el anillo para ir a este nodo desde su misma área; exits: anillos hacia otras áreas vistos desde aquí. */
export interface NodeDef { id: string; label: string; area: string; pos: V3; look: V3; marker: V3; links: string[]; exits?: Record<string, V3> }

export type ActionType = 'lupa' | 'girar' | 'abrir' | 'frotar' | 'uv' | 'comparar' | 'leer';
export interface ActionDef { type: ActionType; label: string; reveals: string; unlocks?: string; rub?: string }

export interface DocDef { title: string; text: string; font?: 'courier' | 'mano' | 'imprenta' }

export interface ClueDef {
  id: string; name: string;
  kind: 'objeto' | 'documento' | 'testimonio' | 'hallazgo';
  node?: string;          // en escena; si no, se desbloquea desde una acción o una declaración
  thumb?: string;         // pista cuyo objeto 3D sirve de miniatura
  desc: string;
  doc?: DocDef;
  actions?: ActionDef[];
}

export interface StatementDef { id: string; text: string; hidden?: boolean; contradictedBy?: string; reply?: string; unlocks?: string[]; unlocksClue?: string }

export interface BustDef {
  skin: string; hair: string; style: 'corto' | 'calvo' | 'mono' | 'largo' | 'raya' | 'rizado';
  beard?: 'bigote' | 'barba' | 'patillas'; hat?: 'bombin' | 'chistera' | 'boina' | 'gorra' | 'cofia';
  glasses?: boolean; coat: string; collar?: 'corbata' | 'pajarita' | 'jersey' | 'bata' | 'chal' | 'cuello'; earrings?: boolean; age?: number;
}

export interface SuspectDef { id: string; name: string; role: string; age: number; bust: BustDef; bio: string; alibi: string; statements: StatementDef[] }

export interface DeductionDef { id: string; requires: string[]; title: string; text: string }

export interface Option { id: string; text: string; requires?: string }

export interface CaseData {
  id: string; num: string; title: string; place: string; date: string;
  difficulty: 1 | 2 | 3; minutes: number; classification: string; tagline: string;
  victim: { name: string; age: number; desc: string };
  briefing: string[];
  start: string;
  nodes: NodeDef[];
  clues: ClueDef[];
  suspects: SuspectDef[];
  deductions: DeductionDef[];
  timeline: { events: { id: string; time: string; text: string }[]; deduction: { title: string; text: string } };
  accusation: { methods: Option[]; motives: Option[] };
  solution: { culprit: string; method: string; motive: string; story: string[] };
  hints: string[];
}

export interface World {
  scene: THREE.Scene;
  clues: Record<string, THREE.Object3D>;
  update?(t: number, dt: number): void;
  exposure?: number;
  envIntensity?: number;
  bloom?: number;
  ambience: 'londres' | 'temporal' | 'fiesta' | 'archivo';
  onNode?(id: string): void;
  liveShadows?: boolean; // sombras que se mueven (por defecto se pintan una vez al cargar)
  flash?(): number;     // 0..1 relámpago (para el sonido del trueno)
}
