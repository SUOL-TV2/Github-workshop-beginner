export enum GameState {
  START_SCREEN = "START_SCREEN",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
  LEVEL_COMPLETED = "LEVEL_COMPLETED",
}

export type RestartTarget = GameState.PLAYING | GameState.START_SCREEN;

export type GameStateChangeListener = (
  state: GameState,
  previousState: GameState,
) => void;

const transitions: Readonly<Record<GameState, readonly GameState[]>> = {
  [GameState.START_SCREEN]: [GameState.PLAYING],
  [GameState.PLAYING]: [
    GameState.PAUSED,
    GameState.GAME_OVER,
    GameState.LEVEL_COMPLETED,
  ],
  [GameState.PAUSED]: [GameState.PLAYING],
  [GameState.GAME_OVER]: [GameState.PLAYING, GameState.START_SCREEN],
  [GameState.LEVEL_COMPLETED]: [GameState.PLAYING, GameState.START_SCREEN],
};

/**
 * Owns the game's state and prevents gameplay code from making invalid jumps.
 */
export class GameStateMachine {
  private state: GameState;
  private readonly restartTarget: RestartTarget;
  private readonly listener: GameStateChangeListener | undefined;

  public constructor(
    initialState: GameState = GameState.START_SCREEN,
    restartTarget: RestartTarget = GameState.PLAYING,
    listener?: GameStateChangeListener,
  ) {
    this.state = initialState;
    this.restartTarget = restartTarget;
    this.listener = listener;
  }

  public get currentState(): GameState {
    return this.state;
  }

  public canTransitionTo(nextState: GameState): boolean {
    return transitions[this.state].includes(nextState);
  }

  public transition(nextState: GameState): boolean {
    if (!this.canTransitionTo(nextState)) {
      return false;
    }

    const previousState = this.state;
    this.state = nextState;
    this.listener?.(nextState, previousState);
    return true;
  }

  public restart(): boolean {
    if (
      this.state !== GameState.GAME_OVER &&
      this.state !== GameState.LEVEL_COMPLETED
    ) {
      return false;
    }

    return this.transition(this.restartTarget);
  }
}

export const VALID_GAME_STATE_TRANSITIONS = transitions;
