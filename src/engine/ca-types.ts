// Cellular Automata Types

export const CellType = {
  EMPTY: 0,
  WALL: 1,
  W_STALL: 2,      // Women's stall
  M_STALL: 3,      // Men's stall
  URINAL: 4,
  SINK: 5,
  QUEUE_W: 6,      // Women's queue
  QUEUE_M: 7,      // Men's queue
  QUEUE_SHARED: 8, // Shared queue (unisex)
  ENTRANCE: 9,
  EXIT: 10,
} as const;

export type CellType = typeof CellType[keyof typeof CellType];

export const CELL_COLORS: Record<CellType, string> = {
  [CellType.EMPTY]: "#f5f5f5",           // Light grey floor
  [CellType.WALL]: "#333333",            // Dark grey walls
  [CellType.W_STALL]: "#ffc1e3",         // Pink for women's stalls
  [CellType.M_STALL]: "#b3d9ff",         // Light blue for men's stalls
  [CellType.URINAL]: "#4a90e2",          // Darker blue for urinals
  [CellType.SINK]: "#ce93d8",            // Purple for sinks
  [CellType.QUEUE_W]: "#ffccf2",         // Light pink queue
  [CellType.QUEUE_M]: "#d6eaff",         // Light blue queue
  [CellType.QUEUE_SHARED]: "#e1f5fe",    // Cyan for shared queue
  [CellType.ENTRANCE]: "#c8e6c9",        // Green entrance
  [CellType.EXIT]: "#ffccbc",            // Orange exit
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
  type: 'w_stall' | 'm_stall' | 'urinal';
  genderAllowed: Gender | 'both';
}

export interface Sink extends Cell {
  occupiedUntil: number;
  occupantId: number | null;
}

export interface QueueCell extends Cell {
  gender: Gender | 'shared';
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

