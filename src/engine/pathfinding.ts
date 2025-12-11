// BFS Pathfinding for CA simulation

import { type Cell } from './ca-types';

interface PathNode {
  col: number;
  row: number;
  parent: PathNode | null;
  dist: number;
}

/**
 * Find shortest path from start to goal using BFS
 * Returns the NEXT cell to move to, or null if no path
 */
export function findNextStep(
  startCol: number,
  startRow: number,
  goalCol: number,
  goalRow: number,
  isWalkable: (col: number, row: number) => boolean,
  cols: number,
  rows: number
): Cell | null {
  // Already at goal
  if (startCol === goalCol && startRow === goalRow) {
    return null;
  }

  const queue: PathNode[] = [];
  const visited = new Set<string>();
  
  const startNode: PathNode = {
    col: startCol,
    row: startRow,
    parent: null,
    dist: 0
  };
  
  queue.push(startNode);
  visited.add(`${startCol},${startRow}`);

  const directions = [
    { dc: 0, dr: -1 }, // up
    { dc: 1, dr: 0 },  // right
    { dc: 0, dr: 1 },  // down
    { dc: -1, dr: 0 }  // left
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if we reached the goal
    if (current.col === goalCol && current.row === goalRow) {
      // Backtrack to find the FIRST step from start
      let node = current;
      while (node.parent && node.parent.parent) {
        node = node.parent;
      }
      // node is now the first step from start
      return { col: node.col, row: node.row };
    }

    // Explore neighbors
    for (const { dc, dr } of directions) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      const key = `${nc},${nr}`;

      // Skip if out of bounds
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      // Skip if already visited
      if (visited.has(key)) continue;

      // Skip if not walkable
      if (!isWalkable(nc, nr)) continue;

      visited.add(key);
      queue.push({
        col: nc,
        row: nr,
        parent: current,
        dist: current.dist + 1
      });
    }
  }

  // No path found - return null (person is stuck)
  return null;
}

/**
 * Manhattan distance heuristic
 */
export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
