// CA Simulation Engine - Updated with Character Types and Gender-Specific Times

import { mulberry32 } from './rng';
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

  private rand: () => number;

  constructor(config: Partial<CAConfig> = {}) {
    this.config = { ...DEFAULT_CA_CONFIG, ...config };
    this.rand = mulberry32((this.config.seed ?? 12345) >>> 0);
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
      p *= this.rand();
    } while (p > L);

    return k - 1;
  }

  private spawnPerson(): void {
    const r = this.rand();
    const gender: Gender = r < this.config.genderMix.female ? 'F' : 'M';
    
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

    if (!entranceCell) {
      console.warn(`No entrance found for ${gender}!`);
      return;
    }
    
    // Check if entrance is blocked - don't spawn if someone is already there
    const entranceBlocked = this.people.some(p => 
      p.col === entranceCell!.col && 
      p.row === entranceCell!.row && 
      p.state !== PersonState.DONE
    );
    
    if (entranceBlocked) {
      // Skip this spawn - entrance is blocked
      return;
    }
    
    // Get gender-specific service times
    const { dwellTime, sinkTime, changingTableTime } = this.generateServiceTimes(gender, characterType);

    // Men only use sink 50% of the time, women always use sink
    const willUseSink = gender === 'F' ? true : this.rand() < this.config.pMaleUseSink;

    const p = new Person(
      this.nextPersonId++,
      entranceCell.col,
      entranceCell.row,
      gender,
      characterType,
      dwellTime,
      sinkTime,
      this.stats.simTimeSeconds,
      changingTableTime,
      willUseSink
    );

    this.people.push(p);
  }
  
  private selectCharacterType(gender: Gender): CharacterType {
    // Temporary simplified behavior: force regular agents only while
    // debugging core queue/path logic.
    void gender;
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
      if (this.rand() < 0.5) {
        changingTableTime = this.randFloat(times.changingTable.min, times.changingTable.max);
      }
    }
    
    return { dwellTime, sinkTime, changingTableTime };
  }

  private updatePerson(p: Person): void {
    // People legitimately using fixtures stay in place; don't flag them as stuck.
    const inFixture =
      p.state === PersonState.IN_STALL ||
      p.state === PersonState.AT_SINK ||
      p.state === PersonState.AT_CHANGING_TABLE;

    if (inFixture) {
      p.stuckTicks = 0;
    } else {
      p.updateStuckStatus();
    }
    
    // Safety valve for people stuck in movement/queue states
    const SEVERE_STUCK = 60;
    
    if (p.isStuck(SEVERE_STUCK)) {
      // Release any claimed resources
      if (p.targetStall && p.targetStall.occupantId === p.id) {
        p.targetStall.occupantId = null;
        p.targetStall.occupiedUntil = 0;
      }
      if (p.targetSink && p.targetSink.occupantId === p.id) {
        p.targetSink.occupantId = null;
        p.targetSink.occupiedUntil = 0;
      }
      p.targetStall = null;
      p.targetSink = null;
      p.targetQueueIndex = null;
      p.state = PersonState.EXITING;
      p.stuckTicks = 0;
      return;
    }
    
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
    // Strict FIFO: everyone joins queue first; only front can claim a fixture.
    if (p.targetQueueIndex === null) {
      const nextQueueIndex = this.getNextQueuePositionIndex(p.gender);
      if (nextQueueIndex === null) {
        // Queue is full; this entrant bails instead of deadlocking at entrance.
        p.state = PersonState.EXITING;
        return;
      }
      p.targetQueueIndex = nextQueueIndex;
    }

    const queueCells = this.getQueueCellsForGender(p.gender);
    const targetCell = queueCells[p.targetQueueIndex];
    
    if (!targetCell) {
      console.warn(`No queue cell for person ${p.id} (${p.gender}) at index ${p.targetQueueIndex}`);
      p.state = PersonState.EXITING;
      return;
    }

    // If we've been stuck for a while, try a different approach
    if (p.stuckTicks > 15) {
      // Try to get any available queue position
      for (let i = 0; i < queueCells.length; i++) {
        const altCell = queueCells[i];
        if (altCell && !this.people.some(other => 
          other !== p && other.col === altCell.col && other.row === altCell.row && other.state !== PersonState.DONE
        )) {
          p.targetQueueIndex = i;
          p.stuckTicks = 0;
          break;
        }
      }
    }

    this.stepToward(p, queueCells[p.targetQueueIndex] || targetCell);

    if (p.isAt(queueCells[p.targetQueueIndex] || targetCell)) {
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

    // Only the person at the FRONT of the queue (index 0) can try to get a stall
    // This ensures proper FIFO ordering
    if (p.targetQueueIndex !== 0) {
      return; // Not at front, wait your turn
    }

    const freeStall = this.findAvailableStall(p);
    if (freeStall) {
      // If using urinal, adjust dwell time
      if (freeStall.type === 'urinal' && p.gender === 'M') {
        const times = this.config.serviceTimes;
        p.dwellTime = this.randFloat(times.male.urinalMin, times.male.urinalMax);
      }
      
      // Reserve the stall immediately so no one else targets it this tick
      freeStall.occupantId = p.id;

      // Release from queue and shift everyone forward
      p.targetStall = freeStall;
      p.state = PersonState.WALKING_TO_STALL;
      p.timeLeftQueue = this.stats.simTimeSeconds;

      // Advance the queue immediately for people already standing in line.
      this.popFromQueue(p.gender);

      // Clear queue position
      p.targetQueueIndex = null;
    }
  }
  
  /**
   * Shift everyone in queue forward by one position when front person leaves
   */
  private shiftQueueForward(gender: Gender): void {
    this.people.forEach(p => {
      if (
        p.gender === gender &&
        p.state !== PersonState.DONE &&
        // Only people already standing in the queue move forward.
        // Do NOT shift walking agents, or they can get assigned unreachable
        // slots ahead of occupied cells and freeze near the entrance.
        p.state === PersonState.IN_QUEUE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex > 0
      ) {
        p.targetQueueIndex -= 1;
      }
    });
  }

  private findAvailableStall(p: Person, excludeStall?: Stall | null): Stall | null {
    const availableStalls = this.grid.stalls.filter(s => 
      s !== excludeStall &&
      s.occupiedUntil <= this.stats.simTimeSeconds && 
      s.occupantId === null &&
      (s.genderAllowed === p.gender || s.genderAllowed === 'both')
    );

    if (availableStalls.length === 0) return null;

    // Prefer stalls that have a reachable path (avoids pathfinding deadlocks)
    const reachable = availableStalls.filter(s =>
      this.canReach(p, s.entranceCol, s.entranceRow)
    );
    const pool = reachable.length > 0 ? reachable : availableStalls;

    if (p.gender === 'M' && this.rand() < this.config.pMaleUrinal) {
      const urinals = pool.filter(s => s.type === 'urinal');
      if (urinals.length > 0) return this.pickRandomStall(urinals);
    }

    const nonUrinals = pool.filter(s => s.type !== 'urinal');
    if (nonUrinals.length > 0) return this.pickRandomStall(nonUrinals);
    return this.pickRandomStall(pool);
  }

  private canReach(p: Person, targetCol: number, targetRow: number): boolean {
    const isWalkable = this.getIsWalkable(p);
    const next = findNextStep(
      p.col, p.row, targetCol, targetRow,
      isWalkable, this.grid.cols, this.grid.rows
    );
    return next !== null;
  }

  private getIsWalkable(p: Person): (col: number, row: number) => boolean {
    return (col: number, row: number): boolean => {
      if (col < 0 || col >= this.grid.cols || row < 0 || row >= this.grid.rows) return false;
      const cellType = this.grid.getCell(row, col);
      if (cellType === CellType.WALL) return false;
      if (cellType === CellType.W_STALL || cellType === CellType.M_STALL ||
          cellType === CellType.URINAL || cellType === CellType.SINK ||
          cellType === CellType.SHARED_STALL || cellType === CellType.CHANGING_TABLE) {
        return (p.col === col && p.row === row);
      }
      const occupant = this.people.find(
        other => other !== p && other.col === col && other.row === row && other.state !== PersonState.DONE
      );
      if (occupant) {
        const movingStates: PersonState[] = [
          PersonState.WALKING_TO_QUEUE, PersonState.WALKING_TO_STALL,
          PersonState.WALKING_TO_SINK, PersonState.WALKING_TO_CHANGING_TABLE, PersonState.EXITING
        ];
        if (movingStates.includes(occupant.state) && p.stuckTicks > 5) return true;
        return false;
      }
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
  }

  private pickRandomStall(stalls: Stall[]): Stall {
    const idx = Math.floor(this.rand() * stalls.length);
    return stalls[idx]!;
  }

  private updateWalkingToStall(p: Person): void {
    if (!p.targetStall) {
      // Lost target; rejoin queue instead of skipping fixture stage.
      p.state = PersonState.WALKING_TO_QUEUE;
      return;
    }

    // If target is no longer available, rejoin queue.
    const targetTakenByOther =
      p.targetStall.occupantId !== null && p.targetStall.occupantId !== p.id;
    const targetBusy =
      p.targetStall.occupiedUntil > this.stats.simTimeSeconds &&
      p.targetStall.occupantId !== p.id;
    if (targetTakenByOther || targetBusy) {
      p.targetStall = null;
      p.targetQueueIndex = null;
      p.state = PersonState.WALKING_TO_QUEUE;
      p.stuckTicks = 0;
      return;
    }

    // If pathing to the reserved stall keeps failing, try a different stall
    // instead of going back to queue (avoids cycling through unreachable fixtures).
    if (p.stuckTicks > 12) {
      const oldStall = p.targetStall;
      if (oldStall && oldStall.occupantId === p.id) {
        oldStall.occupantId = null;
        oldStall.occupiedUntil = 0;
      }
      const altStall = this.findAvailableStall(p, oldStall);
      if (altStall) {
        p.targetStall = altStall;
        altStall.occupantId = p.id;
        if (altStall.type === 'urinal' && p.gender === 'M') {
          const times = this.config.serviceTimes;
          p.dwellTime = this.randFloat(times.male.urinalMin, times.male.urinalMax);
        }
        p.stuckTicks = 0;
        return;
      }
      p.targetStall = null;
      p.targetQueueIndex = null;
      p.state = PersonState.WALKING_TO_QUEUE;
      p.stuckTicks = 0;
      return;
    }

    const entranceCell = { 
      col: p.targetStall.entranceCol, 
      row: p.targetStall.entranceRow 
    };
    
    this.stepToward(p, entranceCell);

    if (p.col === entranceCell.col && p.row === entranceCell.row) {
      // Verify our reservation is still valid
      if (
        p.targetStall.occupantId !== null &&
        p.targetStall.occupantId !== p.id
      ) {
        p.targetStall = null;
        p.targetQueueIndex = null;
        p.state = PersonState.WALKING_TO_QUEUE;
        return;
      }

      p.targetStall.occupantId = p.id;
      p.moveTo(p.targetStall.col, p.targetStall.row);
      p.targetStall.occupiedUntil = Infinity;
      p.targetStall.lastChangeTime = this.stats.simTimeSeconds;
      
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
    // If this person doesn't want to use sink (50% of men), skip directly to exit
    if (!p.willUseSink) {
      p.state = PersonState.EXITING;
      return;
    }
    
    if (!p.targetSink) {
      // Find a sink that matches person's gender (or is shared)
      const freeSink = this.grid.sinks.find(
        s => s.occupiedUntil <= this.stats.simTimeSeconds && 
             s.occupantId === null &&
             (s.genderAllowed === p.gender || s.genderAllowed === 'both')
      );
      
      if (freeSink) {
        p.targetSink = freeSink;
        freeSink.occupantId = p.id;
        p.stuckTicks = 0;  // Reset stuck counter when we get a sink
      } else {
        // No free sink for this gender
        // If stuck waiting too long (20 ticks = ~10 seconds), give up and exit
        if (p.stuckTicks > 20) {
          console.log(`Person ${p.id} (${p.gender}) giving up on sink after waiting ${p.stuckTicks} ticks`);
          p.state = PersonState.EXITING;
          return;
        }
        // Keep trying - but move towards exit while waiting
        if (this.grid.exitCell) {
          this.stepToward(p, this.grid.exitCell);
        }
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
    if (p.walkSpeedMultiplier < 1.0 && this.rand() > p.walkSpeedMultiplier) return;

    const isWalkable = this.getIsWalkable(p);
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
    return gender === 'F' ? this.grid.queueCellsWomen : this.grid.queueCellsMen;
  }

  private getNextQueuePositionIndex(gender: Gender): number | null {
    const queueCells = this.getQueueCellsForGender(gender);
    let queueCount = 0;

    // Keep queue contiguous from front (0..n-1); new entrant gets back index n.
    this.people.forEach(p => {
      if (
        p.gender === gender &&
        p.state !== PersonState.DONE &&
        (p.state === PersonState.IN_QUEUE || p.state === PersonState.WALKING_TO_QUEUE) &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      ) {
        queueCount++;
      }
    });

    if (queueCount >= queueCells.length) return null;
    return queueCount;
  }

  /**
   * Called when front person (index 0) leaves queue for a stall.
   * Shifts everyone forward by decrementing their targetQueueIndex.
   * This is the ONLY place queue indices are shifted.
   */
  private popFromQueue(gender: Gender): void {
    // Shift everyone forward: decrement targetQueueIndex for all in queue
    // Only shift people who are physically IN_QUEUE (already at their spot)
    // People WALKING_TO_QUEUE keep their original target to avoid path confusion
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

  /**
   * Resolves conflicts where multiple people target the same queue index.
   * Does NOT shift indices - that's popFromQueue's job.
   * Only handles edge cases like people arriving at same slot simultaneously.
   */
  private maintainQueueOrder(gender: Gender): void {
    const queueCells = this.getQueueCellsForGender(gender);
    if (queueCells.length === 0) return;
    // Deterministically compact all active queue participants to 0..n-1.
    // This prevents holes that can deadlock the queue head.
    const queuePeople = this.people
      .filter(p =>
        p.gender === gender &&
        p.state !== PersonState.DONE &&
        (p.state === PersonState.IN_QUEUE || p.state === PersonState.WALKING_TO_QUEUE) &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      )
      .sort((a, b) => {
        const aIdx = a.targetQueueIndex ?? Number.MAX_SAFE_INTEGER;
        const bIdx = b.targetQueueIndex ?? Number.MAX_SAFE_INTEGER;
        if (aIdx !== bIdx) return aIdx - bIdx;
        if (a.timeEnteredSystem !== b.timeEnteredSystem) {
          return a.timeEnteredSystem - b.timeEnteredSystem;
        }
        return a.id - b.id;
      });

    for (let i = 0; i < queuePeople.length; i++) {
      const qp = queuePeople[i];
      if (!qp) continue;

      if (i < queueCells.length) {
        qp.targetQueueIndex = i;
      } else {
        qp.targetQueueIndex = null;
        qp.state = PersonState.EXITING;
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
    return this.rand() * (max - min) + min;
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
