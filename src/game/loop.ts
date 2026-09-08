import type { InputState } from "../input/index.js";
import type { Level } from "../levels/types.js";
import type { RenderContext } from "../render/index.js";
import { render } from "../render/index.js";
import { createInitialState, type GameState } from "./state.js";

export function update(state: GameState, deltaTime: number): GameState {
  return { ...state, elapsedTime: state.elapsedTime + deltaTime };
}

export interface Game {
  state: GameState;
  stop: () => void;
}

export function init(
  level: Level,
  context: RenderContext,
  input: InputState = { left: false, right: false, jump: false, pause: false },
  frameScheduler: (callback: (time: number) => void) => number = (callback) =>
    window.requestAnimationFrame(callback),
  frameCanceller: (handle: number) => void = (handle) => window.cancelAnimationFrame(handle),
  canvasSize = { width: 800, height: 450 },
): Game {
  void input;
  let state = createInitialState(level.startPosition);
  let previousTime = 0;
  let frameHandle = 0;
  let running = true;

  const frame = (time: number) => {
    if (!running) return;
    const deltaTime = previousTime === 0 ? 0 : (time - previousTime) / 1000;
    previousTime = time;
    state = update(state, deltaTime);
    render(context, level, state, canvasSize.width, canvasSize.height);
    frameHandle = frameScheduler(frame);
  };

  render(context, level, state, canvasSize.width, canvasSize.height);
  frameHandle = frameScheduler(frame);

  return {
    get state() {
      return state;
    },
    stop: () => {
      running = false;
      frameCanceller(frameHandle);
    },
  };
}
