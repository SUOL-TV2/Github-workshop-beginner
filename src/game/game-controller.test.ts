import assert from "node:assert/strict";
import test from "node:test";
import { GameController, GameState } from "./index.js";
import type { GameWorld, Player } from "./index.js";

function createWorld(player: Player): GameWorld {
  return {
    player,
    goal: { x: 100, y: 0, width: 10, height: 10 },
    hazards: [],
    updatePlayer: () => {},
    reset: () => {
      player.x = 0;
      player.y = 0;
    },
  };
}

test("starts, pauses, and resumes gameplay while gating world updates", () => {
  let updates = 0;
  const player = { x: 0, y: 0, width: 10, height: 10 };
  const world = createWorld(player);
  world.updatePlayer = () => {
    updates += 1;
  };
  const game = new GameController(world);

  game.update();
  assert.equal(updates, 0);
  game.handleInput({ start: true });
  game.update();
  assert.equal(updates, 1);
  game.handleInput({ pause: true });
  game.update();
  assert.equal(updates, 1);
  game.handleInput({ pause: true });
  game.update();
  assert.equal(updates, 2);
});

test("finishes at the goal and restarts after completion", () => {
  const player = { x: 100, y: 0, width: 10, height: 10 };
  const world = createWorld(player);
  const game = new GameController(world);

  game.handleInput({ start: true });
  const frame = game.update();
  assert.equal(frame.state, GameState.LEVEL_COMPLETED);
  assert.equal(frame.message, "Level Completed");
  game.handleInput({ restart: true });
  assert.equal(game.state, GameState.PLAYING);
  assert.equal(player.x, 0);
});

test("hazards take precedence over goal collision", () => {
  const player = { x: 100, y: 0, width: 10, height: 10 };
  const world = createWorld(player);
  world.hazards = [{ x: 100, y: 0, width: 10, height: 10 }];
  const game = new GameController(world);

  game.handleInput({ start: true });
  assert.equal(game.update().state, GameState.GAME_OVER);
  assert.equal(game.feedback, "Game Over");
});
