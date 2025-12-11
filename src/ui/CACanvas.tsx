// CA Canvas Renderer - Updated with Character Types and Bathroom Aesthetics

import { useEffect, useRef } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { CELL_COLORS, CellType, PersonState, CharacterType } from '../engine/ca-types';
import type { Person } from '../engine/ca-person';

interface CACanvasProps {
  simulation: CASimulation;
  cellSize: number;
  onCellClick?: (row: number, col: number) => void;
  customMode?: boolean;
}

// Tile pattern for bathroom floor
let tilePattern: CanvasPattern | null = null;

export default function CACanvas({ simulation, cellSize, onCellClick, customMode }: CACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick || !customMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < simulation.grid.rows && col >= 0 && col < simulation.grid.cols) {
      onCellClick(row, col);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create tile pattern once
    if (!tilePattern) {
      const tileSize = 16;
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = tileSize * 2;
      patternCanvas.height = tileSize * 2;
      const patternCtx = patternCanvas.getContext('2d');
      if (patternCtx) {
        // Create checkerboard tile pattern
        patternCtx.fillStyle = '#e8e4e0';
        patternCtx.fillRect(0, 0, tileSize * 2, tileSize * 2);
        patternCtx.fillStyle = '#d8d4d0';
        patternCtx.fillRect(0, 0, tileSize, tileSize);
        patternCtx.fillRect(tileSize, tileSize, tileSize, tileSize);
        // Add grout lines
        patternCtx.strokeStyle = '#c0b8b0';
        patternCtx.lineWidth = 1;
        patternCtx.strokeRect(0, 0, tileSize, tileSize);
        patternCtx.strokeRect(tileSize, 0, tileSize, tileSize);
        patternCtx.strokeRect(0, tileSize, tileSize, tileSize);
        patternCtx.strokeRect(tileSize, tileSize, tileSize, tileSize);
        
        tilePattern = ctx.createPattern(patternCanvas, 'repeat');
      }
    }

    const draw = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tile floor background
      if (tilePattern) {
        ctx.fillStyle = tilePattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw grid
      for (let r = 0; r < simulation.grid.rows; r++) {
        for (let c = 0; c < simulation.grid.cols; c++) {
          const cellType = simulation.grid.getCell(r, c);
          
          // Only draw non-empty cells (floor tiles show through)
          if (cellType !== CellType.EMPTY) {
          ctx.fillStyle = CELL_COLORS[cellType] || '#ffffff';
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
          
          // Add subtle highlight to queue cells
          if (cellType === CellType.QUEUE_W || cellType === CellType.QUEUE_M || cellType === CellType.QUEUE_SHARED) {
            ctx.fillStyle = 'rgba(100, 100, 255, 0.08)';
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            
            // Draw queue number
            const queueCells = cellType === CellType.QUEUE_W 
              ? simulation.grid.queueCellsWomen 
              : cellType === CellType.QUEUE_M 
                ? simulation.grid.queueCellsMen 
                : simulation.grid.queueCellsShared;
            const idx = queueCells.findIndex(q => q.col === c && q.row === r);
            if (idx >= 0) {
              ctx.font = `${Math.floor(cellSize * 0.3)}px Arial`;
              ctx.fillStyle = 'rgba(0,0,0,0.2)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`${idx + 1}`, c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
            }
          }
          
          // Draw fixture details
          drawFixtureDetails(ctx, cellType, c, r, cellSize);
          
          // Draw entrance cell markers
          drawEntranceMarkers(ctx, simulation, c, r, cellSize);
          
          // Draw occupancy indicators
          drawOccupancyIndicator(ctx, simulation, c, r, cellSize);
          
          // Grid lines (subtle)
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }

      // Draw people with character type distinctions
      const time = simulation.stats.simTimeSeconds;
      for (const p of simulation.people) {
        if (p.state === PersonState.DONE) continue;

        // Don't draw people inside fixtures
        if (p.state === PersonState.IN_STALL || 
            p.state === PersonState.AT_SINK ||
            p.state === PersonState.AT_CHANGING_TABLE) {
          continue;
        }

        drawPerson(ctx, p, cellSize, time);
      }
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [simulation, cellSize]);

  const width = simulation.grid.cols * cellSize;
  const height = simulation.grid.rows * cellSize;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      style={{
        border: '3px solid #4a4a4a',
        borderRadius: '8px',
        background: '#ffffff',
        display: 'block',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        cursor: customMode ? 'crosshair' : 'default',
      }}
    />
  );
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  p: Person,
  cellSize: number,
  time: number
): void {
  const x = p.col * cellSize + cellSize / 2;
  const y = p.row * cellSize + cellSize / 2;

  // Add bobbing animation (subtle vertical oscillation)
  const bobOffset = Math.sin(time * 3 + p.id) * cellSize * 0.05;

  // Get color based on character type
  const baseColor = p.getColor();
  
  // Different sizes based on character type
  let radius = cellSize * 0.35;
  if (p.characterType === CharacterType.WHEELCHAIR) {
    radius = cellSize * 0.4;
  } else if (p.characterType === CharacterType.PARENT_WITH_CHILD) {
    radius = cellSize * 0.38;
  }

  // Draw shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + cellSize * 0.4, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main circle with bobbing
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(x, y + bobOffset, radius, 0, Math.PI * 2);
  ctx.fill();

  // White border for visibility
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Character type indicators
  drawCharacterIndicator(ctx, p, x, y + bobOffset, cellSize);

  // Draw state indicator (small dot)
  ctx.fillStyle = getStateColor(p.state);
  ctx.beginPath();
  ctx.arc(x, y + bobOffset - cellSize * 0.2, cellSize * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Footstep animation (when moving)
  if (p.state === PersonState.WALKING_TO_QUEUE || 
      p.state === PersonState.WALKING_TO_STALL || 
      p.state === PersonState.WALKING_TO_SINK || 
      p.state === PersonState.WALKING_TO_CHANGING_TABLE ||
      p.state === PersonState.EXITING) {
    const footstepPhase = Math.floor(time * 4 + p.id) % 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    const footOffset = footstepPhase === 0 ? -cellSize * 0.15 : cellSize * 0.15;
    ctx.beginPath();
    ctx.ellipse(x + footOffset, y + cellSize * 0.42, cellSize * 0.08, cellSize * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCharacterIndicator(
  ctx: CanvasRenderingContext2D,
  p: Person,
  x: number,
  y: number,
  cellSize: number
): void {
  const indicatorSize = cellSize * 0.15;
  
  switch (p.characterType) {
    case CharacterType.PREGNANT:
      // Small heart indicator
      ctx.fillStyle = '#ff69b4';
      ctx.font = `${indicatorSize * 2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', x, y + cellSize * 0.05);
      break;
      
    case CharacterType.PARENT_WITH_CHILD:
      // Small child circle attached
      ctx.fillStyle = p.gender === 'F' ? '#f8bbd9' : '#90caf9';
      ctx.beginPath();
      ctx.arc(x + cellSize * 0.2, y + cellSize * 0.15, cellSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
      
    case CharacterType.ELDERLY:
      // Cane/walking indicator
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cellSize * 0.2, y - cellSize * 0.1);
      ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.25);
      ctx.stroke();
      break;
      
    case CharacterType.WHEELCHAIR:
      // Wheelchair wheel indicator
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + cellSize * 0.15, cellSize * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      ctx.beginPath();
      ctx.moveTo(x - cellSize * 0.15, y + cellSize * 0.15);
      ctx.lineTo(x + cellSize * 0.15, y + cellSize * 0.15);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + cellSize * 0.3);
      ctx.stroke();
      break;
  }
}

function drawEntranceMarkers(
  ctx: CanvasRenderingContext2D,
  simulation: CASimulation,
  col: number,
  row: number,
  cellSize: number
): void {
  const isStallEntrance = simulation.grid.stalls.some(
    (s) => s.entranceCol === col && s.entranceRow === row
  );
  const isSinkEntrance = simulation.grid.sinks.some(
    (s) => s.entranceCol === col && s.entranceRow === row
  );
  const isTableEntrance = simulation.grid.changingTables.some(
    (t) => t.entranceCol === col && t.entranceRow === row
  );

  if (isStallEntrance || isSinkEntrance || isTableEntrance) {
    const x = col * cellSize;
    const y = row * cellSize;
    
    // Draw very subtle chevron/arrow pointing to fixture
    ctx.strokeStyle = 'rgba(0, 150, 0, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + cellSize * 0.35, y + cellSize * 0.55);
    ctx.lineTo(x + cellSize * 0.5, y + cellSize * 0.4);
    ctx.lineTo(x + cellSize * 0.65, y + cellSize * 0.55);
    ctx.stroke();
  }
}

function drawFixtureDetails(
  ctx: CanvasRenderingContext2D,
  cellType: number,
  col: number,
  row: number,
  cellSize: number
): void {
  const x = col * cellSize;
  const y = row * cellSize;

  switch (cellType) {
    case CellType.W_STALL:
    case CellType.M_STALL:
    case CellType.SHARED_STALL:
      // Draw stall door
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      
      // Draw door handle
      ctx.fillStyle = '#888';
      ctx.fillRect(x + cellSize * 0.7, y + cellSize / 2 - 2, 4, 4);
      
      // Gender icon
      ctx.font = `${Math.floor(cellSize * 0.4)}px Arial`;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (cellType === CellType.W_STALL) {
        ctx.fillText('♀', x + cellSize / 2, y + cellSize / 2);
      } else if (cellType === CellType.M_STALL) {
        ctx.fillText('♂', x + cellSize / 2, y + cellSize / 2);
      } else {
        ctx.fillText('⚥', x + cellSize / 2, y + cellSize / 2);
      }
      break;

    case CellType.URINAL:
      // Draw urinal shape (vertical oval)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize * 0.25,
        cellSize * 0.35,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case CellType.SINK:
      // Draw sink (circle basin)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw faucet
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(x + cellSize / 2 - 3, y + cellSize * 0.15, 6, cellSize * 0.15);
      break;
      
    case CellType.CHANGING_TABLE:
      // Draw changing table
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      ctx.strokeStyle = '#fbc02d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      // Baby icon
      ctx.font = `${Math.floor(cellSize * 0.4)}px Arial`;
      ctx.fillStyle = '#ff9800';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👶', x + cellSize / 2, y + cellSize / 2);
      break;

    case CellType.ENTRANCE:
      // Draw arrow pointing in
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y + cellSize * 0.3);
      ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.6);
      ctx.lineTo(x + cellSize * 0.3, y + cellSize * 0.6);
      ctx.closePath();
      ctx.fill();
      break;

    case CellType.EXIT:
      // Draw arrow pointing out
      ctx.fillStyle = '#d84315';
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y + cellSize * 0.7);
      ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.4);
      ctx.lineTo(x + cellSize * 0.3, y + cellSize * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function drawOccupancyIndicator(
  ctx: CanvasRenderingContext2D,
  simulation: CASimulation,
  col: number,
  row: number,
  cellSize: number
): void {
  // Check if this cell is a stall/urinal/sink and if it's occupied
  const stall = simulation.grid.stalls.find((s) => s.col === col && s.row === row);
  const sink = simulation.grid.sinks.find((s) => s.col === col && s.row === row);
  const table = simulation.grid.changingTables.find((t) => t.col === col && t.row === row);
  
  const fixture = stall || sink || table;
  if (!fixture) return;

  // Check if someone is ACTUALLY INSIDE
  const person = simulation.people.find((p) => 
    p.id === fixture.occupantId && 
    (p.state === PersonState.IN_STALL || 
     p.state === PersonState.AT_SINK ||
     p.state === PersonState.AT_CHANGING_TABLE)
  );
  const isOccupied = person !== undefined;

  const x = col * cellSize;
  const y = row * cellSize;

  // Check if fixture recently changed (for flash animation)
  const timeSinceChange = simulation.stats.simTimeSeconds - fixture.lastChangeTime;
  const isFlashing = timeSinceChange < 0.5;

  // Flash effect
  let flashAlpha = 1.0;
  if (isFlashing) {
    const flashCycle = Math.sin(timeSinceChange * Math.PI * 8);
    flashAlpha = 0.5 + flashCycle * 0.5;
  }

  // Draw indicator light in top-right corner
  ctx.globalAlpha = flashAlpha;
  ctx.fillStyle = isOccupied ? '#ff3333' : '#33ff33';
  ctx.beginPath();
  ctx.arc(x + cellSize - 6, y + 6, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Add "OCCUPIED" or "VACANT" text
  ctx.font = `bold ${Math.floor(cellSize * 0.22)}px Arial`;
  ctx.fillStyle = isOccupied ? '#cc0000' : '#00aa00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const text = isOccupied ? 'OCC' : 'VAC';
  ctx.fillText(text, x + cellSize / 2, y + 2);

  // Draw progress bar if occupied
  if (isOccupied && person) {
    let elapsed = 0;
    let total = 1;
    
    if (person.state === PersonState.IN_STALL && person.timeEnteredStall) {
      elapsed = simulation.stats.simTimeSeconds - person.timeEnteredStall;
      total = person.dwellTime;
    } else if (person.state === PersonState.AT_SINK && person.timeEnteredSink) {
      elapsed = simulation.stats.simTimeSeconds - person.timeEnteredSink;
      total = person.sinkTime;
    } else if (person.state === PersonState.AT_CHANGING_TABLE && person.timeEnteredChangingTable) {
      elapsed = simulation.stats.simTimeSeconds - person.timeEnteredChangingTable;
      total = person.changingTableTime;
    }
    
    const progress = Math.min(elapsed / total, 1);

    // Draw progress bar at bottom of cell
    const barWidth = cellSize - 4;
    const barHeight = 3;
    const barX = x + 2;
    const barY = y + cellSize - barHeight - 2;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress
    ctx.fillStyle = progress < 0.8 ? '#fbbf24' : '#10b981';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
  }
}

function getStateColor(state: string): string {
  switch (state) {
    case PersonState.WALKING_TO_QUEUE:
      return '#ffeb3b';
    case PersonState.IN_QUEUE:
      return '#ff9800';
    case PersonState.WALKING_TO_STALL:
      return '#4caf50';
    case PersonState.IN_STALL:
      return '#f44336';
    case PersonState.WALKING_TO_CHANGING_TABLE:
      return '#ffeb3b';
    case PersonState.AT_CHANGING_TABLE:
      return '#ff9800';
    case PersonState.WALKING_TO_SINK:
      return '#00bcd4';
    case PersonState.AT_SINK:
      return '#9c27b0';
    case PersonState.EXITING:
      return '#607d8b';
    default:
      return '#000000';
  }
}
