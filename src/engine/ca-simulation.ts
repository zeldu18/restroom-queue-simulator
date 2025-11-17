// CA Simulation Engine

import { Person, manhattan, shuffleArray } from './ca-person';
import { CAGrid } from './ca-grid';
import { type CAConfig, type SimStats, PersonState, CellType, type Gender, type Cell, type Stall, type Sink } from './ca-types';

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

    // 4. Clean up done people (optional - keep for stats)
    // this.people = this.people.filter(p => p.state !== PersonState.DONE);
  }

  private processArrivals(): void {
    const lambdaPerSec = this.config.arrivalRatePerMin / 60;
    const dt = this.config.secondsPerTick;
    const probNew = lambdaPerSec * dt;

    if (Math.random() < probNew) {
      this.spawnPerson();
    }
  }

  private spawnPerson(): void {
    if (!this.grid.entranceCell) return;

    const rand = Math.random();
    const gender: Gender = rand < this.config.genderMix.female ? 'F' : 'M';
    
    const dwellTime = this.randFloat(this.config.dwellTimeMin, this.config.dwellTimeMax);
    const sinkTime = this.randFloat(this.config.sinkTimeMin, this.config.sinkTimeMax);

    const p = new Person(
      this.nextPersonId++,
      this.grid.entranceCell.col,
      this.grid.entranceCell.row,
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
      p.targetQueueIndex = this.getNextQueuePositionIndex();
    }
    const targetCell = this.grid.queueCells[p.targetQueueIndex];
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
    this.maintainQueueOrder();

    // If at front of queue, try to get a free stall
    if (p.targetQueueIndex === 0 && this.grid.queueCells[0] && p.isAt(this.grid.queueCells[0])) {
      const freeStall = this.findFreeStall(p.gender);
      if (freeStall) {
        p.targetStall = freeStall;
        freeStall.occupiedUntil = Infinity;
        freeStall.occupantId = p.id;
        p.state = PersonState.WALKING_TO_STALL;
      }
    }
  }

  private findFreeStall(gender: Gender): Stall | null {
    // For men, prefer urinals if available
    if (gender === 'M' && Math.random() < this.config.pMaleUrinal) {
      const freeUrinal = this.grid.stalls.find(
        s => s.type === 'urinal' && s.occupiedUntil <= this.stats.simTimeSeconds && s.occupantId === null
      );
      if (freeUrinal) return freeUrinal;
    }

    // Otherwise get any free stall
    return this.grid.stalls.find(
      s => s.occupiedUntil <= this.stats.simTimeSeconds && s.occupantId === null
    ) || null;
  }

  private updateWalkingToStall(p: Person): void {
    if (!p.targetStall) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
    }

    this.stepToward(p, p.targetStall);

    if (p.isAt(p.targetStall)) {
      p.state = PersonState.IN_STALL;
      p.timeEnteredStall = this.stats.simTimeSeconds;
    }
  }

  private updateInStall(p: Person): void {
    if (p.timeEnteredStall === null) {
      p.state = PersonState.WALKING_TO_SINK;
      return;
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
        freeSink.occupiedUntil = Infinity;
        freeSink.occupantId = p.id;
      } else {
        // No free sink, skip to exit
        p.state = PersonState.EXITING;
        return;
      }
    }

    this.stepToward(p, p.targetSink);

    if (p.isAt(p.targetSink)) {
      p.state = PersonState.AT_SINK;
      p.timeEnteredSink = this.stats.simTimeSeconds;
    }
  }

  private updateAtSink(p: Person): void {
    if (p.timeEnteredSink === null) {
      p.state = PersonState.EXITING;
      return;
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
      this.stats.servedCount += 1;
      const totalTime = this.stats.simTimeSeconds - p.timeEnteredSystem;
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

      // Can't step into occupied stalls/sinks unless it's your target
      if (cellType === CellType.STALL || cellType === CellType.URINAL) {
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

  private getNextQueuePositionIndex(): number {
    const occupiedIndices = new Set<number>();
    this.people.forEach(p => {
      if (
        p.state !== PersonState.DONE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      ) {
        occupiedIndices.add(p.targetQueueIndex);
      }
    });

    for (let i = this.grid.queueCells.length - 1; i >= 0; i--) {
      if (!occupiedIndices.has(i)) {
        return i;
      }
    }

    return this.grid.queueCells.length - 1;
  }

  private maintainQueueOrder(): void {
    const occupiedByIndex = new Map<number, Person>();
    this.people.forEach(p => {
      if (
        p.state === PersonState.IN_QUEUE &&
        p.targetQueueIndex !== null &&
        p.targetQueueIndex >= 0
      ) {
        occupiedByIndex.set(p.targetQueueIndex, p);
      }
    });

    for (let i = 0; i < this.grid.queueCells.length; i++) {
      const occupant = occupiedByIndex.get(i);
      if (!occupant) {
        for (let j = i + 1; j < this.grid.queueCells.length; j++) {
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

