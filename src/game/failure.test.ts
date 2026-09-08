import assert from "node:assert/strict";
import test from "node:test";
import {
  FailureController,
  type LevelData,
  type PlayerState,
} from "./failure.ts";

const level: LevelData = {
  bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
  startPosition: { x: 10, y: 20 },
  hazards: [{ x: 40, y: 20, width: 10, height: 10, type: "spike" }],
};

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 40, y: 20 },
    size: { width: 8, height: 8 },
    velocity: { x: 4, y: 7 },
    transientState: { invulnerable: true },
    ...overrides,
  };
}

test("hazard overlap emits a hazard failure", () => {
  const controller = new FailureController();
  const event = controller.update(player(), level);

  assert.equal(event?.reason, "hazard");
  assert.equal(event?.hazardType, "spike");
  assert.equal(controller.getState().active, true);
});

test("falling outside the level emits an out-of-bounds failure", () => {
  const controller = new FailureController();
  const event = controller.update(
    player({ position: { x: 20, y: 101 } }),
    level,
  );

  assert.equal(event?.reason, "out-of-bounds");
  assert.equal(event?.hazardType, undefined);
});

test("a failure is emitted once until the player restarts", () => {
  const controller = new FailureController();
  const currentPlayer = player();

  assert.ok(controller.update(currentPlayer, level));
  assert.equal(controller.update(currentPlayer, level), undefined);
  assert.equal(controller.getState().failureCount, 1);
});

test("restart resets position, velocity, and transient state", () => {
  const controller = new FailureController();
  const currentPlayer = player();
  controller.update(currentPlayer, level);

  controller.restart(currentPlayer, level);

  assert.deepEqual(currentPlayer.position, level.startPosition);
  assert.deepEqual(currentPlayer.velocity, { x: 0, y: 0 });
  assert.deepEqual(currentPlayer.transientState, {});
  assert.equal(controller.getState().active, false);
});

test("optional checkpoints can provide the restart position", () => {
  const checkpointLevel: LevelData = {
    ...level,
    checkpoints: [
      { x: 30, y: 20, width: 10, height: 10, position: { x: 32, y: 18 } },
    ],
  };
  const controller = new FailureController({ useCheckpoints: true });
  const currentPlayer = player({ position: { x: 31, y: 21 } });

  assert.equal(controller.recordCheckpoint(currentPlayer, checkpointLevel), true);
  controller.update(player(), checkpointLevel);
  controller.restart(currentPlayer, checkpointLevel);

  assert.deepEqual(currentPlayer.position, { x: 32, y: 18 });
});
