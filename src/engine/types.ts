export type Gender = 'female'|'male'|'neutral'


export interface Agent {
id: number
gender: Gender
pos: {x:number,y:number}
state: 'arriving'|'queueing'|'going'|'occupying'|'washing'|'exiting'
targetFixture?: Fixture | null
dwellTimeRemaining?: number
// Game-like path fields (non-breaking, optional)
aid?: string // string id for rendering keys
x?: number; y?: number; // grid coords (int)
rx?: number; ry?: number; // render coords (float)
speed?: number; // tiles per second
path?: {x:number,y:number}[]
pathStep?: number
target?: {x:number;y:number;kind:'STALL'|'SINK'|'EXIT'|'QUEUE'}
}


export interface Fixture {
id: string
kind: 'stall'|'urinal'|'sink'|'door'|'wall'
x: number
y: number
w: number
h: number
props?: Record<string, unknown>
}


export interface Layout {
gridSize: number
width: number
height: number
fixtures: Fixture[]
}

// Grid/cell primitives for game-like pathfinding
export type CellType = 'FLOOR'|'WALL'|'STALL'|'URINAL'|'SINK'|'DOOR'|'QUEUE'|'BLOCKED'

export interface GridCell {
 x: number; y: number;
 type: CellType;
}

export interface Grid {
 width: number; height: number;
 cells: GridCell[]; // row-major
}

export const isWalkable = (c: CellType) => (
  c === 'FLOOR' || c === 'DOOR' || c === 'QUEUE' || c === 'SINK'
)


export interface Distribution {
name: 'exponential'|'normal'|'lognormal'|'fixed'
params: Record<string, number>
}


export interface SimParams {
arrival: { ratePerMin: number; surge?: {tStart:number, tEnd:number, multiplier:number} }
dwell: { female: Distribution; male: Distribution; neutral?: Distribution }
routing: { sinkRequired: boolean }
genderMix: { female: number; male: number }
}