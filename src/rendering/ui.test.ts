import { strict as assert } from "node:assert";
import test from "node:test";
import {
  CONTROLS,
  FailureFeedback,
  LevelCompletedOverlay,
  PausedOverlay,
  StartScreen,
  renderGameUi,
  type GameSnapshot,
  type StateMachinePort,
} from "./ui.js";

function snapshot(
  state: GameSnapshot["state"],
  lastEvent?: GameSnapshot["lastEvent"],
): GameSnapshot {
  return lastEvent === undefined ? { state } : { state, lastEvent };
}

function port() {
  const events: Array<"Start" | "Restart"> = [];
  const stateMachine: StateMachinePort = {
    dispatch: (event) => events.push(event),
  };
  return { events, stateMachine };
}

test("StartScreen renders only in Start and dispatches Start", () => {
  const { events, stateMachine } = port();
  const start = StartScreen(snapshot("Start"), stateMachine);

  assert.equal(start?.kind, "start");
  assert.deepEqual(start?.controls, CONTROLS);
  start?.action?.run();
  assert.deepEqual(events, ["Start"]);
  assert.equal(StartScreen(snapshot("Playing"), stateMachine), null);
});

test("PausedOverlay renders only in Paused", () => {
  const { stateMachine } = port();

  assert.equal(PausedOverlay(snapshot("Paused"))?.kind, "paused");
  assert.equal(PausedOverlay(snapshot("Playing")), null);
});

test("failure feedback and game-over overlay render only after failure", () => {
  const { stateMachine } = port();

  assert.equal(FailureFeedback(snapshot("GameOver"))?.kind, "failure");
  assert.equal(FailureFeedback(snapshot("Playing")), null);
  assert.equal(renderGameUi(snapshot("GameOver"), stateMachine).overlay?.kind, "game-over");
});

test("completion overlay renders only in Completed and restarts through the port", () => {
  const { events, stateMachine } = port();
  const completed = LevelCompletedOverlay(snapshot("Completed"), stateMachine);

  assert.equal(completed?.kind, "completed");
  completed?.action?.run();
  assert.deepEqual(events, ["Restart"]);
  assert.equal(LevelCompletedOverlay(snapshot("Playing"), stateMachine), null);
});

test("restart cue is driven by the restart event", () => {
  const { stateMachine } = port();

  assert.equal(renderGameUi(snapshot("Playing", "Restarted"), stateMachine).restartCue, true);
  assert.equal(renderGameUi(snapshot("Playing"), stateMachine).restartCue, false);
});
