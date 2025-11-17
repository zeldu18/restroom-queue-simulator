// CA Grid and Layout

import { CellType, type Cell, type Stall, type Sink, type QueueCell, type Gender } from './ca-types';

export class CAGrid {
  cols: number;
  rows: number;
  grid: CellType[][];
  stalls: Stall[];
  sinks: Sink[];
  queueCellsWomen: QueueCell[];
  queueCellsMen: QueueCell[];
  queueCellsShared: QueueCell[];
  entranceCell: Cell | null;
  exitCell: Cell | null;
  entranceWomen: Cell | null;
  entranceMen: Cell | null;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.queueCellsWomen = [];
    this.queueCellsMen = [];
    this.queueCellsShared = [];
    this.entranceCell = null;
    this.exitCell = null;
    this.entranceWomen = null;
    this.entranceMen = null;
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

  addStall(col: number, row: number, gender: Gender, type: 'stall' | 'urinal' = 'stall'): void {
    const cellType = type === 'urinal' ? CellType.URINAL : (gender === 'F' ? CellType.W_STALL : CellType.M_STALL);
    this.setCell(row, col, cellType);
    this.stalls.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
      type: type === 'urinal' ? 'urinal' : (gender === 'F' ? 'w_stall' : 'm_stall'),
      genderAllowed: type === 'urinal' ? 'M' : gender,
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

  addQueueCell(col: number, row: number, gender: Gender | 'shared'): void {
    const cellType = gender === 'F' ? CellType.QUEUE_W : gender === 'M' ? CellType.QUEUE_M : CellType.QUEUE_SHARED;
    this.setCell(row, col, cellType);
    const cell: QueueCell = { col, row, gender };
    
    if (gender === 'F') {
      this.queueCellsWomen.push(cell);
    } else if (gender === 'M') {
      this.queueCellsMen.push(cell);
    } else {
      this.queueCellsShared.push(cell);
    }
  }

  setEntrance(col: number, row: number, gender?: Gender): void {
    this.setCell(row, col, CellType.ENTRANCE);
    const cell = { col, row };
    
    if (gender === 'F') {
      this.entranceWomen = cell;
    } else if (gender === 'M') {
      this.entranceMen = cell;
    } else {
      this.entranceCell = cell;
    }
  }

  setExit(col: number, row: number): void {
    this.setCell(row, col, CellType.EXIT);
    this.exitCell = { col, row };
  }

  drawBorder(): void {
    for (let c = 0; c < this.cols; c++) {
      this.grid[0][c] = CellType.WALL;
      this.grid[this.rows - 1][c] = CellType.WALL;
    }
    for (let r = 0; r < this.rows; r++) {
      this.grid[r][0] = CellType.WALL;
      this.grid[r][this.cols - 1] = CellType.WALL;
    }
  }

  drawVerticalWall(col: number, startRow: number, endRow: number): void {
    for (let r = startRow; r <= endRow; r++) {
      if (r >= 0 && r < this.rows) {
        this.setCell(r, col, CellType.WALL);
      }
    }
  }

  drawHorizontalWall(row: number, startCol: number, endCol: number): void {
    for (let c = startCol; c <= endCol; c++) {
      if (c >= 0 && c < this.cols) {
        this.setCell(row, c, CellType.WALL);
      }
    }
  }

  /**
   * Reset grid
   */
  reset(): void {
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.queueCellsWomen = [];
    this.queueCellsMen = [];
    this.queueCellsShared = [];
    this.entranceCell = null;
    this.exitCell = null;
    this.entranceWomen = null;
    this.entranceMen = null;
  }

  /**
   * Build a simple unisex layout
   */
  buildSimpleLayout(): void {
    this.reset();
    this.drawBorder();

    // Place 4 stalls in a row (row 2, cols 16-19) - shared
    const stallRow = 2;
    for (let c = 16; c <= 19; c++) {
      this.addStall(c, stallRow, 'F', 'stall'); // Gender doesn't matter for shared
    }

    // Place 2 sinks (row 5, cols 17-18)
    const sinkRow = 5;
    for (let c = 17; c <= 18; c++) {
      this.addSink(c, sinkRow);
    }

    // Shared queue corridor: row 10, columns 8–27
    const queueRow = 10;
    for (let c = 8; c <= 27; c++) {
      this.addQueueCell(c, queueRow, 'shared');
    }

    // Entrance cell (bottom, center)
    this.setEntrance(18, this.rows - 2);

    // Exit cell (bottom-right)
    this.setExit(this.cols - 8, this.rows - 2);
  }

  /**
   * Layout 1: Basic (50-50) - From research paper
   * 3 women's stalls | 3 men's stalls
   * 0 urinals
   */
  buildLayout1_Basic5050(): void {
    this.reset();
    this.drawBorder();

    // Middle divider wall
    const midCol = Math.floor(this.cols / 2);
    this.drawVerticalWall(midCol, 1, this.rows - 2);

    // LEFT SIDE (Women): 3 stalls
    for (let c = 4; c <= 6; c++) {
      this.addStall(c, 3, 'F', 'stall');
    }
    // 1 sink
    this.addSink(5, 6);
    // Queue
    for (let c = 2; c < midCol; c++) {
      this.addQueueCell(c, 12, 'F');
    }
    this.setEntrance(6, this.rows - 2, 'F');

    // RIGHT SIDE (Men): 3 stalls
    for (let c = midCol + 4; c <= midCol + 6; c++) {
      this.addStall(c, 3, 'M', 'stall');
    }
    // 1 sink
    this.addSink(midCol + 5, 6);
    // Queue
    for (let c = midCol + 1; c < this.cols - 2; c++) {
      this.addQueueCell(c, 12, 'M');
    }
    this.setEntrance(midCol + 6, this.rows - 2, 'M');

    // Shared exit
    this.setExit(midCol, this.rows - 2);
  }

  /**
   * Layout 2: ± Equal Waiting - From research paper
   * 4 women's stalls | 2 men's stalls
   * 2 urinals
   */
  buildLayout2_EqualWaiting(): void {
    this.reset();
    this.drawBorder();

    const midCol = Math.floor(this.cols / 2);
    this.drawVerticalWall(midCol, 1, this.rows - 2);

    // LEFT SIDE (Women): 4 stalls
    for (let c = 3; c <= 6; c++) {
      this.addStall(c, 3, 'F', 'stall');
    }
    this.addSink(4, 6);
    this.addSink(5, 6);
    for (let c = 2; c < midCol; c++) {
      this.addQueueCell(c, 12, 'F');
    }
    this.setEntrance(5, this.rows - 2, 'F');

    // RIGHT SIDE (Men): 2 stalls + 2 urinals
    this.addStall(midCol + 3, 3, 'M', 'stall');
    this.addStall(midCol + 4, 3, 'M', 'stall');
    this.addStall(midCol + 6, 3, 'M', 'urinal');
    this.addStall(midCol + 7, 3, 'M', 'urinal');
    this.addSink(midCol + 5, 6);
    for (let c = midCol + 1; c < this.cols - 2; c++) {
      this.addQueueCell(c, 12, 'M');
    }
    this.setEntrance(midCol + 5, this.rows - 2, 'M');

    this.setExit(midCol, this.rows - 2);
  }

  /**
   * Layout 3: Minimal Waiting - From research paper
   * 5 women's stalls | 2 men's stalls
   * 3 urinals
   */
  buildLayout3_MinimalWaiting(): void {
    this.reset();
    this.drawBorder();

    const midCol = Math.floor(this.cols / 2);
    this.drawVerticalWall(midCol, 1, this.rows - 2);

    // LEFT SIDE (Women): 5 stalls
    for (let c = 3; c <= 7; c++) {
      this.addStall(c, 3, 'F', 'stall');
    }
    this.addSink(4, 6);
    this.addSink(6, 6);
    for (let c = 2; c < midCol; c++) {
      this.addQueueCell(c, 12, 'F');
    }
    this.setEntrance(5, this.rows - 2, 'F');

    // RIGHT SIDE (Men): 2 stalls + 3 urinals
    this.addStall(midCol + 3, 3, 'M', 'stall');
    this.addStall(midCol + 4, 3, 'M', 'stall');
    this.addStall(midCol + 6, 3, 'M', 'urinal');
    this.addStall(midCol + 7, 3, 'M', 'urinal');
    this.addStall(midCol + 8, 3, 'M', 'urinal');
    this.addSink(midCol + 5, 6);
    for (let c = midCol + 1; c < this.cols - 2; c++) {
      this.addQueueCell(c, 12, 'M');
    }
    this.setEntrance(midCol + 6, this.rows - 2, 'M');

    this.setExit(midCol, this.rows - 2);
  }

  /**
   * Layout 4: Mixed Basic - From research paper
   * 6 shared stalls
   */
  buildLayout4_MixedBasic(): void {
    this.reset();
    this.drawBorder();

    // All stalls in center (gender-neutral)
    for (let c = 15; c <= 20; c++) {
      this.addStall(c, 3, 'F', 'stall'); // Gender doesn't restrict in mixed
      this.stalls[this.stalls.length - 1].genderAllowed = 'both';
    }

    // Sinks
    this.addSink(16, 6);
    this.addSink(19, 6);

    // Shared queue
    for (let c = 8; c <= 27; c++) {
      this.addQueueCell(c, 12, 'shared');
    }

    this.setEntrance(18, this.rows - 2);
    this.setExit(this.cols - 8, this.rows - 2);
  }

  /**
   * Layout 5: Gender-Neutral - From research paper
   * 7 shared stalls
   */
  buildLayout5_GenderNeutral(): void {
    this.reset();
    this.drawBorder();

    // 7 stalls in center
    for (let c = 14; c <= 20; c++) {
      this.addStall(c, 3, 'F', 'stall');
      this.stalls[this.stalls.length - 1].genderAllowed = 'both';
    }

    // Sinks
    this.addSink(16, 6);
    this.addSink(18, 6);

    // Shared queue
    for (let c = 8; c <= 27; c++) {
      this.addQueueCell(c, 12, 'shared');
    }

    this.setEntrance(17, this.rows - 2);
    this.setExit(this.cols - 8, this.rows - 2);
  }

  /**
   * Layout 6: Mixed Minimal - From research paper
   * 7 shared stalls + 3 urinals
   */
  buildLayout6_MixedMinimal(): void {
    this.reset();
    this.drawBorder();

    // 7 stalls
    for (let c = 12; c <= 18; c++) {
      this.addStall(c, 3, 'F', 'stall');
      this.stalls[this.stalls.length - 1].genderAllowed = 'both';
    }

    // 3 urinals
    this.addStall(21, 3, 'M', 'urinal');
    this.addStall(22, 3, 'M', 'urinal');
    this.addStall(23, 3, 'M', 'urinal');
    this.stalls[this.stalls.length - 1].genderAllowed = 'both'; // Anyone can use urinals
    this.stalls[this.stalls.length - 2].genderAllowed = 'both';
    this.stalls[this.stalls.length - 3].genderAllowed = 'both';

    // Sinks
    this.addSink(15, 6);
    this.addSink(17, 6);
    this.addSink(21, 6);

    // Shared queue
    for (let c = 8; c <= 27; c++) {
      this.addQueueCell(c, 12, 'shared');
    }

    this.setEntrance(17, this.rows - 2);
    this.setExit(this.cols - 8, this.rows - 2);
  }
}
