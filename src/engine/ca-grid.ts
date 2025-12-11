// CA Grid and Layout - Compact Architectural Design

import { 
  CellType, 
  type Cell, 
  type Stall, 
  type Sink, 
  type ChangingTable,
  type QueueCell, 
  type Gender,
  type LayoutPreset,
  type AreaConfig,
  DEFAULT_AREA_CONFIG,
  ARTICLE_LAYOUTS,
} from './ca-types';

export class CAGrid {
  cols: number;
  rows: number;
  grid: CellType[][];
  stalls: Stall[];
  sinks: Sink[];
  changingTables: ChangingTable[];
  queueCellsWomen: QueueCell[];
  queueCellsMen: QueueCell[];
  queueCellsShared: QueueCell[];
  entranceCell: Cell | null;
  exitCell: Cell | null;
  entranceWomen: Cell | null;
  entranceMen: Cell | null;
  
  // Area tracking
  areaConfig: AreaConfig;
  usedAreaWomen: number;
  usedAreaMen: number;
  usedAreaShared: number;
  
  // Bounding box (tight room dimensions)
  boundingBox: { minCol: number; maxCol: number; minRow: number; maxRow: number } | null;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.changingTables = [];
    this.queueCellsWomen = [];
    this.queueCellsMen = [];
    this.queueCellsShared = [];
    this.entranceCell = null;
    this.exitCell = null;
    this.entranceWomen = null;
    this.entranceMen = null;
    this.areaConfig = DEFAULT_AREA_CONFIG;
    this.usedAreaWomen = 0;
    this.usedAreaMen = 0;
    this.usedAreaShared = 0;
    this.boundingBox = null;
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

