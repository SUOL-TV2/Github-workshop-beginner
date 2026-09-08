export interface Position {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Level {
  platforms: Rectangle[];
  obstacles: Rectangle[];
  hazards: Rectangle[];
  startPosition: Position;
  goalPosition: Position;
}
