import type { Level } from "./types.js";

export const emptyLevel: Level = {
  platforms: [],
  obstacles: [],
  hazards: [],
  startPosition: { x: 40, y: 380 },
  goalPosition: { x: 760, y: 380 },
};
