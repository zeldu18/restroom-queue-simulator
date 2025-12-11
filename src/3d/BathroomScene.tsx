// 3D Bathroom Scene - Main Scene Component with Dynamic Sizing

import React, { useMemo, Suspense } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { CellType, PersonState } from '../engine/ca-types';
import { CheckeredFloor } from './Floor';
import { ToiletStall, Urinal, Sink, ChangingTable, Wall, EntranceMarker } from './Fixtures';
import { MixamoAgent } from './MixamoAgent';

// Simple fallback while Mixamo models load
function AgentFallback({ position, gender }: { position: [number, number, number]; gender: 'F' | 'M' }) {
  return (
    <mesh position={[position[0] + 0.5, 0.9, position[2] + 0.5]}>
      <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
      <meshStandardMaterial color={gender === 'F' ? '#e91e63' : '#2196f3'} />
    </mesh>
  );
}

interface BathroomSceneProps {
  simulation: CASimulation;
  cellSize?: number;
}

export function BathroomScene({ simulation, cellSize = 1 }: BathroomSceneProps) {
  const grid = simulation.grid;
  
  // Calculate dynamic bounds with padding
  const padding = 1;
  const bounds = grid.bounds;
  const minCol = Math.max(0, bounds.minCol - padding);
  const maxCol = Math.min(grid.cols - 1, bounds.maxCol + padding);
  const minRow = Math.max(0, bounds.minRow - padding);
  const maxRow = Math.min(grid.rows - 1, bounds.maxRow + padding);
  
  const widthCells = maxCol - minCol + 1;
  const depthCells = maxRow - minRow + 1;
  
  // Center of the room (for offsetting everything to world center)
  const centerX = (minCol + widthCells / 2) * cellSize;
  const centerZ = (minRow + depthCells / 2) * cellSize;

  // Convert 2D grid coords to 3D world coords
  const toWorld = (col: number, row: number): [number, number, number] => {
    return [col * cellSize, 0, row * cellSize];
  };

  // Build STATIC scene elements (walls, entrances, queue markers) - memoized
  const staticElements = useMemo(() => {
    const internalWalls: React.ReactElement[] = [];
    const entrances: React.ReactElement[] = [];
    const queueMarkers: React.ReactElement[] = [];

    // Get continuous wall segments (efficient rendering)
    const wallSegments = grid.getWallSegments();
    wallSegments.forEach((segment, idx) => {
      // Filter out perimeter walls (we render those separately)
      const isPerimeterSegment = 
        (segment.start.col === minCol && segment.end.col === minCol) ||
        (segment.start.col === maxCol && segment.end.col === maxCol) ||
        (segment.start.row === minRow && segment.end.row === minRow) ||
        (segment.start.row === maxRow && segment.end.row === maxRow);
      
      if (isPerimeterSegment) return;
      
      if (segment.orientation === 'horizontal') {
        const length = (segment.end.col - segment.start.col + 1) * cellSize;
        const centerCol = (segment.start.col + segment.end.col) / 2;
        const pos = toWorld(centerCol, segment.start.row);
        internalWalls.push(
          <Wall 
            key={`wall-h-${idx}`}
            position={[pos[0] + 0.5, 1.5, pos[2] + 0.5]}
            width={length}
            height={3}
          />
        );
      } else {
        const length = (segment.end.row - segment.start.row + 1) * cellSize;
        const centerRow = (segment.start.row + segment.end.row) / 2;
        const pos = toWorld(segment.start.col, centerRow);
        internalWalls.push(
          <Wall 
            key={`wall-v-${idx}`}
            position={[pos[0] + 0.5, 1.5, pos[2] + 0.5]}
            width={length}
            height={3}
            rotation={[0, Math.PI / 2, 0]}
          />
        );
      }
    });

    // Process grid cells for entrances and queue markers
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellType = grid.getCell(row, col);
        const pos = toWorld(col, row);

        if (cellType === CellType.ENTRANCE) {
          entrances.push(
            <EntranceMarker
              key={`entrance-${col}-${row}`}
              position={pos}
              type="entrance"
            />
          );
        }

        if (cellType === CellType.EXIT) {
          entrances.push(
            <EntranceMarker
              key={`exit-${col}-${row}`}
              position={pos}
              type="exit"
            />
          );
        }

        // Queue cell markers (subtle floor indication)
        if (cellType === CellType.QUEUE_W || cellType === CellType.QUEUE_M || cellType === CellType.QUEUE_SHARED) {
          const queueColor = cellType === CellType.QUEUE_W ? '#fce4ec' 
            : cellType === CellType.QUEUE_M ? '#e3f2fd' 
            : '#e0f2f1';
          queueMarkers.push(
            <mesh 
              key={`queue-${col}-${row}`}
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[pos[0] + 0.5, 0.005, pos[2] + 0.5]}
            >
              <planeGeometry args={[cellSize * 0.9, cellSize * 0.9]} />
              <meshStandardMaterial color={queueColor} transparent opacity={0.5} />
            </mesh>
          );
        }
      }
    }

    return { internalWalls, entrances, queueMarkers };
  }, [grid, cellSize, minCol, maxCol, minRow, maxRow]);

  // Build DYNAMIC fixture elements - NOT memoized so occupancy updates in real-time
  const buildFixtureElements = () => {
    const stalls: React.ReactElement[] = [];
    const urinals: React.ReactElement[] = [];
    const sinks: React.ReactElement[] = [];
    const changingTables: React.ReactElement[] = [];

    // Process fixtures with current occupancy status
    grid.stalls.forEach((stall, idx) => {
      const pos = toWorld(stall.col, stall.row);
      // Show as occupied if someone has claimed this stall (regardless of state)
      const isOccupied = stall.occupantId !== null;

      if (stall.type === 'urinal') {
        urinals.push(
          <Urinal
            key={`urinal-${idx}`}
            position={pos}
            isOccupied={isOccupied}
          />
        );
      } else {
        const gender = stall.genderAllowed === 'F' ? 'F' 
          : stall.genderAllowed === 'M' ? 'M' 
          : 'both';
        stalls.push(
          <ToiletStall
            key={`stall-${idx}`}
            position={pos}
            gender={gender}
            isOccupied={isOccupied}
          />
        );
      }
    });

    grid.sinks.forEach((sink, idx) => {
      const pos = toWorld(sink.col, sink.row);
      // Show as occupied if someone has claimed this sink
      const isOccupied = sink.occupantId !== null;
      sinks.push(
        <Sink
          key={`sink-${idx}`}
          position={pos}
          isOccupied={isOccupied}
        />
      );
    });

    grid.changingTables.forEach((table, idx) => {
      const pos = toWorld(table.col, table.row);
      // Show as occupied if someone has claimed this changing table
      const isOccupied = table.occupantId !== null;
      changingTables.push(
        <ChangingTable
          key={`changing-${idx}`}
          position={pos}
          isOccupied={isOccupied}
        />
      );
    });

    return { stalls, urinals, sinks, changingTables };
  };

  // Get fixture elements (re-computed every render to reflect occupancy changes)
  const fixtureElements = buildFixtureElements();

  // Render agents (don't use useMemo - simulation.people array reference doesn't change)
  const visiblePeople = simulation.people.filter(p => p.state !== PersonState.DONE);
  
  console.log(`🎬 Rendering ${visiblePeople.length} visible agents out of ${simulation.people.length} total people`);
  
  const agents = visiblePeople.map(person => {
    const pos = toWorld(person.col, person.row);
    const adjustedPos: [number, number, number] = [pos[0], 0, pos[2]];
    
    return (
      <Suspense 
        key={`agent-${person.id}`}
        fallback={<AgentFallback position={adjustedPos} gender={person.gender} />}
      >
        <MixamoAgent
          id={person.id}
          position={adjustedPos}
          gender={person.gender}
          characterType={person.characterType}
          state={person.state}
        />
      </Suspense>
    );
  });

  // Construct Perimeter Walls (Stretch, don't stack)
  const perimeterWalls = (
    <group>
      {/* Top Wall */}
      <Wall 
        position={[centerX, 1.5, (minRow * cellSize)]} 
        width={widthCells * cellSize} 
        height={3} 
      />
      {/* Bottom Wall */}
      <Wall 
        position={[centerX, 1.5, ((maxRow + 1) * cellSize)]} 
        width={widthCells * cellSize} 
        height={3} 
      />
      {/* Left Wall */}
      <Wall 
        position={[(minCol * cellSize), 1.5, centerZ]} 
        width={depthCells * cellSize} 
        height={3} 
        rotation={[0, Math.PI / 2, 0]}
      />
      {/* Right Wall */}
      <Wall 
        position={[(maxCol + 1) * cellSize, 1.5, centerZ]} 
        width={depthCells * cellSize} 
        height={3} 
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );

  return (
    <group>
      {/* Floor - only render for active area */}
      <CheckeredFloor 
        width={widthCells * cellSize} 
        depth={depthCells * cellSize}
        position={[centerX - (widthCells * cellSize) / 2, 0, centerZ - (depthCells * cellSize) / 2]} 
      />

      {/* Perimeter Walls */}
      {perimeterWalls}

      {/* Static elements (walls, entrances, queue markers) - memoized */}
      {staticElements.internalWalls}
      {staticElements.entrances}
      {staticElements.queueMarkers}

      {/* Dynamic fixture elements (with real-time occupancy updates) */}
      {fixtureElements.stalls}
      {fixtureElements.urinals}
      {fixtureElements.sinks}
      {fixtureElements.changingTables}

      {/* Agents */}
      {agents}

      {/* Ambient decoration centered on room */}
      <group position={[centerX, 0, centerZ]}>
        {/* Lights relative to center */}
        {/* Can be improved, for now using scene lights */}
      </group>
    </group>
  );
}
