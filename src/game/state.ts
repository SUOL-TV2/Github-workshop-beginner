import type { Position } from "../levels/types.js";

export interface GameState {
  position: Position;
  elapsedTime: number;
}

export function createInitialState(startPosition: Position): GameState {
  return { position: { ...startPosition }, elapsedTime: 0 };
}
