// CA Person Agent

import { PersonState, type Gender, type Cell, type Stall, type Sink } from './ca-types';

export class Person {
  id: number;
  col: number;
  row: number;
  gender: Gender;
  state: PersonState;
  targetQueueIndex: number | null;
  targetStall: Stall | null;
  targetSink: Sink | null;
  dwellTime: number;
  sinkTime: number;
  timeEnteredSystem: number;
  timeEnteredStall: number | null;
  timeEnteredSink: number | null;

  constructor(
    id: number,
    col: number,
    row: number,
    gender: Gender,
    dwellTime: number,
    sinkTime: number,
    timeEnteredSystem: number
  ) {
    this.id = id;
    this.col = col;
    this.row = row;
    this.gender = gender;
    this.state = PersonState.WALKING_TO_QUEUE;
    this.targetQueueIndex = null;
    this.targetStall = null;
    this.targetSink = null;
    this.dwellTime = dwellTime;
    this.sinkTime = sinkTime;
    this.timeEnteredSystem = timeEnteredSystem;
    this.timeEnteredStall = null;
    this.timeEnteredSink = null;
  }

  isAt(cell: Cell): boolean {
    return this.col === cell.col && this.row === cell.row;
  }

  moveTo(col: number, row: number): void {
    this.col = col;
    this.row = row;
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

