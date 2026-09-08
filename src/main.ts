import { init } from "./game/index.js";
import { createKeyboardInput } from "./input/index.js";
import { emptyLevel } from "./levels/index.js";
import { render } from "./render/index.js";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Game canvas was not found");

const context = canvas.getContext("2d");
if (!context) throw new Error("2D canvas context is not available");

const keyboard = createKeyboardInput();
init(emptyLevel, context, keyboard.state, undefined, undefined, {
  width: canvas.width,
  height: canvas.height,
});
