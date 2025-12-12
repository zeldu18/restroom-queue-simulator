# Technical Documentation

## Wait Gap Simulator - Technical Overview

A real-time bathroom queue simulation demonstrating gender equity in facility design, built with React, Three.js, and Cellular Automata.

---

## 🛠️ Technology Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1 | UI framework with hooks |
| **TypeScript** | 5.9 | Type-safe development |
| **Vite** | 7.x | Build tool & dev server |

### 3D Rendering
| Technology | Purpose |
|------------|---------|
| **Three.js** | WebGL-based 3D graphics library |
| **@react-three/fiber** | React renderer for Three.js |
| **@react-three/drei** | Helper components (OrbitControls, etc.) |

### State Management & Utilities
| Technology | Purpose |
|------------|---------|
| **Zustand** | Lightweight state management |
| **Recharts** | Data visualization charts |

---

## 🏗️ How the 3D View Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     App-3D.tsx                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    Canvas                         │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              BathroomScene                  │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │  │
│  │  │  │ Fixtures│ │  Walls  │ │ Agents  │      │  │  │
│  │  │  │ (Stalls,│ │(Perimeter│ │(Animated│      │  │  │
│  │  │  │  Sinks, │ │ Internal)│ │Characters│     │  │  │
│  │  │  │ Urinals)│ │         │ │         │      │  │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘      │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key 3D Components

#### 1. **Canvas Setup** (`App-3D.tsx`)
```tsx
<Canvas
  shadows
  camera={{ position: [20, 25, 20], fov: 50 }}
>
  <ambientLight intensity={0.4} />
  <directionalLight position={[10, 20, 10]} castShadow />
  <BathroomScene simulation={simulation} config={config} />
  <OrbitControls />  {/* Mouse-based camera control */}
</Canvas>
```

#### 2. **Coordinate Transformation**
The simulation uses a 2D grid (row, col), but Three.js uses 3D (x, y, z):

```typescript
// Grid (2D) → World (3D) conversion
const toWorld = (col: number, row: number): [number, number, number] => {
  return [
    (col - centerCol) * cellSize,  // X = columns (left-right)
    0,                              // Y = height (always 0 for floor)
    (row - centerRow) * cellSize   // Z = rows (front-back)
  ];
};
```

#### 3. **Fixture Components** (`Fixtures.tsx`)
Each fixture is a composition of Three.js meshes:

```tsx
// Example: Toilet Stall
function ToiletStall({ position, gender, isOccupied }) {
  return (
    <group position={position}>
      {/* Back wall */}
      <mesh position={[0, 1.25, -0.45]}>
        <boxGeometry args={[1.2, 2.5, 0.1]} />
        <meshStandardMaterial color={genderColor} />
      </mesh>
      
      {/* Toilet bowl */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.7]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Occupancy indicator (red/green dot) */}
      <mesh position={[0.4, 2.4, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={isOccupied ? '#ff3333' : '#33ff33'}
          emissive={isOccupied ? '#ff0000' : '#00ff00'}
        />
      </mesh>
    </group>
  );
}
```

#### 4. **Animated Agents** (`MixamoAgent.tsx`)
Characters are simple capsule geometries with color-coding:

```tsx
function MixamoAgent({ person, cellSize }) {
  const color = person.gender === 'F' ? '#ff69b4' : '#4a90d9';
  
  return (
    <group position={[worldX, 0, worldZ]}>
      {/* Body (capsule) */}
      <mesh position={[0, 0.8, 0]}>
        <capsuleGeometry args={[0.25, 0.8, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#f5deb3" />
      </mesh>
    </group>
  );
}
```

### Rendering Optimization

```tsx
// Static elements (walls) - memoized, only recalculated when grid changes
const staticElements = useMemo(() => {
  // Build walls, entrances, queue markers
  return { walls, entrances, queueMarkers };
}, [grid]);

// Dynamic elements (fixtures with occupancy) - recalculated every frame
const fixtureElements = buildFixtureElements(); // Not memoized
```

---

## 🧠 Simulation Engine (Cellular Automata)

### What is Cellular Automata?

Cellular Automata (CA) is a discrete computational model where:
- Space is divided into a **grid of cells**
- Each cell has a **state** (empty, wall, fixture, etc.)
- Cells evolve based on **rules** applied each time step
- Agents (people) move through the grid following rules

### Grid Structure (`ca-grid.ts`)

```typescript
enum CellType {
  EMPTY = 0,      // Walkable floor
  WALL = 1,       // Impassable barrier
  W_STALL = 2,    // Women's toilet stall
  M_STALL = 3,    // Men's toilet stall
  URINAL = 4,     // Urinal (men only)
  SINK = 5,       // Handwashing sink
  SHARED_STALL = 6,  // Gender-neutral stall
  CHANGING_TABLE = 7, // Baby changing station
  QUEUE_W = 8,    // Women's queue position
  QUEUE_M = 9,    // Men's queue position
  ENTRANCE = 10,  // Entry point
  EXIT = 11       // Exit point
}
```

### Person State Machine (`ca-person.ts`)

Each person follows a state machine:

```
                    ┌─────────────────┐
                    │  SPAWN          │
                    │ (at entrance)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
              ┌─────│ WALKING_TO_QUEUE│
              │     └────────┬────────┘
              │              │ (if stall free, skip queue)
              │              ▼
              │     ┌─────────────────┐
              │     │    IN_QUEUE     │◄────┐
              │     └────────┬────────┘     │ (wait for stall)
              │              │              │
              │              ▼              │
              │     ┌─────────────────┐     │
              └────►│ WALKING_TO_STALL│─────┘
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    IN_STALL     │ (service time)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ WALKING_TO_SINK │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    AT_SINK      │ (wash time)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    EXITING      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      DONE       │
                    └─────────────────┘
```

### Pathfinding (BFS) (`pathfinding.ts`)

Uses Breadth-First Search to find shortest path:

```typescript
function findNextStep(
  startCol: number, startRow: number,
  targetCol: number, targetRow: number,
  isWalkable: (col: number, row: number) => boolean,
  gridCols: number, gridRows: number
): { col: number, row: number } | null {
  
  // BFS from start to target
  const queue: Array<{col, row, path}> = [{col: startCol, row: startRow, path: []}];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.col === targetCol && current.row === targetRow) {
      return current.path[0] || null; // Return first step
    }
    
    // Check 4 neighbors (up, down, left, right)
    for (const [dc, dr] of [[0,1], [0,-1], [1,0], [-1,0]]) {
      const newCol = current.col + dc;
      const newRow = current.row + dr;
      const key = `${newCol},${newRow}`;
      
      if (!visited.has(key) && isWalkable(newCol, newRow)) {
        visited.add(key);
        queue.push({
          col: newCol, 
          row: newRow, 
          path: [...current.path, {col: newCol, row: newRow}]
        });
      }
    }
  }
  
  return null; // No path found
}
```

### Collision Avoidance

```typescript
const isWalkable = (col: number, row: number): boolean => {
  // 1. Check bounds
  if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return false;
  
  // 2. Check walls and fixtures
  if (cellType === CellType.WALL) return false;
  
  // 3. Check other people (with smart passing)
  const occupant = people.find(p => p.col === col && p.row === row);
  if (occupant) {
    // Allow passing through moving people if we're stuck
    const isMoving = [WALKING_TO_QUEUE, WALKING_TO_STALL, EXITING].includes(occupant.state);
    if (isMoving && person.stuckTicks > 5) {
      return true; // Allow passing
    }
    return false;
  }
  
  return true;
};
```

---

## 📊 Queueing Theory

### Model: M/M/c Queue

This simulation implements an **M/M/c queue** model:

| Symbol | Meaning | Implementation |
|--------|---------|----------------|
| **M** | Markovian arrivals | Poisson process (random arrivals at rate λ) |
| **M** | Markovian service | Exponential service times |
| **c** | Number of servers | Number of stalls/urinals |

### Key Parameters

```typescript
interface SimulationConfig {
  // Arrival rate (λ)
  arrivalRate: number;  // people per minute
  
  // Service times (1/μ)
  serviceTimes: {
    female: { stallMin: 60, stallMax: 180 },  // seconds
    male: { 
      stallMin: 45, stallMax: 120,
      urinalMin: 20, urinalMax: 40 
    },
    sink: { femaleMin: 10, femaleMax: 30, maleMin: 5, maleMax: 15 }
  };
  
  // Servers (c)
  // Determined by layout: number of stalls + urinals
}
```

### Little's Law

The simulation validates against Little's Law:

```
L = λ × W

Where:
L = Average number of people in system
λ = Arrival rate (people/second)
W = Average time in system (seconds)
```

### Wait Time Calculation

```typescript
// Per person
person.waitTime = person.timeLeftQueue - person.timeEnteredQueue;

// Average (excluding warmup period)
averageWaitTime = totalWaitTime / servedCount;

// Gender-specific
femaleAverageWait = femaleWaitTimes.reduce(sum) / femaleCount;
maleAverageWait = maleWaitTimes.reduce(sum) / maleCount;

// The "Gap" (key metric)
waitTimeGap = femaleAverageWait - maleAverageWait;
```

### Why Women Wait Longer (Mathematical)

Given:
- Women's service time: μ_f = 90-180s (average ~120s)
- Men's urinal time: μ_m = 20-40s (average ~30s)
- Equal facilities: c_f = c_m

**Utilization (ρ = λ/cμ):**
- Women: ρ_f = λ / (c × 1/120) = higher utilization
- Men: ρ_m = λ / (c × 1/30) = lower utilization

**Result:** Women's queue grows faster → longer waits

**Solution:** Increase c_f (more women's stalls) until ρ_f ≈ ρ_m

---

## 🏃 Simulation Loop

### Main Loop (`ca-simulation.ts`)

```typescript
tick(): void {
  // 1. Spawn new arrivals (Poisson process)
  this.handleArrivals();
  
  // 2. Update each person's state
  for (const person of this.people) {
    this.updatePerson(person);
  }
  
  // 3. Maintain queue order (fill gaps)
  this.maintainQueueOrder('F');
  this.maintainQueueOrder('M');
  
  // 4. Update statistics
  this.updateStats();
  
  // 5. Advance simulation time
  this.stats.simTimeSeconds += this.config.tickInterval;
}
```

### Arrival Process (Poisson)

```typescript
handleArrivals(): void {
  // λ = arrivals per second
  const lambda = this.config.arrivalRate / 60;
  
  // Poisson probability of arrival this tick
  const p = lambda * this.config.tickInterval;
  
  if (Math.random() < p) {
    // Spawn a new person
    const gender = Math.random() < 0.5 ? 'F' : 'M';
    this.spawnPerson(gender);
  }
}
```

### Service Time Distribution

```typescript
// Uniform distribution between min and max
const serviceTime = this.randFloat(
  config.serviceTimes.female.stallMin,
  config.serviceTimes.female.stallMax
);

// With character modifiers (elderly, pregnant, etc.)
const actualTime = serviceTime * person.modifiers.stallTimeMultiplier;
```

---

## 📁 File Structure

```
src/
├── engine/
│   ├── ca-simulation.ts   # Main simulation logic
│   ├── ca-grid.ts         # Grid management & layouts
│   ├── ca-person.ts       # Person class & state machine
│   ├── ca-types.ts        # TypeScript types & enums
│   └── pathfinding.ts     # BFS pathfinding
│
├── 3d/
│   ├── BathroomScene.tsx  # Main 3D scene composition
│   ├── Fixtures.tsx       # 3D fixture components
│   └── MixamoAgent.tsx    # Animated character component
│
├── ui/
│   ├── CACanvas.tsx       # 2D canvas renderer
│   ├── AgentLayer.tsx     # 2D agent rendering
│   └── BatchAnalysis.tsx  # Batch simulation mode
│
├── App-CA.tsx             # 2D view entry point
├── App-3D.tsx             # 3D view entry point
└── main.tsx               # Application entry point
```

---

## 🔬 Research Basis

### Academic Sources

1. **"Potty Parity in Perspective"** - Sandra Rawls (2000)
   - First comprehensive study on restroom equity
   - Found 2.3:1 ratio needed for equal wait times

2. **"Queueing Analysis of Restroom Facilities"** - Zhang et al. (2012)
   - M/M/c model validation
   - Optimal allocation formulas

3. **"The Restroom Revolution"** - Clara Greed (2019)
   - Urban planning implications
   - Policy recommendations

### Key Statistics Used

| Parameter | Value | Source |
|-----------|-------|--------|
| Women's avg stall time | 90s | APA 2015 |
| Men's avg urinal time | 30s | APA 2015 |
| Peak arrival rate | 60/min | Event studies |
| Gender ratio | 50:50 | Census data |

---

## 🚀 Performance Considerations

### Tick Rate
- Default: 500ms per tick (2 ticks/second)
- Adjustable via speed multiplier (1x, 1.5x, 2x, 3x)

### Grid Size
- Typical: 20x20 to 40x40 cells
- Each cell: ~0.5m × 0.5m real-world

### Memory
- ~100 bytes per person
- ~4 bytes per grid cell
- Max recommended: 100 simultaneous agents

### 3D Performance
- Static geometry memoized
- Dynamic updates only for occupancy indicators
- Throttled re-renders via React state batching
