import type { Game } from './state';
import type { Stage } from '../engine/stage';
import type { Sound } from '../engine/audio';
import type { Inspector, Snap } from '../engine/inspect';
import type { World, ClueDef } from '../types';

export interface Ctx {
  game: Game;
  stage: Stage;
  sound: Sound;
  snap: Snap;
  inspector: Inspector;
  world: World;
  thumb(id: string): string | null;
  portrait(susId: string): string;
  /** Abre/cierra una capa que tapa la escena (pausa el render y la desenfoca). */
  layer(open: boolean): void;
  inspect(id: string): void;
  doc(c: ClueDef): void;
  refresh(): void;
  exit(): void;
}
