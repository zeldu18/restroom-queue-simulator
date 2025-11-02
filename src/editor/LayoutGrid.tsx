import { useEffect, useRef } from 'react'
import { Application, Graphics, Text } from 'pixi.js'
import stadium from '../presets/layouts/stadium.json'
import type { Fixture, Grid, GridCell, Layout, CellType } from '../engine/types'

// Add tile rendering helpers at the top
const TILE_SIZE = 32; // px per tile
const TILE_COLS = 10; // tiles per row in the tilesheet
const TILE_ROWS = 1;  // rows in the tilesheet
const tileMap: Record<string, {x:number,y:number}> = {
  FLOOR: {x:0,y:0},
  WALL: {x:1,y:0},
  DOOR: {x:2,y:0},
  STALL: {x:3,y:0},
  URINAL: {x:4,y:0},
  SINK: {x:5,y:0},
  QUEUE: {x:6,y:0},
  BLOCKED: {x:7,y:0},
};

type Props = {
  grid?: Grid
  layout?: Layout
  tileSize?: number
}

export default function LayoutGrid(props: Props){
const ref = useRef<HTMLDivElement>(null)
const gridSize = (stadium as any).gridSize || 20
const width = (stadium as any).width
const height = (stadium as any).height
const fixtures = (stadium as any).fixtures as Fixture[]


useEffect(()=>{
if(!ref.current) return
let app: Application | null = null
let disposed = false
;(async () => {
const created = new Application()
await created.init({ width: 320, height: 600, background: '#161616' })
if(disposed) return
app = created
ref.current!.appendChild(app.canvas)
const g = new Graphics(); app.stage.addChild(g)

// Scale factor to fit the layout in the 320px wide panel
const scale = 320 / width

const draw = ()=>{
g.clear()
// Draw grid
for(let x=0;x<width;x+=gridSize){ 
  g.moveTo(x*scale,0).lineTo(x*scale,height*scale) 
}
for(let y=0;y<height;y+=gridSize){ 
  g.moveTo(0,y*scale).lineTo(width*scale,y*scale) 
}
g.stroke({ width: 1, color: 0x2a2a2a, alpha: 0.3 })

// Group fixtures by type for numbering
const stalls = fixtures.filter(f => f.kind === 'stall').sort((a, b) => a.x - b.x)
const urinals = fixtures.filter(f => f.kind === 'urinal').sort((a, b) => a.x - b.x)
const sinks = fixtures.filter(f => f.kind === 'sink').sort((a, b) => a.x - b.x)

// Draw fixtures
fixtures.forEach(fixture => {
  const x = fixture.x * scale
  const y = fixture.y * scale
  const w = fixture.w * scale
  const h = fixture.h * scale
  
  // Set color based on fixture type
  let color = 0x666666
  let label = fixture.id
  switch(fixture.kind) {
    case 'stall': 
      color = 0x8B4513 // Brown
      const stallIndex = stalls.findIndex(s => s.id === fixture.id) + 1
      label = `S${stallIndex}`
      break
    case 'urinal': 
      color = 0x4169E1 // Royal blue
      const urinalIndex = urinals.findIndex(u => u.id === fixture.id) + 1
      label = `U${urinalIndex}`
      break
    case 'sink': 
      color = 0x87CEEB // Sky blue
      const sinkIndex = sinks.findIndex(s => s.id === fixture.id) + 1
      label = `SK${sinkIndex}`
      break
    case 'door': 
      color = 0x228B22 // Forest green
      label = 'ENT'
      break
    case 'wall': 
      color = 0x696969 // Dim gray
      label = ''
      break
  }
  
  g.rect(x, y, w, h).fill(color).stroke({ width: 1, color: 0xffffff, alpha: 0.5 })
  
  // Add label if not empty
  if (label) {
    const labelText = new Text({
      text: label,
      style: {
        fontSize: 8,
        fill: 0xffffff,
        align: 'center',
        fontWeight: 'bold'
      }
    })
    labelText.x = x + w/2 - labelText.width/2
    labelText.y = y + h/2 - labelText.height/2
    if (app) app.stage.addChild(labelText)
  }
})
}
draw()

})()

return ()=>{ disposed = true; if(app){ app.destroy(); app = null } if(ref.current) ref.current.innerHTML='' }
}, [ref])


// Replace PIXI grid with div grid with tiles
// Assume you have a cells array describing the grid and cell types
// Here's a sample rendering logic, after all the fixture/logic definitions:

// Build grid data from props or fallback demo
const effectiveTile = props.tileSize ?? TILE_SIZE

let gridWidth = 10
let gridHeight = 10
let cells: GridCell[] = []

if (props.grid) {
  gridWidth = props.grid.width
  gridHeight = props.grid.height
  cells = props.grid.cells
} else if (props.layout) {
  const l = props.layout
  gridWidth = Math.max(1, Math.round(l.width / l.gridSize))
  gridHeight = Math.max(1, Math.round(l.height / l.gridSize))
  const idx = (x:number,y:number)=> y*gridWidth + x
  cells = Array.from({length: gridWidth * gridHeight}, (_, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    type: 'FLOOR' as CellType,
  }))
  const markRect = (x:number,y:number,w:number,h:number,type:CellType)=>{
    const gx0 = Math.max(0, Math.floor(x / l.gridSize))
    const gy0 = Math.max(0, Math.floor(y / l.gridSize))
    const gx1 = Math.min(gridWidth, Math.ceil((x + w) / l.gridSize))
    const gy1 = Math.min(gridHeight, Math.ceil((y + h) / l.gridSize))
    for (let gy = gy0; gy < gy1; gy++) {
      for (let gx = gx0; gx < gx1; gx++) {
        cells[idx(gx, gy)].type = type
      }
    }
  }
  l.fixtures.forEach(f=>{
    const map: Record<string, CellType> = {
      wall: 'WALL', door: 'DOOR', stall: 'STALL', urinal: 'URINAL', sink: 'SINK'
    }
    const t = map[f.kind] ?? 'FLOOR'
    markRect(f.x, f.y, f.w, f.h, t)
  })
} else {
  // Fallback demo
  gridWidth = 10
  gridHeight = 10
  cells = Array.from({length: gridWidth * gridHeight}, (_, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    type: (['FLOOR','WALL','DOOR','STALL','URINAL','SINK','QUEUE','BLOCKED'] as const)[i%8] as CellType
  }))
}

return (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${gridWidth}, ${effectiveTile}px)`,
      gridTemplateRows: `repeat(${gridHeight}, ${effectiveTile}px)`,
      width: gridWidth * effectiveTile,
      height: gridHeight * effectiveTile,
      position: 'relative',
      border: '2px solid #222',
      background: '#222',
    }}
  >
    {cells.map((cell, idx) => {
      const type = (cell as any)?.type ?? 'FLOOR'
      const sprite = tileMap[type] || tileMap.FLOOR
      const style = {
        width: effectiveTile,
        height: effectiveTile,
        backgroundImage: 'url("/tiles/bathroom-tiles.png")',
        backgroundPosition: `-${sprite.x * effectiveTile}px -${sprite.y * effectiveTile}px`,
        backgroundSize: `${effectiveTile * TILE_COLS}px ${effectiveTile * TILE_ROWS}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      } as React.CSSProperties
      return <div key={idx} style={style} />
    })}
  </div>
)
}