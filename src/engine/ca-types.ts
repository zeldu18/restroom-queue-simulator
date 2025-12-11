// Cellular Automata Types - Unified Simulation Engine

export const CellType = {
  EMPTY: 0,
  WALL: 1,
  W_STALL: 2,           // Women's stall
  M_STALL: 3,           // Men's stall
  URINAL: 4,
  SINK: 5,
  QUEUE_W: 6,           // Women's queue
  QUEUE_M: 7,           // Men's queue
  QUEUE_SHARED: 8,      // Shared queue (unisex)
  ENTRANCE: 9,
  EXIT: 10,
  CHANGING_TABLE: 11,   // Diaper changing station
  SHARED_STALL: 12,     // Gender-neutral stall
} as const;

export type CellType = typeof CellType[keyof typeof CellType];

export const CELL_COLORS: Record<CellType, string> = {
  [CellType.EMPTY]: "#e8e4e0",           // Warm tile color
  [CellType.WALL]: "#4a4a4a",            // Dark grey walls
  [CellType.W_STALL]: "#f8bbd9",         // Pink for women's stalls
  [CellType.M_STALL]: "#90caf9",         // Light blue for men's stalls
  [CellType.URINAL]: "#42a5f5",          // Darker blue for urinals
  [CellType.SINK]: "#b39ddb",            // Purple for sinks
  [CellType.QUEUE_W]: "#fce4ec",         // Light pink queue
  [CellType.QUEUE_M]: "#e3f2fd",         // Light blue queue
  [CellType.QUEUE_SHARED]: "#e0f2f1",    // Teal for shared queue
  [CellType.ENTRANCE]: "#a5d6a7",        // Green entrance
  [CellType.EXIT]: "#ffcc80",            // Orange exit
  [CellType.CHANGING_TABLE]: "#fff59d",  // Yellow for changing table
  [CellType.SHARED_STALL]: "#c5e1a5",    // Light green for gender-neutral
};

export type Gender = "F" | "M";

// Character types with different behaviors
export const CharacterType = {
  REGULAR: "regular",
  PREGNANT: "pregnant",
  PARENT_WITH_CHILD: "parent_with_child",
  ELDERLY: "elderly",
  WHEELCHAIR: "wheelchair",
} as const;

export type CharacterType = typeof CharacterType[keyof typeof CharacterType];

// Realistic character frequencies (based on US demographics)
export interface CharacterFrequencies {
  regular: number;         // ~90%
  pregnant: number;        // ~3% of women
  parentWithChild: number; // ~4%
  elderly: number;         // ~5%
  wheelchair: number;      // ~2%
}

export const DEFAULT_CHARACTER_FREQUENCIES: CharacterFrequencies = {
  regular: 0.86,
  pregnant: 0.03,      // Only for women
  parentWithChild: 0.04,
  elderly: 0.05,
  wheelchair: 0.02,
};

// Service time modifiers by character type
export interface CharacterModifiers {
  stallTimeMultiplier: number;
  sinkTimeMultiplier: number;
  walkSpeedMultiplier: number;
  needsChangingTable: boolean;
  needsAccessibleStall: boolean;
}

export const CHARACTER_MODIFIERS: Record<CharacterType, CharacterModifiers> = {
  [CharacterType.REGULAR]: {
    stallTimeMultiplier: 1.0,
    sinkTimeMultiplier: 1.0,
    walkSpeedMultiplier: 1.0,
    needsChangingTable: false,
    needsAccessibleStall: false,
  },
  [CharacterType.PREGNANT]: {
    stallTimeMultiplier: 1.5,
    sinkTimeMultiplier: 1.2,
    walkSpeedMultiplier: 0.8,
    needsChangingTable: false,
    needsAccessibleStall: false,
  },
  [CharacterType.PARENT_WITH_CHILD]: {
    stallTimeMultiplier: 2.5,
    sinkTimeMultiplier: 2.0,
    walkSpeedMultiplier: 0.7,
    needsChangingTable: true,  // May need changing table
    needsAccessibleStall: false,
  },
  [CharacterType.ELDERLY]: {
    stallTimeMultiplier: 1.8,
    sinkTimeMultiplier: 1.5,
    walkSpeedMultiplier: 0.5,
    needsChangingTable: false,
    needsAccessibleStall: false,
  },
  [CharacterType.WHEELCHAIR]: {
    stallTimeMultiplier: 2.0,
    sinkTimeMultiplier: 1.5,
    walkSpeedMultiplier: 0.6,
    needsChangingTable: false,
    needsAccessibleStall: true,
  },
};

