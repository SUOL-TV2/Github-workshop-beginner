/**
 * The current keyboard input contract consumed by game logic.
 *
 * Movement and jump are exposed only while the configured `isPlaying`
 * predicate returns true. Pause remains available to the state machine so it
 * can resume a paused game.
 */
export interface InputState {
  readonly moveLeft: boolean;
  readonly moveRight: boolean;
  readonly jump: boolean;
  readonly pause: boolean;
}

export interface KeyboardInputOptions {
  /**
   * The event target to attach to. Supplying a target makes the handler usable
   * in tests and in non-browser hosts; the browser window is used by default.
   */
  readonly target?: KeyboardEventTarget;
  /** Called once when Escape or P is pressed, not on key-repeat events. */
  readonly onPauseToggle?: () => void;
  /**
   * Determines whether gameplay input is active. It is intentionally a
   * callback so the input module does not import or depend on a state machine.
   */
  readonly isPlaying?: () => boolean;
}

export interface KeyboardEventTarget {
  addEventListener(
    type: "keydown" | "keyup",
    listener: (event: KeyboardEvent) => void,
  ): void;
  removeEventListener(
    type: "keydown" | "keyup",
    listener: (event: KeyboardEvent) => void,
  ): void;
}

type InputAction = keyof InputState;

const KEY_ACTIONS: Readonly<Record<string, InputAction>> = {
  ArrowLeft: "moveLeft",
  a: "moveLeft",
  A: "moveLeft",
  ArrowRight: "moveRight",
  d: "moveRight",
  D: "moveRight",
  ArrowUp: "jump",
  w: "jump",
  W: "jump",
  " ": "jump",
  Spacebar: "jump",
  Escape: "pause",
  p: "pause",
  P: "pause",
};

const PREVENT_DEFAULT_ACTIONS = new Set<InputAction>([
  "moveLeft",
  "moveRight",
  "jump",
]);

const EMPTY_INPUT_STATE: InputState = Object.freeze({
  moveLeft: false,
  moveRight: false,
  jump: false,
  pause: false,
});

function browserWindow(): KeyboardEventTarget {
  if (typeof window === "undefined") {
    throw new Error(
      "KeyboardInputHandler requires an event target outside a browser",
    );
  }
  return window;
}

function actionForEvent(event: KeyboardEvent): InputAction | undefined {
  // `key` is preferred, while `code` covers browsers/test doubles that
  // represent Space as "Space" rather than " ".
  return KEY_ACTIONS[event.key] ?? KEY_ACTIONS[event.code];
}

/**
 * Translates browser keyboard events into a state-only input API.
 *
 * Instantiate this once during game setup. It attaches immediately by
 * default; call `dispose()` during teardown (including hot reload) to remove
 * its listeners.
 */
export class KeyboardInputHandler {
  private readonly target: KeyboardEventTarget;
  private readonly onPauseToggle: (() => void) | undefined;
  private readonly isPlaying: () => boolean;
  private readonly pressedKeys = new Map<string, InputAction>();
  private readonly state: Record<InputAction, boolean> = {
    moveLeft: false,
    moveRight: false,
    jump: false,
    pause: false,
  };
  private attached = false;

  public constructor(options: KeyboardInputOptions = {}) {
    this.target = options.target ?? browserWindow();
    this.onPauseToggle = options.onPauseToggle;
    this.isPlaying = options.isPlaying ?? (() => true);
    this.init();
  }

  /** Attach listeners if they are not already attached. */
  public init(): void {
    if (this.attached) {
      return;
    }
    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.attached = true;
  }

  /** Alias for callers that prefer an explicit lifecycle name. */
  public attach(): void {
    this.init();
  }

  /** Remove listeners and clear held-key state. */
  public dispose(): void {
    if (this.attached) {
      this.target.removeEventListener("keydown", this.handleKeyDown);
      this.target.removeEventListener("keyup", this.handleKeyUp);
      this.attached = false;
    }
    this.pressedKeys.clear();
    this.clearState();
  }

  /** Alias useful for lifecycle APIs that use destroy terminology. */
  public destroy(): void {
    this.dispose();
  }

  /**
   * Return a fresh snapshot so consumers cannot mutate the handler's state.
   * Movement and jump are gated here as well as on keydown, so a state change
   * while a key is held takes effect immediately.
   */
  public getInputState(): InputState {
    const playing = this.isPlaying();
    return Object.freeze({
      moveLeft: playing && this.state.moveLeft,
      moveRight: playing && this.state.moveRight,
      jump: playing && this.state.jump,
      pause: this.state.pause,
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const action = actionForEvent(event);
    if (action === undefined) {
      return;
    }

    if (PREVENT_DEFAULT_ACTIONS.has(action)) {
      event.preventDefault();
    }

    const key = event.code || event.key;
    const isNewKeyPress = !this.pressedKeys.has(key);
    this.pressedKeys.set(key, action);
    this.state[action] = true;

    if (
      action === "pause" &&
      isNewKeyPress &&
      !event.repeat &&
      this.onPauseToggle !== undefined
    ) {
      this.onPauseToggle();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = actionForEvent(event);
    if (action === undefined) {
      return;
    }

    const key = event.code || event.key;
    this.pressedKeys.delete(key);

    // Another mapped key may still be holding the same action (for example
    // ArrowLeft and A), so only clear the action when none remain pressed.
    const actionStillPressed = [...this.pressedKeys].some(
      ([, pressedAction]) => pressedAction === action,
    );
    if (!actionStillPressed) {
      this.state[action] = false;
    }
  };

  private clearState(): void {
    this.state.moveLeft = EMPTY_INPUT_STATE.moveLeft;
    this.state.moveRight = EMPTY_INPUT_STATE.moveRight;
    this.state.jump = EMPTY_INPUT_STATE.jump;
    this.state.pause = EMPTY_INPUT_STATE.pause;
  }
}

export function createKeyboardInput(
  options: KeyboardInputOptions = {},
): KeyboardInputHandler {
  return new KeyboardInputHandler(options);
}
