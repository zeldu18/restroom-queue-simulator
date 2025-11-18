// CA Simulation Engine

import { Person, manhattan, shuffleArray } from './ca-person';
import { CAGrid } from './ca-grid';
import { type CAConfig, type SimStats, PersonState, CellType, type Gender, type Cell, type Stall, type Sink, type QueueCell } from './ca-types';

export class CASimulation {
  config: CAConfig;
  grid: CAGrid;
  people: Person[];
  stats: SimStats;
  running: boolean;
  nextPersonId: number;

  constructor(config: CAConfig) {
    this.config = config;
    this.grid = new CAGrid(config.gridCols, config.gridRows);
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
    };
  }

  reset(): void {
    this.people = [];
    this.stats = this.createEmptyStats();
    this.nextPersonId = 1;
    this.grid.stalls.forEach(s => {
      s.occupiedUntil = 0;
      s.occupantId = null;
    });
    this.grid.sinks.forEach(s => {
      s.occupiedUntil = 0;
      s.occupantId = null;
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
    
    // Choose entrance based on gender
    let entranceCell: Cell | null = null;
    if (this.grid.entranceWomen && gender === 'F') {
      entranceCell = this.grid.entranceWomen;
    } else if (this.grid.entranceMen && gender === 'M') {
      entranceCell = this.grid.entranceMen;
    } else if (this.grid.entranceCell) {
      entranceCell = this.grid.entranceCell;
    }

    if (!entranceCell) return;
    
    const dwellTime = this.randFloat(this.config.dwellTimeMin, this.config.dwellTimeMax);
    const sinkTime = this.randFloat(this.config.sinkTimeMin, this.config.sinkTimeMax);

    const p = new Person(
      this.nextPersonId++,
      entranceCell.col,
      entranceCell.row,
      gender,
      dwellTime,
      sinkTime,
      this.stats.simTimeSeconds
    );

    this.people.push(p);
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
    }
  }

  private updateInQueue(p: Person): void {
    // Queue snapping: person stays at their queue cell, no wandering
    const queueCells = this.getQueueCellsForGender(p.gender);
    const myCell = queueCells[p.targetQueueIndex ?? 0];
    
    // STRICT RULE: Stay snapped to your queue cell. No movement until released.
    if (myCell) {
      p.moveTo(myCell.col, myCell.row);
    }

    // ONLY the person at index 0 can be released to a fixture
    // Everyone else waits in line
    if (p.targetQueueIndex === 0 && myCell && p.isAt(myCell)) {
      // Check for a TRULY free stall (not reserved, not occupied)
      const freeStall = this.findAvailableStall(p.gender);
      if (freeStall) {
        // Release this person from queue
        p.targetStall = freeStall;
        p.state = PersonState.WALKING_TO_STALL;
        
        // Remove from queue, everyone else shifts forward
        this.popFromQueue(p.gender);
      }
    }
    // If NOT at front (targetQueueIndex > 0), do nothing - stay in line
  }

  private findAvailableStall(gender: Gender): Stall | null {
    // Find TRULY free stalls that this gender can use
    // Must be: not occupied AND not reserved (occupantId === null)
    const availableStalls = this.grid.stalls.filter(s => 
      s.occupiedUntil <= this.stats.simTimeSeconds && 
      s.occupantId === null &&
      (s.genderAllowed === gender || s.genderAllowed === 'both')
    );

    if (availableStalls.length === 0) return null;

    // For men, prefer urinals with given probability
    if (gender === 'M' && Math.random() < this.config.pMaleUrinal) {
      const urinals = availableStalls.filter(s => s.type === 'urinal');
      if (urinals.length > 0) {
        return urinals[0];
      }
    }

    // Otherwise return any available stall
    return availableStalls[0];
  }

  private updateWalkingToStall(p: Person): void {
    if (!p.targetStall) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    this.stepToward(p, p.targetStall);

    if (p.isAt(p.targetStall)) {
      // NOW mark as occupied (person has actually entered)
      p.targetStall.occupiedUntil = Infinity;
      p.targetStall.occupantId = p.id;
      
      p.state = PersonState.IN_STALL;
      p.timeEnteredStall = this.stats.simTimeSeconds;
    }
  }

  private updateInStall(p: Person): void {
    if (p.timeEnteredStall === null) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    // Person stays in stall (snapped to fixture position)
    if (p.targetStall && !p.isAt(p.targetStall)) {
      p.moveTo(p.targetStall.col, p.targetStall.row);
    }

    if (this.stats.simTimeSeconds - p.timeEnteredStall >= p.dwellTime) {
      // Leave stall
      if (p.targetStall && p.targetStall.occupantId === p.id) {
        p.targetStall.occupiedUntil = 0;
        p.targetStall.occupantId = null;
      }
      p.targetStall = null;
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
        // DON'T mark as occupied yet - wait until they actually reach it
      } else {
        // No free sink, skip to exit
        p.state = PersonState.EXITING;
        return;
      }
    }

    this.stepToward(p, p.targetSink);

    if (p.isAt(p.targetSink)) {
      // NOW mark as occupied (person has actually entered)
      p.targetSink.occupiedUntil = Infinity;
      p.targetSink.occupantId = p.id;
      
      p.state = PersonState.AT_SINK;
      p.timeEnteredSink = this.stats.simTimeSeconds;
    }
  }

  private updateAtSink(p: Person): void {
    if (p.timeEnteredSink === null) {
      p.state = PersonState.EXITING;
      return;
    }

    // Stay at sink
    if (p.targetSink && !p.isAt(p.targetSink)) {
      p.moveTo(p.targetSink.col, p.targetSink.row);
    }

    if (this.stats.simTimeSeconds - p.timeEnteredSink >= p.sinkTime) {
      // Leave sink
      if (p.targetSink && p.targetSink.occupantId === p.id) {
        p.targetSink.occupiedUntil = 0;
        p.targetSink.occupantId = null;
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
      if (this.stats.simTimeSeconds > this.config.warmupSeconds) {
        this.stats.servedCount += 1;
        this.stats.totalTimeInSystem += totalTime;

        if (p.gender === 'F') {
          this.stats.femaleCount += 1;
          this.stats.femaleTimeInSystem += totalTime;
        } else {
          this.stats.maleCount += 1;
          this.stats.maleTimeInSystem += totalTime;
        }
      }
    }
  }

  private stepToward(p: Person, target: Cell): void {
    const options = [
      { dc: 0, dr: -1 }, // up
      { dc: 1, dr: 0 },  // right
      { dc: 0, dr: 1 },  // down
      { dc: -1, dr: 0 }  // left
    ];

    shuffleArray(options);

    let bestMove: { nc: number; nr: number } | null = null;
    let bestDist = Infinity;

    for (const { dc, dr } of options) {
      const nc = p.col + dc;
      const nr = p.row + dr;

      if (nc < 0 || nc >= this.grid.cols || nr < 0 || nr >= this.grid.rows) continue;

      const cellType = this.grid.getCell(nr, nc);

      // Avoid walls
      if (cellType === CellType.WALL) continue;

      // Can't step into occupied stalls/urinals/sinks unless it's your target
      if (cellType === CellType.W_STALL || cellType === CellType.M_STALL || cellType === CellType.URINAL) {
        if (!(target.col === nc && target.row === nr)) continue;
      }
      if (cellType === CellType.SINK) {
        if (!(target.col === nc && target.row === nr)) continue;
      }

      // Avoid other people
      if (this.people.some(other => other !== p && other.col === nc && other.row === nr && other.state !== PersonState.DONE)) {
        continue;
      }

      const dist = manhattan({ col: nc, row: nr }, target);
      if (dist < bestDist) {
        bestDist = dist;
        bestMove = { nc, nr };
      }
    }

    if (bestMove) {
      p.moveTo(bestMove.nc, bestMove.nr);
    }
  }

  private getQueueCellsForGender(gender: Gender): QueueCell[] {
    if (this.grid.queueCellsShared.length > 0) {
      return this.grid.queueCellsShared;
    }
    return gender === 'F' ? this.grid.queueCellsWomen : this.grid.queueCellsMen;
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
    // Remove person at index 0, shift everyone else forward
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
    // Maintain women's queue
    this.maintainQueueOrder('F');
    // Maintain men's queue
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
        // Cell is empty; move someone from behind forward
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
}