export const PersonState = {
  WALKING_TO_QUEUE: "walking_to_queue",
  IN_QUEUE: "in_queue",
  WALKING_TO_STALL: "walking_to_stall",
  IN_STALL: "in_stall",
  WALKING_TO_CHANGING_TABLE: "walking_to_changing_table",
  AT_CHANGING_TABLE: "at_changing_table",
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
  type: 'w_stall' | 'm_stall' | 'urinal' | 'shared_stall';
  genderAllowed: Gender | 'both';
  lastChangeTime: number;
  entranceCol: number;
  entranceRow: number;
  isAccessible: boolean;  // ADA compliant
  footprint: number;      // Square units (stalls ~6, urinals ~2)
}

export interface Sink extends Cell {
  occupiedUntil: number;
  occupantId: number | null;
  lastChangeTime: number;
  entranceCol: number;
  entranceRow: number;
  genderAllowed: Gender | 'both';
  footprint: number;
}

export interface ChangingTable extends Cell {
  occupiedUntil: number;
  occupantId: number | null;
  lastChangeTime: number;
  entranceCol: number;
  entranceRow: number;
  footprint: number;
}

export interface QueueCell extends Cell {
  gender: Gender | 'shared';
}

// Area constraints for realistic space allocation
export interface AreaConfig {
  totalAreaSqUnits: number;       // Total available floor space
  womenSectionPercent: number;    // % of area for women's section
  menSectionPercent: number;      // % of area for men's section
  sharedSectionPercent: number;   // % of area for shared/neutral section
  
  // Fixture footprints (in square units)
  stallFootprint: number;         // ~6 sq units
  urinalFootprint: number;        // ~2 sq units
  sinkFootprint: number;          // ~3 sq units
  changingTableFootprint: number; // ~8 sq units
  accessibleStallFootprint: number; // ~10 sq units
}

export const DEFAULT_AREA_CONFIG: AreaConfig = {
  totalAreaSqUnits: 200,
  womenSectionPercent: 50,
  menSectionPercent: 50,
  sharedSectionPercent: 0,
  stallFootprint: 6,
  urinalFootprint: 2,
  sinkFootprint: 3,
  changingTableFootprint: 8,
  accessibleStallFootprint: 10,
};

// Gender-specific service time distributions
export interface ServiceTimeConfig {
  female: {
    stallMin: number;      // seconds
    stallMax: number;
    sinkMin: number;
    sinkMax: number;
  };
  male: {
    stallMin: number;
    stallMax: number;
    urinalMin: number;
    urinalMax: number;
    sinkMin: number;
    sinkMax: number;
  };
  changingTable: {
    min: number;
    max: number;
  };
}

// Based on research data
export const DEFAULT_SERVICE_TIMES: ServiceTimeConfig = {
  female: {
    stallMin: 60,    // 1 minute min
    stallMax: 180,   // 3 minutes max
    sinkMin: 10,     // Women spend more time at sinks
    sinkMax: 30,
  },
  male: {
    stallMin: 45,
    stallMax: 120,
    urinalMin: 20,
    urinalMax: 40,
    sinkMin: 5,      // Men spend less time at sinks
    sinkMax: 15,
  },
  changingTable: {
    min: 180,        // 3 minutes
    max: 420,        // 7 minutes
  },
};

// Main simulation configuration
export interface CAConfig {
  gridCols: number;
  gridRows: number;
  cellSize: number;
  tickMs: number;
  secondsPerTick: number;
  arrivalRatePerMin: number;
  
  // Service times (gender-specific)
  serviceTimes: ServiceTimeConfig;
  
  // Gender mix
  genderMix: { female: number; male: number };
  
  // Male urinal preference
  pMaleUrinal: number;
  