  addStall(
    col: number, 
    row: number, 
    gender: Gender | 'both', 
    type: 'stall' | 'urinal' = 'stall', 
    entranceRow?: number, 
    entranceCol?: number,
    isAccessible: boolean = false
  ): void {
    let cellType: CellType;
    let stallType: 'w_stall' | 'm_stall' | 'urinal' | 'shared_stall';
    
    if (type === 'urinal') {
      cellType = CellType.URINAL;
      stallType = 'urinal';
    } else if (gender === 'both') {
      cellType = CellType.SHARED_STALL;
      stallType = 'shared_stall';
    } else if (gender === 'F') {
      cellType = CellType.W_STALL;
      stallType = 'w_stall';
    } else {
      cellType = CellType.M_STALL;
      stallType = 'm_stall';
    }
    
    this.setCell(row, col, cellType);
    
    const entRow = entranceRow !== undefined ? entranceRow : row + 1;
    const entCol = entranceCol !== undefined ? entranceCol : col;
    
    const footprint = type === 'urinal' 
      ? this.areaConfig.urinalFootprint 
      : (isAccessible ? this.areaConfig.accessibleStallFootprint : this.areaConfig.stallFootprint);
    
    this.stalls.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
      type: stallType,
      genderAllowed: gender,
      lastChangeTime: 0,
      entranceRow: entRow,
      entranceCol: entCol,
      isAccessible,
      footprint,
    });
    
    if (gender === 'F') {
      this.usedAreaWomen += footprint;
    } else if (gender === 'M') {
      this.usedAreaMen += footprint;
    } else {
      this.usedAreaShared += footprint;
    }
  }

  addSink(
    col: number,
    row: number,
    entranceRow?: number,
    entranceCol?: number,
    genderAllowed: Gender | 'both' = 'both'
  ): void {
    this.setCell(row, col, CellType.SINK);
    
    const entRow = entranceRow !== undefined ? entranceRow : row + 1;
    const entCol = entranceCol !== undefined ? entranceCol : col;
    
    this.sinks.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
      lastChangeTime: 0,
      entranceRow: entRow,
      entranceCol: entCol,
      genderAllowed,
      footprint: this.areaConfig.sinkFootprint,
    });
  }
  
  addChangingTable(col: number, row: number, entranceRow?: number, entranceCol?: number): void {
    this.setCell(row, col, CellType.CHANGING_TABLE);
    
    const entRow = entranceRow !== undefined ? entranceRow : row + 1;
    const entCol = entranceCol !== undefined ? entranceCol : col;
    
    this.changingTables.push({
      col,
      row,
      occupiedUntil: 0,
      occupantId: null,
      lastChangeTime: 0,
      entranceRow: entRow,
      entranceCol: entCol,
      footprint: this.areaConfig.changingTableFootprint,
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

  reset(): void {
    this.grid = this.createEmptyGrid();
    this.stalls = [];
    this.sinks = [];
    this.changingTables = [];
    this.queueCellsWomen = [];
    this.queueCellsMen = [];
    this.queueCellsShared = [];
    this.entranceCell = null;
    this.exitCell = null;
    this.entranceWomen = null;
    this.entranceMen = null;
    this.usedAreaWomen = 0;
    this.usedAreaMen = 0;
    this.usedAreaShared = 0;
    this.boundingBox = null;
  }

  /**
   * Calculate tight bounding box around all fixtures + aisle padding
   */
  calculateBoundingBox(padding: number = 2): void {
    // BUG FIX: Include entrances and exits in bounding box calculation
    // Otherwise walls block the entrance and people can't enter!
    const allPositions: Array<{ col: number; row: number }> = [
      ...this.stalls.map(s => ({ col: s.col, row: s.row })),
      ...this.stalls.map(s => ({ col: s.entranceCol, row: s.entranceRow })), // Include stall entrances
      ...this.sinks.map(s => ({ col: s.col, row: s.row })),
      ...this.sinks.map(s => ({ col: s.entranceCol, row: s.entranceRow })), // Include sink entrances
      ...this.changingTables.map(t => ({ col: t.col, row: t.row })),
      ...this.changingTables.map(t => ({ col: t.entranceCol, row: t.entranceRow })), // Include table entrances
      ...this.queueCellsWomen,
      ...this.queueCellsMen,
      ...this.queueCellsShared,
    ];
    
    // Include entrance cells
    if (this.entranceCell) allPositions.push(this.entranceCell);
    if (this.entranceWomen) allPositions.push(this.entranceWomen);
    if (this.entranceMen) allPositions.push(this.entranceMen);
    if (this.exitCell) allPositions.push(this.exitCell);
    
    if (allPositions.length === 0) {
      this.boundingBox = { minCol: 0, maxCol: this.cols, minRow: 0, maxRow: this.rows };
      return;
    }
    
    const minCol = Math.max(0, Math.min(...allPositions.map(p => p.col)) - padding);
    const maxCol = Math.min(this.cols - 1, Math.max(...allPositions.map(p => p.col)) + padding);
    const minRow = Math.max(0, Math.min(...allPositions.map(p => p.row)) - padding);
    const maxRow = Math.min(this.rows - 1, Math.max(...allPositions.map(p => p.row)) + padding);
    
    this.boundingBox = { minCol, maxCol, minRow, maxRow };
    
    // Draw tight border walls (with doorways for entrances/exits)
    this.drawTightBorder();
  }
  
  private drawTightBorder(): void {
    if (!this.boundingBox) return;
    
    const { minCol, maxCol, minRow, maxRow } = this.boundingBox;
    
    // Collect entrance/exit positions to leave as doorways
    const doorways = new Set<string>();
    if (this.entranceCell) doorways.add(`${this.entranceCell.col},${this.entranceCell.row}`);
    if (this.entranceWomen) doorways.add(`${this.entranceWomen.col},${this.entranceWomen.row}`);
    if (this.entranceMen) doorways.add(`${this.entranceMen.col},${this.entranceMen.row}`);
    if (this.exitCell) doorways.add(`${this.exitCell.col},${this.exitCell.row}`);
    
    // Top wall
    for (let c = minCol; c <= maxCol; c++) {
      if (!doorways.has(`${c},${minRow}`)) {
        this.setCell(minRow, c, CellType.WALL);
      }
    }
    // Bottom wall
    for (let c = minCol; c <= maxCol; c++) {
      if (!doorways.has(`${c},${maxRow}`)) {
        this.setCell(maxRow, c, CellType.WALL);
      }
    }
    // Left wall
    for (let r = minRow; r <= maxRow; r++) {
      if (!doorways.has(`${minCol},${r}`)) {
        this.setCell(r, minCol, CellType.WALL);
      }
    }
    // Right wall
    for (let r = minRow; r <= maxRow; r++) {
      if (!doorways.has(`${maxCol},${r}`)) {
        this.setCell(r, maxCol, CellType.WALL);
      }
    }
  }

  getTotalUsedArea(): number {
    return this.usedAreaWomen + this.usedAreaMen + this.usedAreaShared;
  }
  
  getAreaPercentages(): { women: number; men: number; shared: number } {
    const total = this.getTotalUsedArea();
    if (total === 0) return { women: 0, men: 0, shared: 0 };
    return {
      women: (this.usedAreaWomen / total) * 100,
      men: (this.usedAreaMen / total) * 100,
      shared: (this.usedAreaShared / total) * 100,
    };
  }
  
  /**
   * Get circulation efficiency (fixture space vs total space)
   */
  getCirculationEfficiency(): number {
    if (!this.boundingBox) return 0;
    const { minCol, maxCol, minRow, maxRow } = this.boundingBox;
    const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);
    const fixtureCells = this.stalls.length + this.sinks.length + this.changingTables.length;
    return fixtureCells / totalCells;
  }

  // ========== ARCHITECTURAL LAYOUTS (COMPACT & REALISTIC) ==========

  /**
   * Layout 1: Basic (50-50) - GALLEY STYLE
   * Women's stalls on left wall, men's urinals on right wall
   * Compact with 2-tile aisle down center
   */
  buildLayout1_Basic5050(): void {
    this.reset();
    
    const aisleWidth = 2;  // 2-tile aisle (realistic)
    const startCol = 2;
    const womenSectionWidth = 7;   // Women's side width
    const menSectionWidth = 7;     // Men's side width
    
    // WOMEN'S SECTION (LEFT WALL)
    // 10 stalls in 2 rows against left wall
    let col = startCol;
    for (let i = 0; i < 5; i++) {
      this.addStall(col + i, 2, 'F', 'stall', 3, col + i);  // Row 1
      this.addStall(col + i, 5, 'F', 'stall', 6, col + i);  // Row 2
    }
    
    // Sinks along back wall (women's side)
    this.addSink(startCol + 1, 8, 9, startCol + 1, 'F');
    this.addSink(startCol + 3, 8, 9, startCol + 3, 'F');
    this.addSink(startCol + 5, 8, 9, startCol + 5, 'F');
    
    // Changing table in corner
    this.addChangingTable(startCol, 8, 9, startCol);
    
    // Women's queue - straight aisle (extended)
    for (let r = 9; r <= 15; r++) {
      this.addQueueCell(startCol + 2, r, 'F');
    }
    
    // Women's entrance
    this.setEntrance(startCol + 2, 16, 'F');
    
    // DIVIDER WALL
    const dividerCol = startCol + womenSectionWidth + aisleWidth;
    this.drawVerticalWall(dividerCol, 1, 12);
    
    // MEN'S SECTION (RIGHT WALL)
    const menStart = dividerCol + 1;
    
    // 2 stalls against back wall
    this.addStall(menStart, 2, 'M', 'stall', 3, menStart);
    this.addStall(menStart + 1, 2, 'M', 'stall', 3, menStart + 1);
    
    // 10 urinals in 2 rows (compact)
    for (let i = 0; i < 5; i++) {
      this.addStall(menStart + i, 5, 'M', 'urinal', 6, menStart + i);
      this.addStall(menStart + i, 7, 'M', 'urinal', 8, menStart + i);
    }
    
    // Men's sinks
    this.addSink(menStart + 1, 10, 11, menStart + 1, 'M');
    this.addSink(menStart + 3, 10, 11, menStart + 3, 'M');
    
    // Men's queue - compact (extended)
    for (let r = 11; r <= 15; r++) {
      this.addQueueCell(menStart + 2, r, 'M');
    }
    
    // Men's entrance
    this.setEntrance(menStart + 2, 16, 'M');
    
    // Shared exit at divider
    this.setExit(dividerCol, 16);
    
    // Calculate tight bounding box
    this.calculateBoundingBox(1);
  }

  /**
   * Layout 2: Equal Waiting Times (68:32 ratio)
   * More women's stalls to equalize wait times
   * 13 women stalls, 2 men stalls, 6 urinals
   */
  buildLayout2_EqualWaiting(): void {
    this.reset();
    
    const startCol = 2;
    
    // WOMEN'S SECTION (LARGER - 68%)
    // 13 stalls in 3 rows
    for (let i = 0; i < 5; i++) {
      this.addStall(startCol + i, 2, 'F', 'stall', 3, startCol + i);
    }
    for (let i = 0; i < 5; i++) {
      this.addStall(startCol + i, 4, 'F', 'stall', 5, startCol + i);
    }
    for (let i = 0; i < 3; i++) {
      this.addStall(startCol + i, 6, 'F', 'stall', 7, startCol + i);
    }
    
    // Women's sinks (4)
    for (let i = 0; i < 4; i++) {
      this.addSink(startCol + i, 8, 9, startCol + i, 'F');
    }
    
    // Changing table
    this.addChangingTable(startCol + 4, 8, 9, startCol + 4);
    
    // Women's queue
    for (let r = 9; r <= 15; r++) {
      this.addQueueCell(startCol + 2, r, 'F');
    }
    this.setEntrance(startCol + 2, 16, 'F');
    
    // DIVIDER WALL
    const dividerCol = startCol + 8;
    this.drawVerticalWall(dividerCol, 1, 12);
    
    // MEN'S SECTION (SMALLER - 32%)
    const menStart = dividerCol + 1;
    
    // 2 stalls
    this.addStall(menStart, 2, 'M', 'stall', 3, menStart);
    this.addStall(menStart + 1, 2, 'M', 'stall', 3, menStart + 1);
    
    // 6 urinals in 2 rows
    for (let i = 0; i < 3; i++) {
      this.addStall(menStart + i, 5, 'M', 'urinal', 6, menStart + i);
      this.addStall(menStart + i, 7, 'M', 'urinal', 8, menStart + i);
    }
    
    // Men's sinks (2)
    this.addSink(menStart, 10, 11, menStart, 'M');
    this.addSink(menStart + 2, 10, 11, menStart + 2, 'M');
    
    // Men's queue
    for (let r = 11; r <= 15; r++) {
      this.addQueueCell(menStart + 1, r, 'M');
    }
    this.setEntrance(menStart + 1, 16, 'M');
    
    this.setExit(dividerCol, 16);
    this.calculateBoundingBox(1);
  }

  /**
   * Layout 3: Minimal Waiting Times (55:45 ratio)
   * Optimized for throughput
   * 12 women stalls, 2 men stalls, 8 urinals
   */
  buildLayout3_MinimalWaiting(): void {
    this.reset();
    
    const startCol = 2;
    
    // WOMEN'S SECTION
    // 12 stalls in 2 rows of 6
    for (let i = 0; i < 6; i++) {
      this.addStall(startCol + i, 2, 'F', 'stall', 3, startCol + i);
      this.addStall(startCol + i, 5, 'F', 'stall', 6, startCol + i);
    }
    
    // Women's sinks (4)
    for (let i = 0; i < 4; i++) {
      this.addSink(startCol + i + 1, 8, 9, startCol + i + 1, 'F');
    }
    
    // Changing table
    this.addChangingTable(startCol, 8, 9, startCol);
    
    // Women's queue
    for (let r = 9; r <= 15; r++) {
      this.addQueueCell(startCol + 3, r, 'F');
    }
    this.setEntrance(startCol + 3, 16, 'F');
    
    // DIVIDER WALL
    const dividerCol = startCol + 9;
    this.drawVerticalWall(dividerCol, 1, 12);
    
    // MEN'S SECTION
    const menStart = dividerCol + 1;
    
    // 2 stalls
    this.addStall(menStart, 2, 'M', 'stall', 3, menStart);
    this.addStall(menStart + 1, 2, 'M', 'stall', 3, menStart + 1);
    
    // 8 urinals in 2 rows
    for (let i = 0; i < 4; i++) {
      this.addStall(menStart + i, 5, 'M', 'urinal', 6, menStart + i);
      this.addStall(menStart + i, 7, 'M', 'urinal', 8, menStart + i);
    }
    
    // Men's sinks (2)
    this.addSink(menStart, 10, 11, menStart, 'M');
    this.addSink(menStart + 2, 10, 11, menStart + 2, 'M');
    
    // Men's queue
    for (let r = 11; r <= 15; r++) {
      this.addQueueCell(menStart + 2, r, 'M');
    }
    this.setEntrance(menStart + 2, 16, 'M');
    
    this.setExit(dividerCol, 16);
    this.calculateBoundingBox(1);
  }

  /**
   * Layout 4: Mixed Basic
   * Shared toilets with urinals - all gender-neutral
   * 10 shared stalls, 10 shared urinals
   */
  buildLayout4_MixedBasic(): void {
    this.reset();
    
    const startCol = 2;
    
    // SHARED STALLS (10 in 2 rows)
    for (let i = 0; i < 5; i++) {
      this.addStall(startCol + i, 2, 'both', 'stall', 3, startCol + i);
      this.addStall(startCol + i, 5, 'both', 'stall', 6, startCol + i);
    }
    
    // SHARED URINALS (10 in 2 rows)
    for (let i = 0; i < 5; i++) {
      this.addStall(startCol + i + 7, 2, 'both', 'urinal', 3, startCol + i + 7);
      this.addStall(startCol + i + 7, 5, 'both', 'urinal', 6, startCol + i + 7);
    }
    
    // Shared sinks (4) in center
    for (let i = 0; i < 4; i++) {
      this.addSink(startCol + i + 3, 8, 9, startCol + i + 3, 'both');
    }
    
    // Changing table
    this.addChangingTable(startCol + 7, 8, 9, startCol + 7);
    
    // Single shared queue
    for (let r = 9; r <= 15; r++) {
      this.addQueueCell(startCol + 5, r, 'shared');
    }
    
    // Single entrance/exit
    this.setEntrance(startCol + 5, 16);
    this.setExit(startCol + 6, 16);
    
    this.calculateBoundingBox(1);
  }

  /**
   * Layout 5: Gender-Neutral
   * All shared toilet cabins (no urinals)
   * 20 shared stalls
   */
  buildLayout5_GenderNeutral(): void {
    this.reset();
    
    const startCol = 2;
    
    // 20 SHARED STALLS in 4 rows of 5
    for (let i = 0; i < 5; i++) {
      this.addStall(startCol + i, 2, 'both', 'stall', 3, startCol + i);
      this.addStall(startCol + i, 4, 'both', 'stall', 5, startCol + i);
      this.addStall(startCol + i + 6, 2, 'both', 'stall', 3, startCol + i + 6);
      this.addStall(startCol + i + 6, 4, 'both', 'stall', 5, startCol + i + 6);
    }
    
    // Shared sinks (4) in center
    for (let i = 0; i < 4; i++) {
      this.addSink(startCol + i + 3, 7, 8, startCol + i + 3, 'both');
    }
    
    // Changing table
    this.addChangingTable(startCol + 7, 7, 8, startCol + 7);
    
    // Single shared queue
    for (let r = 8; r <= 14; r++) {
      this.addQueueCell(startCol + 5, r, 'shared');
    }
    
    // Single entrance/exit
    this.setEntrance(startCol + 5, 15);
    this.setExit(startCol + 6, 15);
    
    this.calculateBoundingBox(1);
  }

  /**
   * Layout 6: Minimal Mixed
   * Shared cabins with urinals
   * 14 shared stalls, 8 shared urinals
   */
  buildLayout6_MixedMinimal(): void {
    this.reset();
    
    const startCol = 2;
    
    // 14 SHARED STALLS in 2 rows of 7
    for (let i = 0; i < 7; i++) {
      this.addStall(startCol + i, 2, 'both', 'stall', 3, startCol + i);
      this.addStall(startCol + i, 5, 'both', 'stall', 6, startCol + i);
    }
    
    // 8 SHARED URINALS in 2 rows of 4
    for (let i = 0; i < 4; i++) {
      this.addStall(startCol + i + 8, 2, 'both', 'urinal', 3, startCol + i + 8);
      this.addStall(startCol + i + 8, 5, 'both', 'urinal', 6, startCol + i + 8);
    }
    
    // Shared sinks (4)
    for (let i = 0; i < 4; i++) {
      this.addSink(startCol + i + 3, 8, 9, startCol + i + 3, 'both');
    }
    
    // Changing table
    this.addChangingTable(startCol + 7, 8, 9, startCol + 7);
    
    // Single shared queue
    for (let r = 9; r <= 15; r++) {
      this.addQueueCell(startCol + 5, r, 'shared');
    }
    
    // Single entrance/exit
    this.setEntrance(startCol + 5, 16);
    this.setExit(startCol + 6, 16);
    
    this.calculateBoundingBox(1);
  }

  /**
   * Simple unisex layout (compact)
   */
  buildSimpleLayout(): void {
    this.reset();
    
    const startCol = 4;
    
    // 4 stalls in a row (compact)
    for (let i = 0; i < 4; i++) {
      this.addStall(startCol + i, 2, 'both', 'stall', 3, startCol + i);
    }

    // 2 sinks
    this.addSink(startCol + 1, 5, 6, startCol + 1);
    this.addSink(startCol + 2, 5, 6, startCol + 2);

    // Queue
    for (let c = startCol; c <= startCol + 3; c++) {
      this.addQueueCell(c, 7, 'shared');
    }

    this.setEntrance(startCol + 2, 8);
    this.setExit(startCol + 3, 8);
    
    this.calculateBoundingBox(1);
  }

  buildFromPreset(preset: LayoutPreset): void {
    switch (preset.id) {
      case 'layout1': this.buildLayout1_Basic5050(); break;
      case 'layout2': this.buildLayout2_EqualWaiting(); break;
      case 'layout3': this.buildLayout3_MinimalWaiting(); break;
      case 'layout4': this.buildLayout4_MixedBasic(); break;
      case 'layout5': this.buildLayout5_GenderNeutral(); break;
      case 'layout6': this.buildLayout6_MixedMinimal(); break;
      default: this.buildSimpleLayout();
    }
  }
  
  getFixtureCounts(): {
    womenStalls: number;
    menStalls: number;
    sharedStalls: number;
    urinals: number;
    sinks: number;
    changingTables: number;
  } {
    return {
      womenStalls: this.stalls.filter(s => s.type === 'w_stall').length,
      menStalls: this.stalls.filter(s => s.type === 'm_stall').length,
      sharedStalls: this.stalls.filter(s => s.type === 'shared_stall').length,
      urinals: this.stalls.filter(s => s.type === 'urinal').length,
      sinks: this.sinks.length,
      changingTables: this.changingTables.length,
    };
  }
  
  /**
   * Get bounds for dynamic room sizing
   */
  get bounds() {
    return this.boundingBox || { minCol: 0, maxCol: this.cols - 1, minRow: 0, maxRow: this.rows - 1 };
  }
  
  /**
   * Get continuous wall segments for efficient 3D rendering
   */
  getWallSegments(): Array<{
    start: { col: number; row: number };
    end: { col: number; row: number };
    orientation: 'horizontal' | 'vertical';
  }> {
    const segments: Array<{
      start: { col: number; row: number };
      end: { col: number; row: number };
      orientation: 'horizontal' | 'vertical';
    }> = [];
    
    // Find horizontal wall segments
    for (let r = 0; r < this.rows; r++) {
      let startCol = -1;
      for (let c = 0; c <= this.cols; c++) {
        const isWall = c < this.cols && this.getCell(r, c) === CellType.WALL;
        
        if (isWall && startCol === -1) {
          startCol = c;
        } else if (!isWall && startCol !== -1) {
          segments.push({
            start: { col: startCol, row: r },
            end: { col: c - 1, row: r },
            orientation: 'horizontal'
          });
          startCol = -1;
        }
      }
    }
    
    // Find vertical wall segments
    for (let c = 0; c < this.cols; c++) {
      let startRow = -1;
      for (let r = 0; r <= this.rows; r++) {
        const isWall = r < this.rows && this.getCell(r, c) === CellType.WALL;
        
        if (isWall && startRow === -1) {
          startRow = r;
        } else if (!isWall && startRow !== -1) {
          segments.push({
            start: { col: c, row: startRow },
            end: { col: c, row: r - 1 },
            orientation: 'vertical'
          });
          startRow = -1;
        }
      }
    }
    
    return segments;
  }
}
