export interface Vector {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HazardType = "spike" | "pit" | "moving-enemy";

export interface Hazard extends Rectangle {
  type: HazardType;
}

export interface Checkpoint extends Rectangle {
  position: Vector;
}

export interface LevelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LevelData {
  bounds: LevelBounds;
  startPosition: Vector;
  hazards: Hazard[];
  checkpoints?: Checkpoint[];
}

export interface PlayerState {
  position: Vector;
  size: {
    width: number;
    height: number;
  };
  velocity: Vector;
  transientState?: Record<string, unknown>;
}

export type FailureReason = "hazard" | "out-of-bounds";

export interface FailureEvent {
  reason: FailureReason;
  hazardType?: HazardType;
  position: Vector;
  restartPosition: Vector;
  sequence: number;
}

export interface FailureState {
  active: boolean;
  failureCount: number;
  lastEvent?: FailureEvent;
}

export interface FailureControllerOptions {
  /**
   * Checkpoints are opt-in because level 1 has none. This keeps the module
   * ready for later levels without changing the v1 restart contract.
   */
  useCheckpoints?: boolean;
}

export function intersects(left: Rectangle, right: Rectangle): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}

function playerRectangle(player: PlayerState): Rectangle {
  return {
    x: player.position.x,
    y: player.position.y,
    width: player.size.width,
    height: player.size.height,
  };
}

function isOutOfBounds(player: PlayerState, bounds: LevelBounds): boolean {
  const body = playerRectangle(player);
  return (
    body.x < bounds.minX ||
    body.x + body.width > bounds.maxX ||
    body.y < bounds.minY ||
    body.y + body.height > bounds.maxY
  );
}

function copyVector(vector: Vector): Vector {
  return { x: vector.x, y: vector.y };
}

export class FailureController {
  private readonly useCheckpoints: boolean;
  private checkpointPosition?: Vector;
  private sequence = 0;
  private state: FailureState = {
    active: false,
    failureCount: 0,
  };

  public constructor(options: FailureControllerOptions = {}) {
    this.useCheckpoints = options.useCheckpoints ?? false;
  }

  public getState(): FailureState {
    return {
      ...this.state,
      lastEvent: this.state.lastEvent
        ? {
            ...this.state.lastEvent,
            position: copyVector(this.state.lastEvent.position),
            restartPosition: copyVector(this.state.lastEvent.restartPosition),
          }
        : undefined,
    };
  }

  public recordCheckpoint(player: PlayerState, level: LevelData): boolean {
    if (!this.useCheckpoints || !level.checkpoints) {
      return false;
    }

    const checkpoint = level.checkpoints.find((item) =>
      intersects(playerRectangle(player), item),
    );
    if (!checkpoint) {
      return false;
    }

    this.checkpointPosition = copyVector(checkpoint.position);
    return true;
  }

  /**
   * Detects both failure causes and emits only once until restart() is called.
   */
  public update(player: PlayerState, level: LevelData): FailureEvent | undefined {
    if (this.state.active) {
      return undefined;
    }

    const body = playerRectangle(player);
    const hazard = level.hazards.find((item) => intersects(body, item));
    const reason: FailureReason | undefined = hazard
      ? "hazard"
      : isOutOfBounds(player, level.bounds)
        ? "out-of-bounds"
        : undefined;

    if (!reason) {
      return undefined;
    }

    const restartPosition =
      this.useCheckpoints && this.checkpointPosition
        ? copyVector(this.checkpointPosition)
        : copyVector(level.startPosition);
    const event: FailureEvent = {
      reason,
      hazardType: hazard?.type,
      position: copyVector(player.position),
      restartPosition,
      sequence: ++this.sequence,
    };

    this.state = {
      active: true,
      failureCount: this.state.failureCount + 1,
      lastEvent: event,
    };
    return event;
  }

  public restart(player: PlayerState, level: LevelData): void {
    const position =
      this.useCheckpoints && this.checkpointPosition
        ? this.checkpointPosition
        : level.startPosition;
    player.position = copyVector(position);
    player.velocity = { x: 0, y: 0 };
    player.transientState = {};
    this.state = {
      ...this.state,
      active: false,
    };
  }
}