  // Character type frequencies
  characterFrequencies: CharacterFrequencies;
  
  // Area constraints
  areaConfig: AreaConfig;
  
  // Warmup period
  warmupSeconds: number;
}

export const DEFAULT_CA_CONFIG: CAConfig = {
  gridCols: 32,
  gridRows: 18,
  cellSize: 28,
  tickMs: 150,
  secondsPerTick: 0.5,
  arrivalRatePerMin: 12,
  serviceTimes: DEFAULT_SERVICE_TIMES,
  genderMix: { female: 0.5, male: 0.5 },
  pMaleUrinal: 0.85,
  characterFrequencies: DEFAULT_CHARACTER_FREQUENCIES,
  areaConfig: DEFAULT_AREA_CONFIG,
  warmupSeconds: 120,
};

export interface SimStats {
  simTimeSeconds: number;
  servedCount: number;
  totalTimeInSystem: number;
  femaleCount: number;
  maleCount: number;
  femaleTimeInSystem: number;
  maleTimeInSystem: number;
  
  // Additional metrics
  femaleWaitTime: number;
  maleWaitTime: number;
  maxQueueLength: number;
  currentQueueLength: number;
  
  // Character type counts
  characterTypeCounts: Record<CharacterType, number>;
}

// Layout presets matching the article
export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  womenStalls: number;
  menStalls: number;
  menUrinals: number;
  sharedStalls: number;
  sharedUrinals: number;
  changingTables: number;
  womenSinks: number;
  menSinks: number;
  sharedSinks: number;
  areaRatio: string;  // e.g., "50:50" or "68:32"
}

// The 6 layouts from the article
export const ARTICLE_LAYOUTS: LayoutPreset[] = [
  {
    id: "layout1",
    name: "Layout 1: Basic (50-50)",
    description: "Traditional equal space allocation",
    womenStalls: 10,
    menStalls: 2,
    menUrinals: 10,
    sharedStalls: 0,
    sharedUrinals: 0,
    changingTables: 0,
    womenSinks: 3,
    menSinks: 3,
    sharedSinks: 0,
    areaRatio: "50:50",
  },
  {
    id: "layout2",
    name: "Layout 2: Equal Waiting Times",
    description: "More women's stalls, fewer men's facilities",
    womenStalls: 13,
    menStalls: 2,
    menUrinals: 6,
    sharedStalls: 0,
    sharedUrinals: 0,
    changingTables: 0,
    womenSinks: 4,
    menSinks: 2,
    sharedSinks: 0,
    areaRatio: "68:32",
  },
  {
    id: "layout3",
    name: "Layout 3: Minimal Waiting Times",
    description: "Optimized for throughput",
    womenStalls: 12,
    menStalls: 2,
    menUrinals: 8,
    sharedStalls: 0,
    sharedUrinals: 0,
    changingTables: 0,
    womenSinks: 4,
    menSinks: 2,
    sharedSinks: 0,
    areaRatio: "55:45",
  },
  {
    id: "layout4",
    name: "Layout 4: Mixed Basic",
    description: "Shared toilets with urinals",
    womenStalls: 0,
    menStalls: 0,
    menUrinals: 0,
    sharedStalls: 10,
    sharedUrinals: 10,
    changingTables: 0,
    womenSinks: 0,
    menSinks: 0,
    sharedSinks: 4,
    areaRatio: "shared",
  },
  {
    id: "layout5",
    name: "Layout 5: Gender-Neutral",
    description: "All shared toilet cabins",
    womenStalls: 0,
    menStalls: 0,
    menUrinals: 0,
    sharedStalls: 20,
    sharedUrinals: 0,
    changingTables: 0,
    womenSinks: 0,
    menSinks: 0,
    sharedSinks: 4,
    areaRatio: "shared",
  },
  {
    id: "layout6",
    name: "Layout 6: Minimal Mixed",
    description: "Shared cabins with urinals",
    womenStalls: 0,
    menStalls: 0,
    menUrinals: 0,
    sharedStalls: 14,
    sharedUrinals: 8,
    changingTables: 0,
    womenSinks: 0,
    menSinks: 0,
    sharedSinks: 4,
    areaRatio: "shared",
  },
];
