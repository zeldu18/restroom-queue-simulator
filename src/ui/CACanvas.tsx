// CA Canvas Renderer

import { useEffect, useRef } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { CELL_COLORS, CellType, PersonState } from '../engine/ca-types';

interface CACanvasProps {
  simulation: CASimulation;
  cellSize: number;
}

export default function CACanvas({ simulation, cellSize }: CACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      for (let r = 0; r < simulation.grid.rows; r++) {
        for (let c = 0; c < simulation.grid.cols; c++) {
          const cellType = simulation.grid.getCell(r, c);
          ctx.fillStyle = CELL_COLORS[cellType] || '#ffffff';
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          
          // Draw fixture details
          drawFixtureDetails(ctx, cellType, c, r, cellSize);
          
          // Grid lines (subtle)
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }

      // Draw people
      for (const p of simulation.people) {
        if (p.state === PersonState.DONE) continue;

        // Don't draw people inside stalls/sinks (they're using the fixture)
        if (p.state === PersonState.IN_STALL || p.state === PersonState.AT_SINK) {
          continue;
        }

        const x = p.col * cellSize + cellSize / 2;
        const y = p.row * cellSize + cellSize / 2;

        // Gender colors
        if (p.gender === 'F') {
          ctx.fillStyle = '#e91e63'; // pink
        } else {
          ctx.fillStyle = '#3f51b5'; // blue
        }

        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // White border for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw state indicator (small dot)
        ctx.fillStyle = getStateColor(p.state);
        ctx.beginPath();
        ctx.arc(x, y - cellSize * 0.2, cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
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
      style={{
        border: '2px solid #333',
        background: '#ffffff',
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
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
      // Draw stall door
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      
      // Draw door handle
      ctx.fillStyle = '#666';
      ctx.fillRect(x + cellSize * 0.7, y + cellSize / 2 - 2, 4, 4);
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
      
      // Draw faucet (small rectangle)
      ctx.fillStyle = '#888';
      ctx.fillRect(x + cellSize / 2 - 2, y + cellSize * 0.2, 4, cellSize * 0.15);
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

function getStateColor(state: string): string {
  switch (state) {
    case PersonState.WALKING_TO_QUEUE:
      return '#ffeb3b'; // yellow
    case PersonState.IN_QUEUE:
      return '#ff9800'; // orange
    case PersonState.WALKING_TO_STALL:
      return '#4caf50'; // green
    case PersonState.IN_STALL:
      return '#f44336'; // red
    case PersonState.WALKING_TO_SINK:
      return '#00bcd4'; // cyan
    case PersonState.AT_SINK:
      return '#9c27b0'; // purple
    case PersonState.EXITING:
      return '#607d8b'; // grey
    default:
      return '#000000';
  }
}
