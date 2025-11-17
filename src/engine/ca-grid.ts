// CA Grid and Layout

import { CellType, type Cell, type Stall, type Sink } from './ca-types';

export class CAGrid {
  cols: number;
  rows: number;
  grid: CellType[][];
  stalls: Stall[];
  sinks: Sink[];
  queueCells: Cell[];
  entranceCell: Cell | null;
  exitCell: Cell | null;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.queueCells = [];
    this.entranceCell = null;
    this.exitCell = null;
  }

  private createEmptyGrid(): CellType[][] {
    const g: CellType[][] = [];
    for (let r = 0; r < this.rows; r++) {
      const row: CellType[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(CellType.EMPTY);
      }
      g.push(row);
    }
    return g;
  }

  setCell(row: number, col: number, type: CellType): void {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.grid[row][col] = type;
    }
  }

  getCell(row: number, col: number): CellType {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return this.grid[row][col];
    }
    return CellType.WALL;
  }

  addStall(col: number, row: number, type: 'stall' | 'urinal' = 'stall'): void {
    this.setCell(row, col, type === 'urinal' ? CellType.URINAL : CellType.STALL);
    this.stalls.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
      type,
    });
  }

  addSink(col: number, row: number): void {
    this.setCell(row, col, CellType.SINK);
    this.sinks.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
    });
  }

  addQueueCell(col: number, row: number): void {
    this.setCell(row, col, CellType.QUEUE);
    this.queueCells.push({ col, row });
  }

  setEntrance(col: number, row: number): void {
    this.setCell(row, col, CellType.ENTRANCE);
    this.entranceCell = { col, row };
  }

  setExit(col: number, row: number): void {
    this.setCell(row, col, CellType.EXIT);
    this.exitCell = { col, row };
  }

  /**
   * Build a simple unisex layout
   */
  buildSimpleLayout(): void {
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.queueCells = [];

    // Border walls
    for (let c = 0; c < this.cols; c++) {
      this.grid[0][c] = CellType.WALL;
      this.grid[this.rows - 1][c] = CellType.WALL;
    }
    for (let r = 0; r < this.rows; r++) {
      this.grid[r][0] = CellType.WALL;
      this.grid[r][this.cols - 1] = CellType.WALL;
    }

    // Place 4 stalls in a row (row 2, cols 8-11)
    const stallRow = 2;
    for (let c = 8; c <= 11; c++) {
      this.addStall(c, stallRow, 'stall');
    }

    // Place 2 sinks (row 4, cols 9-10)
    const sinkRow = 4;
    for (let c = 9; c <= 10; c++) {
      this.addSink(c, sinkRow);
    }

    // Queue corridor: row 6, columns 4–19
    const queueRow = 6;
    for (let c = 4; c <= 19; c++) {
      this.addQueueCell(c, queueRow);
    }

    // Entrance cell (bottom, center-ish)
    this.setEntrance(6, this.rows - 2);

    // Exit cell (bottom-right-ish)
    this.setExit(this.cols - 7, this.rows - 2);
  }

  /**
   * Build split layout (women on left, men on right)
   */
  buildSplitLayout(): void {
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.queueCells = [];

    // Border walls
    for (let c = 0; c < this.cols; c++) {
      this.grid[0][c] = CellType.WALL;
      this.grid[this.rows - 1][c] = CellType.WALL;
    }
    for (let r = 0; r < this.rows; r++) {
      this.grid[r][0] = CellType.WALL;
      this.grid[r][this.cols - 1] = CellType.WALL;
    }

    // Middle divider wall
    const midCol = Math.floor(this.cols / 2);
    for (let r = 1; r < this.rows - 1; r++) {
      this.grid[r][midCol] = CellType.WALL;
    }

    // Left side (Women): 3 stalls
    const leftStallRow = 2;
    for (let c = 4; c <= 6; c++) {
      this.addStall(c, leftStallRow, 'stall');
    }

    // Left side: 1 sink
    this.addSink(5, 4);

    // Left queue corridor: row 6, columns 2 to midCol-1
    const leftQueueRow = 6;
    for (let c = 2; c < midCol; c++) {
      this.addQueueCell(c, leftQueueRow);
    }

    // Right side (Men): 2 stalls + 2 urinals
    const rightStallRow = 2;
    for (let c = midCol + 2; c <= midCol + 3; c++) {
      this.addStall(c, rightStallRow, 'stall');
    }
    for (let c = midCol + 5; c <= midCol + 6; c++) {
      this.addStall(c, rightStallRow, 'urinal');
    }

    // Right side: 1 sink
    this.addSink(midCol + 4, 4);

    // Right queue corridor: row 6, columns midCol+1 to cols-2
    const rightQueueRow = 6;
    for (let c = midCol + 1; c < this.cols - 2; c++) {
      this.addQueueCell(c, rightQueueRow);
    }

    // Entrances (bottom, split)
    this.setEntrance(Math.floor(midCol / 2), this.rows - 2); // Women entrance
    // Men entrance handled separately in simulation logic

    // Exit (bottom center)
    this.setExit(midCol, this.rows - 2);
  }
}

