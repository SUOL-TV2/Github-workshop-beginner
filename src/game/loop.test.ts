import assert from "node:assert/strict";
import test from "node:test";
import { init } from "./loop.js";
import { emptyLevel } from "../levels/emptyLevel.js";
import type { RenderContext } from "../render/renderer.js";

const context: RenderContext = {
  fillStyle: "#000",
  clearRect: () => undefined,
  fillRect: () => undefined,
};

test("initializes a game with the empty level", () => {
  let scheduled: ((time: number) => void) | undefined;
  const game = init(emptyLevel, context, undefined, (callback) => {
    scheduled = callback;
    return 1;
  }, () => undefined);

  assert.deepEqual(game.state.position, emptyLevel.startPosition);
  assert.equal(game.state.elapsedTime, 0);
  assert.ok(scheduled);
  game.stop();
});
