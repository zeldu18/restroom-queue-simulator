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

    // Create tile pattern once - dark modern aesthetic
    if (!tilePattern) {
      const tileSize = 16;
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = tileSize * 2;
      patternCanvas.height = tileSize * 2;
      const patternCtx = patternCanvas.getContext('2d');
      if (patternCtx) {
        // Create dark checkerboard tile pattern
        patternCtx.fillStyle = '#1a1a2e';
        patternCtx.fillRect(0, 0, tileSize * 2, tileSize * 2);
        patternCtx.fillStyle = '#16162a';
        patternCtx.fillRect(0, 0, tileSize, tileSize);
        patternCtx.fillRect(tileSize, tileSize, tileSize, tileSize);
        // Add subtle grout lines
        patternCtx.strokeStyle = '#2a2a4a';
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
          
          // Add glowing highlight to queue cells
          if (cellType === CellType.QUEUE_W || cellType === CellType.QUEUE_M || cellType === CellType.QUEUE_SHARED) {
            // Add subtle glow effect
            const glowColor = cellType === CellType.QUEUE_W 
              ? 'rgba(219, 39, 119, 0.15)' 
              : cellType === CellType.QUEUE_M 
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(16, 185, 129, 0.15)';
            ctx.fillStyle = glowColor;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            
            // Draw queue number with better visibility
            const queueCells = cellType === CellType.QUEUE_W 
              ? simulation.grid.queueCellsWomen 
              : cellType === CellType.QUEUE_M 
                ? simulation.grid.queueCellsMen 
                : simulation.grid.queueCellsShared;
            const idx = queueCells.findIndex(q => q.col === c && q.row === r);
            if (idx >= 0) {
              ctx.font = `bold ${Math.floor(cellSize * 0.35)}px system-ui`;
              ctx.fillStyle = 'rgba(255,255,255,0.25)';
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
          
          // Grid lines (subtle dark theme)
          ctx.strokeStyle = 'rgba(99,102,241,0.08)';
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
        border: '2px solid #3b3b5c',
        borderRadius: '12px',
        background: '#0e0e1a',
        display: 'block',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(99,102,241,0.1)',
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

  // Draw shadow for depth (darker for dark theme)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + cellSize * 0.4, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main circle with bobbing and glow effect
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(x, y + bobOffset, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Dark border for contrast
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
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
    
    // Draw glowing chevron/arrow pointing to fixture
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.55);
    ctx.lineTo(x + cellSize * 0.5, y + cellSize * 0.35);
    ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.55);
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
      // Draw stall with rounded corners and glow
      ctx.strokeStyle = cellType === CellType.W_STALL ? '#f472b6' : cellType === CellType.M_STALL ? '#60a5fa' : '#34d399';
      ctx.lineWidth = 2;
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, radius);
      ctx.stroke();
      
      // Draw door handle with metallic look
      ctx.fillStyle = '#a5a5c0';
      ctx.beginPath();
      ctx.arc(x + cellSize * 0.75, y + cellSize / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Gender icon with glow
      ctx.font = `bold ${Math.floor(cellSize * 0.45)}px system-ui`;
      ctx.fillStyle = cellType === CellType.W_STALL ? 'rgba(244,114,182,0.6)' : cellType === CellType.M_STALL ? 'rgba(96,165,250,0.6)' : 'rgba(52,211,153,0.6)';
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
      // Draw urinal with modern look
      ctx.fillStyle = '#2a2a4a';
      ctx.beginPath();
      ctx.ellipse(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize * 0.28,
        cellSize * 0.38,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner highlight
      ctx.fillStyle = 'rgba(96,165,250,0.2)';
      ctx.beginPath();
      ctx.ellipse(
        x + cellSize / 2,
        y + cellSize / 2 - 2,
        cellSize * 0.15,
        cellSize * 0.22,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      break;

    case CellType.SINK:
      // Draw sink with modern style
      ctx.fillStyle = '#2a2a4a';
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw faucet
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(x + cellSize / 2 - 4, y + cellSize * 0.12, 8, cellSize * 0.18, 2);
      ctx.fill();
      break;
      
    case CellType.CHANGING_TABLE:
      // Draw changing table with warm glow
      ctx.fillStyle = '#3d3720';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 4);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Baby icon
      ctx.font = `${Math.floor(cellSize * 0.4)}px Arial`;
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👶', x + cellSize / 2, y + cellSize / 2);
      break;

    case CellType.ENTRANCE:
      // Draw entrance with glow arrow
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y + cellSize * 0.25);
      ctx.lineTo(x + cellSize * 0.75, y + cellSize * 0.6);
      ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.6);
      ctx.closePath();
      ctx.fill();
      // Add glow
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      break;

    case CellType.EXIT:
      // Draw exit with warm glow arrow
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y + cellSize * 0.75);
      ctx.lineTo(x + cellSize * 0.75, y + cellSize * 0.4);
      ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.4);
      ctx.closePath();
      ctx.fill();
      // Add glow
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
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

  // Draw indicator light in top-right corner with glow
  ctx.globalAlpha = flashAlpha;
  ctx.shadowColor = isOccupied ? '#ef4444' : '#10b981';
  ctx.shadowBlur = 6;
  ctx.fillStyle = isOccupied ? '#ef4444' : '#10b981';
  ctx.beginPath();
  ctx.arc(x + cellSize - 6, y + 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Dark border for contrast
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 2);
    ctx.fill();

    // Progress with gradient effect
    ctx.fillStyle = progress < 0.8 ? '#f59e0b' : '#10b981';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 2);
    ctx.fill();
  }
}

function getStateColor(state: string): string {
  switch (state) {
    case PersonState.WALKING_TO_QUEUE:
      return '#fbbf24';
    case PersonState.IN_QUEUE:
      return '#f59e0b';
    case PersonState.WALKING_TO_STALL:
      return '#10b981';
    case PersonState.IN_STALL:
      return '#ef4444';
    case PersonState.WALKING_TO_CHANGING_TABLE:
      return '#fbbf24';
    case PersonState.AT_CHANGING_TABLE:
      return '#f59e0b';
    case PersonState.WALKING_TO_SINK:
      return '#06b6d4';
    case PersonState.AT_SINK:
      return '#a855f7';
    case PersonState.EXITING:
      return '#6b7280';
    default:
      return '#1e1e2e';
  }
}
