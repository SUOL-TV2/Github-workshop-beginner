import { GameState, GameStateMachine } from "./state-machine.js";
import type { RestartTarget } from "./state-machine.js";

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends Rectangle {}

export interface GameInput {
  start?: boolean;
  pause?: boolean;
  restart?: boolean;
}

export interface GameWorld {
  player: Player;
  goal: Rectangle;
  hazards: readonly Rectangle[];
  updatePlayer: (player: Player) => void;
  reset: () => void;
  hasFailed?: () => boolean;
}

export type GameMessage = "Level Completed" | "Game Over" | undefined;

export interface GameFrame {
  state: GameState;
  message: GameMessage;
}

export function overlaps(first: Rectangle, second: Rectangle): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

/**
 * Coordinates input, world updates, and terminal-state feedback.
 * World-specific movement and collision setup remains owned by the game level.
 */
export class GameController {
  public readonly stateMachine: GameStateMachine;
  private readonly world: GameWorld;
  private message: GameMessage;

  public constructor(
    world: GameWorld,
    restartTarget: RestartTarget = GameState.PLAYING,
  ) {
    this.world = world;
    this.stateMachine = new GameStateMachine(
      GameState.START_SCREEN,
      restartTarget,
    );
    this.message = undefined;
  }

  public get state(): GameState {
    return this.stateMachine.currentState;
  }

  public get feedback(): GameMessage {
    return this.message;
  }

  public handleInput(input: GameInput): void {
    if (input.restart && this.isTerminal()) {
      this.world.reset();
      if (this.stateMachine.restart()) {
        this.message = undefined;
      }
      return;
    }

    if (input.start && this.state === GameState.START_SCREEN) {
      this.stateMachine.transition(GameState.PLAYING);
      return;
    }

    if (input.pause) {
      if (this.state === GameState.PLAYING) {
        this.stateMachine.transition(GameState.PAUSED);
      } else if (this.state === GameState.PAUSED) {
        this.stateMachine.transition(GameState.PLAYING);
      }
    }
  }

  public update(): GameFrame {
    if (this.state !== GameState.PLAYING) {
      return this.frame();
    }

    this.world.updatePlayer(this.world.player);

    // Failure wins ties with the goal so a hazardous frame has one outcome.
    if (
      this.world.hasFailed?.() ||
      this.world.hazards.some((hazard) => overlaps(this.world.player, hazard))
    ) {
      this.stateMachine.transition(GameState.GAME_OVER);
      this.message = "Game Over";
    } else if (overlaps(this.world.player, this.world.goal)) {
      this.stateMachine.transition(GameState.LEVEL_COMPLETED);
      this.message = "Level Completed";
    }

    return this.frame();
  }

  public render(): GameFrame {
    return this.frame();
  }

  private isTerminal(): boolean {
    return (
      this.state === GameState.GAME_OVER ||
      this.state === GameState.LEVEL_COMPLETED
    );
  }

  private frame(): GameFrame {
    return { state: this.state, message: this.message };
  }
}
