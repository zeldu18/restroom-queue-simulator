// CA Simulation Engine - Updated with Character Types and Gender-Specific Times

import { Person, shuffleArray } from './ca-person';
import { CAGrid } from './ca-grid';
import { 
  type CAConfig, 
  type SimStats, 
  PersonState, 
  CellType, 
  type Gender, 
  type Cell, 
  type Stall, 
  type Sink,
  type ChangingTable,
  type QueueCell,
  CharacterType,
  type CharacterFrequencies,
  DEFAULT_CHARACTER_FREQUENCIES,
  DEFAULT_SERVICE_TIMES,
  DEFAULT_CA_CONFIG,
} from './ca-types';
import { findNextStep } from './pathfinding';

export class CASimulation {
  config: CAConfig;
  grid: CAGrid;
  people: Person[];
  stats: SimStats;
  running: boolean;
  nextPersonId: number;

  constructor(config: Partial<CAConfig> = {}) {
    this.config = { ...DEFAULT_CA_CONFIG, ...config };
    this.grid = new CAGrid(this.config.gridCols, this.config.gridRows);
    this.people = [];
    this.stats = this.createEmptyStats();
    this.running = false;
    this.nextPersonId = 1;
  }

  private createEmptyStats(): SimStats {
    return {
      simTimeSeconds: 0,
      servedCount: 0,
      totalTimeInSystem: 0,
      femaleCount: 0,
      maleCount: 0,
      femaleTimeInSystem: 0,
      maleTimeInSystem: 0,
      femaleWaitTime: 0,
      maleWaitTime: 0,
      maxQueueLength: 0,
      currentQueueLength: 0,
      characterTypeCounts: {
        [CharacterType.REGULAR]: 0,
        [CharacterType.PREGNANT]: 0,
        [CharacterType.PARENT_WITH_CHILD]: 0,
        [CharacterType.ELDERLY]: 0,
        [CharacterType.WHEELCHAIR]: 0,
      },
    };
  }

  reset(): void {
    this.people = [];
    this.stats = this.createEmptyStats();
    this.nextPersonId = 1;
    this.grid.stalls.forEach(s => {
      s.occupiedUntil = 0;
      s.occupantId = null;
      s.lastChangeTime = 0;
    });
    this.grid.sinks.forEach(s => {
      s.occupiedUntil = 0;
      s.occupantId = null;
      s.lastChangeTime = 0;
    });
    this.grid.changingTables.forEach(t => {
      t.occupiedUntil = 0;
      t.occupantId = null;
      t.lastChangeTime = 0;
    });
  }

