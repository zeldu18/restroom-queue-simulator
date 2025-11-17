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
          
          // Grid lines
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }

      // Draw people
      for (const p of simulation.people) {
        if (p.state === PersonState.DONE) continue;

        const x = p.col * cellSize + cellSize / 2;
        const y = p.row * cellSize + cellSize / 2;

        // Gender colors
        if (p.gender === 'F') {
          ctx.fillStyle = '#e91e63'; // pink
        } else {
          ctx.fillStyle = '#3f51b5'; // blue
        }

        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Draw state indicator (small dot)
        ctx.fillStyle = getStateColor(p.state);
        ctx.beginPath();
        ctx.arc(x, y - cellSize * 0.15, cellSize * 0.1, 0, Math.PI * 2);
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
        border: '1px solid #ccc',
        background: '#ffffff',
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
}

function getStateColor(state: PersonState): string {
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

