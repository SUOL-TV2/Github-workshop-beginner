import { strict as assert } from "node:assert";
import test from "node:test";
import {
  KeyboardInputHandler,
  type KeyboardEventTarget,
} from "./keyboardInput.js";

class TestKeyboardEvent extends Event {
  public readonly code: string;
  public readonly key: string;
  public readonly repeat: boolean;

  public constructor(
    type: "keydown" | "keyup",
    key: string,
    code = "",
    repeat = false,
  ) {
    super(type);
    this.key = key;
    this.code = code;
    this.repeat = repeat;
  }
}

class TestEventTarget implements KeyboardEventTarget {
  private readonly listeners = {
    keydown: new Set<(event: KeyboardEvent) => void>(),
    keyup: new Set<(event: KeyboardEvent) => void>(),
  };

  public addEventListener(
    type: "keydown" | "keyup",
    listener: (event: KeyboardEvent) => void,
  ): void {
    this.listeners[type].add(listener);
  }

  public removeEventListener(
    type: "keydown" | "keyup",
    listener: (event: KeyboardEvent) => void,
  ): void {
    this.listeners[type].delete(listener);
  }

  public dispatch(event: TestKeyboardEvent): void {
    for (const listener of this.listeners[event.type as "keydown" | "keyup"]) {
      listener(event as unknown as KeyboardEvent);
    }
  }
}

test("maps movement and jump keys and clears them on keyup", () => {
  const target = new TestEventTarget();
  const input = new KeyboardInputHandler({ target });

  target.dispatch(new TestKeyboardEvent("keydown", "ArrowLeft"));
  target.dispatch(new TestKeyboardEvent("keydown", "d"));
  target.dispatch(new TestKeyboardEvent("keydown", " ", "Space"));
  assert.deepEqual(input.getInputState(), {
    moveLeft: true,
    moveRight: true,
    jump: true,
    pause: false,
  });

  target.dispatch(new TestKeyboardEvent("keyup", "ArrowLeft"));
  target.dispatch(new TestKeyboardEvent("keyup", "d"));
  target.dispatch(new TestKeyboardEvent("keyup", " ", "Space"));
  assert.deepEqual(input.getInputState(), {
    moveLeft: false,
    moveRight: false,
    jump: false,
    pause: false,
  });
  input.dispose();
});

test("keeps an action active while another mapped key is held", () => {
  const target = new TestEventTarget();
  const input = new KeyboardInputHandler({ target });

  target.dispatch(new TestKeyboardEvent("keydown", "ArrowLeft"));
  target.dispatch(new TestKeyboardEvent("keydown", "a"));
  target.dispatch(new TestKeyboardEvent("keyup", "ArrowLeft"));
  assert.equal(input.getInputState().moveLeft, true);

  target.dispatch(new TestKeyboardEvent("keyup", "a"));
  assert.equal(input.getInputState().moveLeft, false);
  input.dispose();
});

test("fires pause callback once per keydown edge and gates gameplay input", () => {
  const target = new TestEventTarget();
  let playing = true;
  let pauseToggles = 0;
  const input = new KeyboardInputHandler({
    target,
    isPlaying: () => playing,
    onPauseToggle: () => {
      pauseToggles += 1;
    },
  });

  target.dispatch(new TestKeyboardEvent("keydown", "p", "KeyP"));
  target.dispatch(new TestKeyboardEvent("keydown", "p", "KeyP", true));
  assert.equal(pauseToggles, 1);

  target.dispatch(new TestKeyboardEvent("keydown", "a"));
  playing = false;
  assert.deepEqual(input.getInputState(), {
    moveLeft: false,
    moveRight: false,
    jump: false,
    pause: true,
  });

  target.dispatch(new TestKeyboardEvent("keyup", "p", "KeyP"));
  input.dispose();
});