  start(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  /**
   * Main update tick
   */
  update(): void {
    if (!this.running) return;

    // 1. Advance time
    this.stats.simTimeSeconds += this.config.secondsPerTick;

    // 2. Process arrivals
    this.processArrivals();

    // 3. Update all agents
    for (const p of this.people) {
      if (p.state !== PersonState.DONE) {
        this.updatePerson(p);
      }
    }

    // 4. Maintain queue order
    this.maintainAllQueues();
    
    // 5. Update queue stats
    this.updateQueueStats();
  }

  private processArrivals(): void {
    const lambdaPerSec = this.config.arrivalRatePerMin / 60;
    const dt = this.config.secondsPerTick;
    const mean = lambdaPerSec * dt;

    // Proper Poisson sampling (not Bernoulli approximation)
    const numArrivals = this.samplePoisson(mean);
    
    for (let i = 0; i < numArrivals; i++) {
      this.spawnPerson();
    }
  }

  private samplePoisson(mean: number): number {
    // Knuth's algorithm for Poisson sampling
    const L = Math.exp(-mean);
    let k = 0;
    let p = 1;
    
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    
    return k - 1;
  }

  private spawnPerson(): void {
    const rand = Math.random();
    const gender: Gender = rand < this.config.genderMix.female ? 'F' : 'M';
    
    // Determine character type based on frequencies
    const characterType = this.selectCharacterType(gender);
    
    // Choose entrance based on gender
    let entranceCell: Cell | null = null;
    if (this.grid.entranceWomen && gender === 'F') {
      entranceCell = this.grid.entranceWomen;
    } else if (this.grid.entranceMen && gender === 'M') {
      entranceCell = this.grid.entranceMen;
    } else if (this.grid.entranceCell) {
      entranceCell = this.grid.entranceCell;
    }

    const entranceInfo = entranceCell ? `at (${entranceCell.col}, ${entranceCell.row})` : 'NO ENTRANCE';
    console.log(`Spawning ${gender}: ${entranceInfo}, W@(${this.grid.entranceWomen?.col},${this.grid.entranceWomen?.row}), M@(${this.grid.entranceMen?.col},${this.grid.entranceMen?.row})`);

    if (!entranceCell) {
      console.warn(`No entrance found for ${gender}!`);
      return;
    }
    
    // Get gender-specific service times
    const { dwellTime, sinkTime, changingTableTime } = this.generateServiceTimes(gender, characterType);

    const p = new Person(
      this.nextPersonId++,
      entranceCell.col,
      entranceCell.row,
      gender,
      characterType,
      dwellTime,
      sinkTime,
      this.stats.simTimeSeconds,
      changingTableTime
    );

    this.people.push(p);
  }
  
  private selectCharacterType(gender: Gender): CharacterType {
    const freq = this.config.characterFrequencies;
    const rand = Math.random();
    
    let cumulative = 0;
    
    // Pregnant only applies to women
    if (gender === 'F') {
      cumulative += freq.pregnant;
      if (rand < cumulative) return CharacterType.PREGNANT;
    }
    
    cumulative += freq.parentWithChild;
    if (rand < cumulative) return CharacterType.PARENT_WITH_CHILD;
    
    cumulative += freq.elderly;
    if (rand < cumulative) return CharacterType.ELDERLY;
    
    cumulative += freq.wheelchair;
    if (rand < cumulative) return CharacterType.WHEELCHAIR;
    
    return CharacterType.REGULAR;
  }
  
  private generateServiceTimes(gender: Gender, characterType: CharacterType): {
    dwellTime: number;
    sinkTime: number;
    changingTableTime: number;
  } {
    const times = this.config.serviceTimes;
    let dwellTime: number;
    let sinkTime: number;
    let changingTableTime = 0;
    
    if (gender === 'F') {
      dwellTime = this.randFloat(times.female.stallMin, times.female.stallMax);
      sinkTime = this.randFloat(times.female.sinkMin, times.female.sinkMax);
    } else {
      // For men, sometimes use urinal times (handled in stall selection)
      dwellTime = this.randFloat(times.male.stallMin, times.male.stallMax);
      sinkTime = this.randFloat(times.male.sinkMin, times.male.sinkMax);
    }
    
    // Parents with children may need changing table
    if (characterType === CharacterType.PARENT_WITH_CHILD) {
      // 50% chance they need the changing table
      if (Math.random() < 0.5) {
        changingTableTime = this.randFloat(times.changingTable.min, times.changingTable.max);
      }
    }
    
    return { dwellTime, sinkTime, changingTableTime };
  }

  private updatePerson(p: Person): void {
    switch (p.state) {
      case PersonState.WALKING_TO_QUEUE:
        this.updateWalkingToQueue(p);
        break;
      case PersonState.IN_QUEUE:
        this.updateInQueue(p);
        break;
      case PersonState.WALKING_TO_STALL:
        this.updateWalkingToStall(p);
        break;
      case PersonState.IN_STALL:
        this.updateInStall(p);
        break;
      case PersonState.WALKING_TO_CHANGING_TABLE:
        this.updateWalkingToChangingTable(p);
        break;
      case PersonState.AT_CHANGING_TABLE:
        this.updateAtChangingTable(p);
        break;
      case PersonState.WALKING_TO_SINK:
        this.updateWalkingToSink(p);
        break;
      case PersonState.AT_SINK:
        this.updateAtSink(p);
        break;
      case PersonState.EXITING:
        this.updateExiting(p);
        break;
    }
  }

  private updateWalkingToQueue(p: Person): void {
    if (p.targetQueueIndex === null) {
      p.targetQueueIndex = this.getNextQueuePositionIndex(p.gender);
    }

    const queueCells = this.getQueueCellsForGender(p.gender);
    const targetCell = queueCells[p.targetQueueIndex];
    
    if (!targetCell) {
      p.state = PersonState.EXITING;
      return;
    }

    this.stepToward(p, targetCell);

    if (p.isAt(targetCell)) {
      p.state = PersonState.IN_QUEUE;
      p.timeEnteredQueue = this.stats.simTimeSeconds;
    }
  }

  private updateInQueue(p: Person): void {
    const queueCells = this.getQueueCellsForGender(p.gender);
    const myCell = queueCells[p.targetQueueIndex ?? 0];
    
    // Stay snapped to queue cell
    if (myCell) {
      p.moveTo(myCell.col, myCell.row);
    }

    // Only the person at index 0 can be released to a fixture
    if (p.targetQueueIndex === 0 && myCell && p.isAt(myCell)) {
      const freeStall = this.findAvailableStall(p);
      if (freeStall) {
        // Reserve the stall
        freeStall.occupantId = p.id;
        
        // If using urinal, adjust dwell time
        if (freeStall.type === 'urinal' && p.gender === 'M') {
          const times = this.config.serviceTimes;
          p.dwellTime = this.randFloat(times.male.urinalMin, times.male.urinalMax);
        }
        
        // Release from queue
        p.targetStall = freeStall;
        p.state = PersonState.WALKING_TO_STALL;
        p.timeLeftQueue = this.stats.simTimeSeconds;
        
        // Remove from queue
        this.popFromQueue(p.gender);
      }
    }
  }

  private findAvailableStall(p: Person): Stall | null {
    // Find TRULY free stalls that this person can use
    const availableStalls = this.grid.stalls.filter(s => 
      s.occupiedUntil <= this.stats.simTimeSeconds && 
      s.occupantId === null &&
      (s.genderAllowed === p.gender || s.genderAllowed === 'both') &&
      // Wheelchair users need accessible stalls
      (!p.needsAccessibleStall || s.isAccessible)
    );

    if (availableStalls.length === 0) return null;

    // For men, prefer urinals with given probability
    if (p.gender === 'M' && Math.random() < this.config.pMaleUrinal) {
      const urinals = availableStalls.filter(s => s.type === 'urinal');
      if (urinals.length > 0) {
        return urinals[0];
      }
    }

    // If not using urinal (or no urinals available), prefer non-urinal stalls
    // This fixes the issue where men who don't want urinals still get assigned to them
    const nonUrinals = availableStalls.filter(s => s.type !== 'urinal');
    if (nonUrinals.length > 0) {
      return nonUrinals[0];
    }

    // Fallback to any available fixture (urinal) if no stalls available
    return availableStalls[0];
  }

  private updateWalkingToStall(p: Person): void {
    if (!p.targetStall) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    const entranceCell = { 
      col: p.targetStall.entranceCol, 
      row: p.targetStall.entranceRow 
    };
    
    this.stepToward(p, entranceCell);

    if (p.col === entranceCell.col && p.row === entranceCell.row) {
      p.moveTo(p.targetStall.col, p.targetStall.row);
      
      if (p.targetStall.occupantId === p.id) {
        p.targetStall.occupiedUntil = Infinity;
        p.targetStall.lastChangeTime = this.stats.simTimeSeconds;
      }
      
      p.state = PersonState.IN_STALL;
      p.timeEnteredStall = this.stats.simTimeSeconds;
    }
  }

  private updateInStall(p: Person): void {
    if (p.timeEnteredStall === null) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    if (p.targetStall && !p.isAt(p.targetStall)) {
      p.moveTo(p.targetStall.col, p.targetStall.row);
    }

    if (this.stats.simTimeSeconds - p.timeEnteredStall >= p.dwellTime) {
      // Leave stall
      if (p.targetStall && p.targetStall.occupantId === p.id) {
        p.targetStall.occupiedUntil = 0;
        p.targetStall.occupantId = null;
        p.targetStall.lastChangeTime = this.stats.simTimeSeconds;
      }
      p.targetStall = null;
      
      // Check if needs changing table
      if (p.needsChangingTable && !p.hasUsedChangingTable && p.changingTableTime > 0) {
        p.state = PersonState.WALKING_TO_CHANGING_TABLE;
      } else {
        p.state = PersonState.WALKING_TO_SINK;
      }
    }
  }
  
  private updateWalkingToChangingTable(p: Person): void {
    if (!p.targetChangingTable) {
      const freeTable = this.grid.changingTables.find(
        t => t.occupiedUntil <= this.stats.simTimeSeconds && t.occupantId === null
      );
      if (freeTable) {
        p.targetChangingTable = freeTable;
        freeTable.occupantId = p.id;
      } else {
        // No free table, skip to sink
        p.hasUsedChangingTable = true;
        p.state = PersonState.WALKING_TO_SINK;
        return;
      }
    }

    const entranceCell = {
      col: p.targetChangingTable.entranceCol,
      row: p.targetChangingTable.entranceRow
    };
    
    this.stepToward(p, entranceCell);

    if (p.col === entranceCell.col && p.row === entranceCell.row) {
      p.moveTo(p.targetChangingTable.col, p.targetChangingTable.row);
      
      if (p.targetChangingTable.occupantId === p.id) {
        p.targetChangingTable.occupiedUntil = Infinity;
        p.targetChangingTable.lastChangeTime = this.stats.simTimeSeconds;
      }
      
      p.state = PersonState.AT_CHANGING_TABLE;
      p.timeEnteredChangingTable = this.stats.simTimeSeconds;
    }
  }
  
  private updateAtChangingTable(p: Person): void {
    if (p.timeEnteredChangingTable === null) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    if (p.targetChangingTable && !p.isAt(p.targetChangingTable)) {
      p.moveTo(p.targetChangingTable.col, p.targetChangingTable.row);
    }

    if (this.stats.simTimeSeconds - p.timeEnteredChangingTable >= p.changingTableTime) {
      // Leave changing table
      if (p.targetChangingTable && p.targetChangingTable.occupantId === p.id) {
        p.targetChangingTable.occupiedUntil = 0;
        p.targetChangingTable.occupantId = null;
        p.targetChangingTable.lastChangeTime = this.stats.simTimeSeconds;
      }
      p.targetChangingTable = null;
      p.hasUsedChangingTable = true;
      p.state = PersonState.WALKING_TO_SINK;
    }
  }

  private updateWalkingToSink(p: Person): void {
    if (!p.targetSink) {
      const freeSink = this.grid.sinks.find(
        s => s.occupiedUntil <= this.stats.simTimeSeconds && s.occupantId === null
      );
      if (freeSink) {
        p.targetSink = freeSink;
        freeSink.occupantId = p.id;
      } else {
        // No free sink, skip to exit
        p.state = PersonState.EXITING;
        return;
      }
    }

    const entranceCell = {
      col: p.targetSink.entranceCol,
      row: p.targetSink.entranceRow
    };
    
    this.stepToward(p, entranceCell);

    if (p.col === entranceCell.col && p.row === entranceCell.row) {
      p.moveTo(p.targetSink.col, p.targetSink.row);
      
      if (p.targetSink.occupantId === p.id) {
        p.targetSink.occupiedUntil = Infinity;
        p.targetSink.lastChangeTime = this.stats.simTimeSeconds;
      }
      
      p.state = PersonState.AT_SINK;
      p.timeEnteredSink = this.stats.simTimeSeconds;
    }
  }

  private updateAtSink(p: Person): void {
    if (p.timeEnteredSink === null) {
      p.state = PersonState.EXITING;
      return;
    }

    if (p.targetSink && !p.isAt(p.targetSink)) {
      p.moveTo(p.targetSink.col, p.targetSink.row);
    }

    if (this.stats.simTimeSeconds - p.timeEnteredSink >= p.sinkTime) {
      // Leave sink
      if (p.targetSink && p.targetSink.occupantId === p.id) {
        p.targetSink.occupiedUntil = 0;
        p.targetSink.occupantId = null;
        p.targetSink.lastChangeTime = this.stats.simTimeSeconds;
      }
      p.targetSink = null;
      p.state = PersonState.EXITING;
    }
  }

  private updateExiting(p: Person): void {
    if (!this.grid.exitCell) return;

    this.stepToward(p, this.grid.exitCell);

    if (p.isAt(this.grid.exitCell)) {
      p.state = PersonState.DONE;
      
      // Only count people who completed AFTER the warmup period
      const totalTime = this.stats.simTimeSeconds - p.timeEnteredSystem;
      const waitTime = p.getWaitTime();
      
      if (this.stats.simTimeSeconds > this.config.warmupSeconds) {
        this.stats.servedCount += 1;
        this.stats.totalTimeInSystem += totalTime;
        this.stats.characterTypeCounts[p.characterType] += 1;

        if (p.gender === 'F') {
          this.stats.femaleCount += 1;
          this.stats.femaleTimeInSystem += totalTime;
          this.stats.femaleWaitTime += waitTime;
        } else {
          this.stats.maleCount += 1;
          this.stats.maleTimeInSystem += totalTime;
          this.stats.maleWaitTime += waitTime;
        }
      }
    }
  }

  private stepToward(p: Person, target: Cell): void {
    // Apply walk speed multiplier for slower characters
    // For slower characters, they may not move every tick
    if (p.walkSpeedMultiplier < 1.0) {
      const moveChance = p.walkSpeedMultiplier;
      if (Math.random() > moveChance) {
        return; // Skip movement this tick
      }
    }
    
    const isWalkable = (col: number, row: number): boolean => {
      if (col < 0 || col >= this.grid.cols || row < 0 || row >= this.grid.rows) {
        return false;
      }

      const cellType = this.grid.getCell(row, col);

      if (cellType === CellType.WALL) return false;

      // Fixtures are NOT walkable
      if (cellType === CellType.W_STALL || cellType === CellType.M_STALL || 
          cellType === CellType.URINAL || cellType === CellType.SINK ||
          cellType === CellType.SHARED_STALL || cellType === CellType.CHANGING_TABLE) {
        return (p.col === col && p.row === row);
      }

      // Check for other people
      const occupied = this.people.some(
        other => other !== p && 
        other.col === col && 
        other.row === row && 
        other.state !== PersonState.DONE
      );
      
      if (occupied) return false;

      // Don't allow walking to entrance cells of occupied fixtures
      const isOccupiedStallEntrance = this.grid.stalls.some(
        s => s.entranceCol === col && s.entranceRow === row && s.occupantId !== null && s.occupantId !== p.id
      );
      const isOccupiedSinkEntrance = this.grid.sinks.some(
        s => s.entranceCol === col && s.entranceRow === row && s.occupantId !== null && s.occupantId !== p.id
      );
      const isOccupiedTableEntrance = this.grid.changingTables.some(
        t => t.entranceCol === col && t.entranceRow === row && t.occupantId !== null && t.occupantId !== p.id
      );
      
      return !isOccupiedStallEntrance && !isOccupiedSinkEntrance && !isOccupiedTableEntrance;
    };

    const nextCell = findNextStep(
      p.col,
      p.row,
      target.col,
      target.row,
      isWalkable,
      this.grid.cols,
      this.grid.rows
    );

    if (nextCell) {
      p.moveTo(nextCell.col, nextCell.row);
    }
  }

  private getQueueCellsForGender(gender: Gender): QueueCell[] {
    if (this.grid.queueCellsShared.length > 0) {
      return this.grid.queueCellsShared;
    }
    const cells = gender === 'F' ? this.grid.queueCellsWomen : this.grid.queueCellsMen;
    console.log(`Queue cells for ${gender}: ${cells.length} cells available`);
    return cells;
  }

  private getNextQueuePositionIndex(gender: Gender): number {
    const queueCells = this.getQueueCellsForGender(gender);
    const occupiedIndices = new Set<number>();
    
    this.people.forEach(p => {
      if (
        p.gender === gender &&
        p.state !== PersonState.DONE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      ) {
        occupiedIndices.add(p.targetQueueIndex);
      }
    });

    // Find first free slot from the end (back of queue)
    for (let i = queueCells.length - 1; i >= 0; i--) {
      if (!occupiedIndices.has(i)) {
        return i;
      }
    }

    return queueCells.length - 1;
  }

  private popFromQueue(gender: Gender): void {
    this.people.forEach(p => {
      if (
        p.gender === gender &&
        p.state === PersonState.IN_QUEUE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex > 0
      ) {
        p.targetQueueIndex -= 1;
      }
    });
  }

  private maintainAllQueues(): void {
    this.maintainQueueOrder('F');
    this.maintainQueueOrder('M');
  }

  private maintainQueueOrder(gender: Gender): void {
    const queueCells = this.getQueueCellsForGender(gender);
    if (queueCells.length === 0) return;

    const occupiedByIndex = new Map<number, Person>();
    this.people.forEach(p => {
      if (
        p.gender === gender &&
        p.state === PersonState.IN_QUEUE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      ) {
        occupiedByIndex.set(p.targetQueueIndex, p);
      }
    });

    // Fill gaps in queue
    for (let i = 0; i < queueCells.length; i++) {
      const occupant = occupiedByIndex.get(i);
      if (!occupant) {
        for (let j = i + 1; j < queueCells.length; j++) {
          const p = occupiedByIndex.get(j);
          if (p) {
            p.targetQueueIndex = i;
            break;
          }
        }
      }
    }
  }
  
  private updateQueueStats(): void {
    const inQueue = this.people.filter(p => p.state === PersonState.IN_QUEUE).length;
    this.stats.currentQueueLength = inQueue;
    if (inQueue > this.stats.maxQueueLength) {
      this.stats.maxQueueLength = inQueue;
    }
  }

  private randFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  getAverageTime(): number {
    return this.stats.servedCount > 0
      ? this.stats.totalTimeInSystem / this.stats.servedCount
      : 0;
  }

  getFemaleAverageTime(): number {
    return this.stats.femaleCount > 0
      ? this.stats.femaleTimeInSystem / this.stats.femaleCount
      : 0;
  }

  getMaleAverageTime(): number {
    return this.stats.maleCount > 0
      ? this.stats.maleTimeInSystem / this.stats.maleCount
      : 0;
  }
  
  getFemaleAverageWaitTime(): number {
    return this.stats.femaleCount > 0
      ? this.stats.femaleWaitTime / this.stats.femaleCount
      : 0;
  }
  
  getMaleAverageWaitTime(): number {
    return this.stats.maleCount > 0
      ? this.stats.maleWaitTime / this.stats.maleCount
      : 0;
  }
}
