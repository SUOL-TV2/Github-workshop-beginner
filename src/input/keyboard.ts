export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  pause: boolean;
}

const movementKeys = new Set(["ArrowLeft", "a", "ArrowRight", "d", " ", "w", "ArrowUp", "p"]);

export function createKeyboardInput(target: Pick<Window, "addEventListener" | "removeEventListener"> = window) {
  const state: InputState = { left: false, right: false, jump: false, pause: false };

  const setKey = (event: KeyboardEvent, pressed: boolean) => {
    if (!movementKeys.has(event.key)) return;
    if (event.key === "ArrowLeft" || event.key === "a") state.left = pressed;
    if (event.key === "ArrowRight" || event.key === "d") state.right = pressed;
    if (event.key === " " || event.key === "w" || event.key === "ArrowUp") state.jump = pressed;
    if (event.key === "p") state.pause = pressed;
  };
  const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
  const onKeyUp = (event: KeyboardEvent) => setKey(event, false);
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    state,
    dispose: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
