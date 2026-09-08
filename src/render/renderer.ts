import type { Level } from "../levels/types.js";
import type { GameState } from "../game/state.js";

export interface RenderContext {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
}

export function render(
  context: RenderContext,
  level: Level,
  state: GameState,
  width: number,
  height: number,
): void {
  context.fillStyle = "#20233a";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#66d9a5";
  for (const platform of level.platforms) {
    context.fillRect(platform.x, platform.y, platform.width, platform.height);
  }

  context.fillStyle = "#d29b62";
  for (const obstacle of level.obstacles) {
    context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }

  context.fillStyle = "#ef6f6c";
  for (const hazard of level.hazards) {
    context.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
  }

  context.fillStyle = "#f5c16c";
  context.fillRect(state.position.x, state.position.y, 24, 24);
  context.fillStyle = "#9b8afb";
  context.fillRect(level.goalPosition.x, level.goalPosition.y, 24, 24);
}
