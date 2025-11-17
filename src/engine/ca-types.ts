// Cellular Automata Types

export const CellType = {
  EMPTY: 0,
  WALL: 1,
  STALL: 2,
  QUEUE: 3,
  ENTRANCE: 4,
  EXIT: 5,
  URINAL: 6,
  SINK: 7,
} as const;

export type CellType = typeof CellType[keyof typeof CellType];

export const CELL_COLORS: Record<CellType, string> = {
  [CellType.EMPTY]: "#ffffff",
  [CellType.WALL]: "#444444",
  [CellType.STALL]: "#ffd54f",
  [CellType.QUEUE]: "#bbdefb",
  [CellType.ENTRANCE]: "#c8e6c9",
  [CellType.EXIT]: "#ffccbc",
  [CellType.URINAL]: "#90caf9",
  [CellType.SINK]: "#b39ddb",
};

export type Gender = "F" | "M";

export const PersonState = {
  WALKING_TO_QUEUE: "walking_to_queue",
  IN_QUEUE: "in_queue",
  WALKING_TO_STALL: "walking_to_stall",
  IN_STALL: "in_stall",
  WALKING_TO_SINK: "walking_to_sink",
  AT_SINK: "at_sink",
  EXITING: "exiting",
  DONE: "done",
} as const;

export type PersonState = typeof PersonState[keyof typeof PersonState];

export interface Cell {
  col: number;
  row: number;
}

export interface Stall extends Cell {
  occupiedUntil: number;
  occupantId: number | null;
  type: 'stall' | 'urinal';
}

export interface Sink extends Cell {
  occupiedUntil: number;
  occupantId: number | null;
}

export interface CAConfig {
  gridCols: number;
  gridRows: number;
  cellSize: number;
  tickMs: number;
  secondsPerTick: number;
  arrivalRatePerMin: number;
  dwellTimeMin: number;
  dwellTimeMax: number;
  sinkTimeMin: number;
  sinkTimeMax: number;
  genderMix: { female: number; male: number };
  pMaleUrinal: number;
}

export interface SimStats {
  simTimeSeconds: number;
  servedCount: number;
  totalTimeInSystem: number;
  femaleCount: number;
  maleCount: number;
  femaleTimeInSystem: number;
  maleTimeInSystem: number;
}

