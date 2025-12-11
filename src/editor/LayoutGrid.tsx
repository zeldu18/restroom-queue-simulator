import { useEffect, useRef, useMemo } from 'react'
import { Application, Graphics, Text, Container } from 'pixi.js'
import stadiumDefault from '../presets/layouts/stadium.json'
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

// Canvas dimensions
const CANVAS_MAX_WIDTH = 320;
const CANVAS_MAX_HEIGHT = 600;

type Props = {
  grid?: Grid
  layout?: Layout
  tileSize?: number
}

export default function LayoutGrid(props: Props){
const ref = useRef<HTMLDivElement>(null)

// Use props.layout if provided, otherwise fall back to default
const activeLayout = useMemo(() => props.layout ?? (stadiumDefault as Layout), [props.layout])
const gridSize = activeLayout.gridSize || 20
const width = activeLayout.width
const height = activeLayout.height
const fixtures = activeLayout.fixtures as Fixture[]


useEffect(()=>{
if(!ref.current) return
let app: Application | null = null
let disposed = false
;(async () => {
const created = new Application()

// Calculate scale to fit layout in canvas while maintaining aspect ratio
const scaleX = CANVAS_MAX_WIDTH / width
const scaleY = CANVAS_MAX_HEIGHT / height
const scale = Math.min(scaleX, scaleY)

// Calculate actual canvas size based on scale
const canvasWidth = Math.ceil(width * scale)
const canvasHeight = Math.ceil(height * scale)

// Center offset if one dimension is smaller
const offsetX = Math.max(0, (CANVAS_MAX_WIDTH - canvasWidth) / 2)
const offsetY = Math.max(0, (CANVAS_MAX_HEIGHT - canvasHeight) / 2)

await created.init({ width: CANVAS_MAX_WIDTH, height: CANVAS_MAX_HEIGHT, background: '#161616' })
if(disposed) return
app = created
ref.current!.appendChild(app.canvas)

// Create container for the drawing to apply offset
const container = new Container()
container.x = offsetX
container.y = offsetY
app.stage.addChild(container)

const g = new Graphics()
container.addChild(g)

const draw = ()=>{
g.clear()

// Draw background for the layout area
g.rect(0, 0, canvasWidth, canvasHeight).fill(0x1a1a1a)

// Draw grid
for(let x=0;x<=width;x+=gridSize){ 
  g.moveTo(x*scale,0).lineTo(x*scale,canvasHeight) 
}
for(let y=0;y<=height;y+=gridSize){ 
  g.moveTo(0,y*scale).lineTo(canvasWidth,y*scale) 
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
        fontSize: Math.max(8, Math.min(12, scale * 8)),
        fill: 0xffffff,
        align: 'center',
        fontWeight: 'bold'
      }
    })
    labelText.x = x + w/2 - labelText.width/2
    labelText.y = y + h/2 - labelText.height/2
    container.addChild(labelText)
  }
})
}
draw()

})()

return ()=>{ disposed = true; if(app){ app.destroy(); app = null } if(ref.current) ref.current.innerHTML='' }
}, [ref, activeLayout, gridSize, width, height, fixtures])


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
} else {
  // Use activeLayout (from props.layout or default)
  const l = activeLayout
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
}

return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {/* PIXI Blueprint View */}
    <div 
      ref={ref} 
      style={{ 
        width: CANVAS_MAX_WIDTH, 
        height: CANVAS_MAX_HEIGHT, 
        border: '2px solid #333',
        borderRadius: '4px',
        overflow: 'hidden'
      }} 
    />
    
    {/* CSS Grid Tile View */}
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
  </div>
)
}