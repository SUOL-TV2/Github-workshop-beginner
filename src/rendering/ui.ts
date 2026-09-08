/**
 * The state machine owns these values. The rendering layer only consumes a
 * snapshot and sends user intent back through the supplied port.
 */
export type GameState =
  | "Start"
  | "Playing"
  | "Paused"
  | "GameOver"
  | "Completed"
  | "LevelCompleted";

export type UiEvent =
  | "Started"
  | "Paused"
  | "Resumed"
  | "Failed"
  | "Completed"
  | "Restarted";

export interface GameSnapshot {
  readonly state: GameState;
  readonly lastEvent?: UiEvent;
}

export interface StateMachinePort {
  dispatch(event: "Start" | "Restart"): void;
}

export type UiTone = "neutral" | "pause" | "failure" | "success";

export interface UiAction {
  readonly label: string;
  readonly run: () => void;
}

export interface UiOverlay {
  readonly kind:
    | "start"
    | "paused"
    | "failure"
    | "completed"
    | "game-over";
  readonly title: string;
  readonly message: string;
  readonly tone: UiTone;
  readonly controls?: readonly string[];
  readonly action?: UiAction;
}

export interface GameUi {
  readonly overlay: UiOverlay | null;
  readonly restartCue: boolean;
}

export const CONTROLS = [
  "Move: Left/Right Arrow or A/D",
  "Jump: Up Arrow, W, or Space",
  "Pause: Escape or P",
] as const;

export function StartScreen(
  snapshot: GameSnapshot,
  stateMachine: StateMachinePort,
): UiOverlay | null {
  if (snapshot.state !== "Start") {
    return null;
  }

  return {
    kind: "start",
    title: "McSquishy: Blob on the Run",
    message: "Press Start when you are ready!",
    tone: "neutral",
    controls: CONTROLS,
    action: {
      label: "Start",
      run: () => stateMachine.dispatch("Start"),
    },
  };
}

export function PausedOverlay(snapshot: GameSnapshot): UiOverlay | null {
  if (snapshot.state !== "Paused") {
    return null;
  }

  return {
    kind: "paused",
    title: "Paused",
    message: "Press Escape or P to resume.",
    tone: "pause",
  };
}

export function FailureFeedback(snapshot: GameSnapshot): UiOverlay | null {
  if (snapshot.state !== "GameOver") {
    return null;
  }

  return {
    kind: "failure",
    title: "Oh no!",
    message: "McSquishy failed the level.",
    tone: "failure",
  };
}

export function GameOverOverlay(
  snapshot: GameSnapshot,
  stateMachine: StateMachinePort,
): UiOverlay | null {
  if (snapshot.state !== "GameOver") {
    return null;
  }

  return {
    kind: "game-over",
    title: "Game Over",
    message: "Try again from the beginning of the level.",
    tone: "failure",
    action: {
      label: "Restart",
      run: () => stateMachine.dispatch("Restart"),
    },
  };
}

export function LevelCompletedOverlay(
  snapshot: GameSnapshot,
  stateMachine: StateMachinePort,
): UiOverlay | null {
  if (snapshot.state !== "Completed" && snapshot.state !== "LevelCompleted") {
    return null;
  }

  return {
    kind: "completed",
    title: "Level completed!",
    message: "Great job getting McSquishy to the goal.",
    tone: "success",
    action: {
      label: "Restart",
      run: () => stateMachine.dispatch("Restart"),
    },
  };
}

export function renderGameUi(
  snapshot: GameSnapshot,
  stateMachine: StateMachinePort,
): GameUi {
  const overlay =
    StartScreen(snapshot, stateMachine) ??
    PausedOverlay(snapshot) ??
    GameOverOverlay(snapshot, stateMachine) ??
    LevelCompletedOverlay(snapshot, stateMachine);

  return {
    overlay,
    restartCue: snapshot.lastEvent === "Restarted",
  };
}
