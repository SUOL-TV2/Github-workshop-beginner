import assert from "node:assert/strict";
import test from "node:test";
import { GameState, GameStateMachine } from "./state-machine.js";

test("allows the normal play and pause transitions", () => {
  const machine = new GameStateMachine();

  assert.equal(machine.transition(GameState.PLAYING), true);
  assert.equal(machine.transition(GameState.PAUSED), true);
  assert.equal(machine.transition(GameState.PLAYING), true);
  assert.equal(machine.currentState, GameState.PLAYING);
});

test("allows failure and completion from playing", () => {
  const machine = new GameStateMachine(GameState.PLAYING);

  assert.equal(machine.transition(GameState.GAME_OVER), true);
  assert.equal(machine.restart(), true);
  assert.equal(machine.transition(GameState.GAME_OVER), true);
  assert.equal(machine.restart(), true);
  assert.equal(machine.transition(GameState.LEVEL_COMPLETED), true);
});

test("rejects transitions that skip required states", () => {
  const machine = new GameStateMachine();

  assert.equal(machine.transition(GameState.GAME_OVER), false);
  assert.equal(machine.currentState, GameState.START_SCREEN);
  assert.equal(machine.transition(GameState.PLAYING), true);
  assert.equal(machine.transition(GameState.LEVEL_COMPLETED), true);
  assert.equal(machine.transition(GameState.PAUSED), false);
});

test("can restart terminal states at the start screen", () => {
  const machine = new GameStateMachine(
    GameState.PLAYING,
    GameState.START_SCREEN,
  );

  machine.transition(GameState.GAME_OVER);
  assert.equal(machine.restart(), true);
  assert.equal(machine.currentState, GameState.START_SCREEN);
});
