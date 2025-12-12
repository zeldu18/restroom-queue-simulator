// CA Person Agent

import { 
  PersonState, 
  type Gender, 
  type Cell, 
  type Stall, 
  type Sink,
  type ChangingTable,
  CharacterType,
  CHARACTER_MODIFIERS,
  type CharacterModifiers 
} from './ca-types';

export class Person {
  id: number;
  col: number;
  row: number;
  gender: Gender;
  characterType: CharacterType;
  modifiers: CharacterModifiers;
  state: PersonState;
  targetQueueIndex: number | null;
  targetStall: Stall | null;
  targetSink: Sink | null;
  targetChangingTable: ChangingTable | null;
  
  // Times (adjusted by character modifiers)
  baseDwellTime: number;
  baseSinkTime: number;
  dwellTime: number;
  sinkTime: number;
  changingTableTime: number;
  walkSpeedMultiplier: number;
  
  // Timing tracking
  timeEnteredSystem: number;
  timeEnteredQueue: number | null;
  timeLeftQueue: number | null;
  timeEnteredStall: number | null;
  timeEnteredChangingTable: number | null;
  timeEnteredSink: number | null;
  
  // Flags
  needsChangingTable: boolean;
  hasUsedChangingTable: boolean;
  needsAccessibleStall: boolean;
  willUseSink: boolean;  // Whether this person will use the sink (men: 50%, women: 100%)
  
  // Stuck detection
  lastCol: number;
  lastRow: number;
  stuckTicks: number;  // How many ticks at the same position

  constructor(
    id: number,
    col: number,
    row: number,
    gender: Gender,
    characterType: CharacterType,
    baseDwellTime: number,
    baseSinkTime: number,
    timeEnteredSystem: number,
    changingTableTime: number = 0,
    willUseSink: boolean = true
  ) {
    this.id = id;
    this.col = col;
    this.row = row;
    this.gender = gender;
    this.characterType = characterType;
    this.modifiers = CHARACTER_MODIFIERS[characterType];
    this.state = PersonState.WALKING_TO_QUEUE;
    this.targetQueueIndex = null;
    this.targetStall = null;
    this.targetSink = null;
    this.targetChangingTable = null;
    
    // Apply character modifiers to times
    this.baseDwellTime = baseDwellTime;
    this.baseSinkTime = baseSinkTime;
    this.dwellTime = baseDwellTime * this.modifiers.stallTimeMultiplier;
    this.sinkTime = baseSinkTime * this.modifiers.sinkTimeMultiplier;
    this.changingTableTime = changingTableTime;
    this.walkSpeedMultiplier = this.modifiers.walkSpeedMultiplier;
    
    // Timing tracking
    this.timeEnteredSystem = timeEnteredSystem;
    this.timeEnteredQueue = null;
    this.timeLeftQueue = null;
    this.timeEnteredStall = null;
    this.timeEnteredChangingTable = null;
    this.timeEnteredSink = null;
    
    // Flags from modifiers
    this.needsChangingTable = this.modifiers.needsChangingTable;
    this.hasUsedChangingTable = false;
    this.needsAccessibleStall = this.modifiers.needsAccessibleStall;
    this.willUseSink = willUseSink;
    
    // Stuck detection
    this.lastCol = col;
    this.lastRow = row;
    this.stuckTicks = 0;
  }

  isAt(cell: Cell): boolean {
    return this.col === cell.col && this.row === cell.row;
  }

  moveTo(col: number, row: number): void {
    // Track if we actually moved
    if (this.col !== col || this.row !== row) {
      this.stuckTicks = 0;  // Reset stuck counter when moving
    }
    this.lastCol = this.col;
    this.lastRow = this.row;
    this.col = col;
    this.row = row;
  }
  
  // Call this each tick to update stuck detection
  updateStuckStatus(): void {
    if (this.col === this.lastCol && this.row === this.lastRow) {
      this.stuckTicks++;
    }
    this.lastCol = this.col;
    this.lastRow = this.row;
  }
  
  isStuck(threshold: number = 20): boolean {
    return this.stuckTicks >= threshold;
  }
  
  // Get wait time (time in queue)
  getWaitTime(): number {
    if (this.timeEnteredQueue === null) return 0;
    if (this.timeLeftQueue === null) return 0;
    return this.timeLeftQueue - this.timeEnteredQueue;
  }
  
  // Get total time in system
  getTotalTime(currentTime: number): number {
    return currentTime - this.timeEnteredSystem;
  }
  
  // Visual representation based on character type
  getEmoji(): string {
    switch (this.characterType) {
      case CharacterType.PREGNANT:
        return '🤰';
      case CharacterType.PARENT_WITH_CHILD:
        return this.gender === 'F' ? '👩‍👧' : '👨‍👦';
      case CharacterType.ELDERLY:
        return this.gender === 'F' ? '👵' : '👴';
      case CharacterType.WHEELCHAIR:
        return '🧑‍🦽';
      default:
        return this.gender === 'F' ? '👩' : '👨';
    }
  }
  
  // Get color based on gender and character type
  getColor(): string {
    // Base colors by gender
    const femaleColors = {
      [CharacterType.REGULAR]: '#e91e63',
      [CharacterType.PREGNANT]: '#f48fb1',
      [CharacterType.PARENT_WITH_CHILD]: '#f06292',
      [CharacterType.ELDERLY]: '#ad1457',
      [CharacterType.WHEELCHAIR]: '#c2185b',
    };
    
    const maleColors = {
      [CharacterType.REGULAR]: '#3f51b5',
      [CharacterType.PREGNANT]: '#7986cb', // Not applicable but fallback
      [CharacterType.PARENT_WITH_CHILD]: '#5c6bc0',
      [CharacterType.ELDERLY]: '#303f9f',
      [CharacterType.WHEELCHAIR]: '#3949ab',
    };
    
    return this.gender === 'F' 
      ? femaleColors[this.characterType] 
      : maleColors[this.characterType];
  }
}

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
