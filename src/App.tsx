import { useEffect, useRef, useState, useCallback } from 'react'
import { Application, Graphics, Text } from 'pixi.js'
import { useSimStore } from './state/store'
import LayoutGrid from './editor/LayoutGrid'
import RightPanel from './ui/RightPanel'
import BatchAnalysis from './ui/BatchAnalysis'

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'batch'>('live')
  const canvasRef = useRef<HTMLDivElement>(null)
  const { width, height, agents, layout } = useSimStore()
  const [isMounted, setIsMounted] = useState(false)
  const [pixiReady, setPixiReady] = useState(false)
  const agentsRef = useRef(agents)
  const stageWrapperRef = useRef<HTMLDivElement>(null)
  const [stageScale, setStageScale] = useState(1)

  // Tile rendering scale aligned to layout grid
  const TILE_SIZE = 32
  const gridCols = Math.max(1, Math.round(layout.width / layout.gridSize))
  const gridRows = Math.max(1, Math.round(layout.height / layout.gridSize))
  const renderWidth = gridCols * TILE_SIZE
  const renderHeight = gridRows * TILE_SIZE
  const coordScale = TILE_SIZE / layout.gridSize

  // Keep agentsRef updated
  useEffect(() => {
    agentsRef.current = agents
  }, [agents])
  
  // Debug: log when agents change
  console.log('App render: agents count =', agents.length, agents)
  console.log('App render: isMounted =', isMounted, 'canvasRef.current =', canvasRef.current)

  // PIXI.js application instance
  const appRef = useRef<Application | null>(null)
  const agentLayerRef = useRef<Graphics | null>(null)

  // Set mounted state on component mount
  useEffect(() => {
    console.log('App: Component mounted, setting isMounted to true')
    setIsMounted(true)
  }, [])

  // Function to draw the layout
  // We no longer draw the layout in PIXI; it's drawn by LayoutGrid. Keep PIXI for agents only.
  const drawLayout = (_app: Application) => {}

  // Initialize PIXI once when component mounts
  useEffect(() => {
    console.log('App: PIXI useEffect triggered, isMounted:', isMounted, 'canvasRef.current:', canvasRef.current)
    if (!isMounted) {
      console.log('App: Not mounted yet, skipping PIXI initialization')
      return
    }
    if (!canvasRef.current) {
      console.log('App: No canvas ref, skipping initialization')
      return
    }

    let app: Application | null = null
    let fit: (() => void) | undefined

    const initPixi = async () => {
      console.log('App: Creating PIXI application...')
      console.log('App: Container element:', canvasRef.current)
      if (canvasRef.current) {
        console.log('App: Container dimensions:', {
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
          clientWidth: canvasRef.current.clientWidth,
          clientHeight: canvasRef.current.clientHeight
        })
      }

      app = new Application()
      await app.init({
        width: renderWidth,
        height: renderHeight,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      })

      console.log('App: PIXI canvas element:', app.canvas)
      console.log('App: PIXI canvas dimensions:', app.canvas.width, 'x', app.canvas.height)

      // Add canvas to DOM
      if (canvasRef.current) {
        app.canvas.style.position = 'absolute'
        app.canvas.style.top = '0'
        app.canvas.style.left = '0'
        canvasRef.current.appendChild(app.canvas)
      }
      console.log('App: PIXI app created and canvas added to DOM')

      // Create layers - agentLayer on top for visibility
      const agentLayer = new Graphics()
      app.stage.addChild(agentLayer)
      
      // Ensure agent layer is on top
      app.stage.setChildIndex(agentLayer, app.stage.children.length - 1)

      // Store references
      appRef.current = app
      agentLayerRef.current = agentLayer

      // Mark PIXI as ready
      setPixiReady(true)

      // Draw initial layout
      drawLayout(app)

      // Draw test red dot
      console.log('App: Drawing test red dot...')
      agentLayer.circle(100, 100, 10)
      agentLayer.fill(0xFF0000)
      console.log('App: Test red dot drawn and rendered')
      
      // Draw test agent dot
      console.log('App: Drawing test agent dot...')
      agentLayer.circle(200, 200, 8)
      agentLayer.fill(0xFF69B4) // pink
      console.log('App: Test agent dot drawn and rendered')

      // Fixed-size stage; we scale via CSS transform in wrapper
    }

    initPixi().catch(console.error)

return () => {
      console.log('App: Cleaning up PIXI...')
      if (fit) window.removeEventListener('resize', fit)
      if (app) {
        app.destroy(true, { children: true })
        appRef.current = null
        agentLayerRef.current = null
      }
    }
  }, [isMounted, width, height])

  // Create a stable tick function that doesn't get recreated
  const stableTick = useCallback(() => {
    const currentApp = appRef.current
    const currentAgentLayer = agentLayerRef.current
    const latestAgents = agentsRef.current
    
    if (!currentApp || !currentAgentLayer) {
      return
    }

    // Clear previous agents
    if (typeof currentAgentLayer.clear === 'function') {
      currentAgentLayer.clear()
    }
    
    // Debug dots removed - were just for testing

    // Draw agents
    latestAgents.forEach((agent) => {
      // Skip agents with undefined coordinates
      if (agent.pos?.x === undefined || agent.pos?.y === undefined) {
        return
      }
      
      const color = agent.gender === 'female' ? 0xFF69B4 : 0x87CEEB // pink for female, light blue for male
      if (typeof currentAgentLayer.circle === 'function') {
        // Draw agent with border for better visibility
        const ax = agent.pos.x * coordScale
        const ay = agent.pos.y * coordScale
        currentAgentLayer.circle(ax, ay, 12)
        currentAgentLayer.fill(color)
        currentAgentLayer.circle(ax, ay, 12)
        currentAgentLayer.stroke({ width: 3, color: 0x000000 }) // Black border
        
        // Add progress bar for occupying agents
        if (agent.state === 'occupying' && agent.dwellTimeRemaining) {
          const progressBarWidth = 20
          const progressBarHeight = 3
          const progress = Math.max(0, 1 - (agent.dwellTimeRemaining / 3000)) // Assuming max 3 seconds
          
          // Background bar
          currentAgentLayer.rect(ax - progressBarWidth/2, ay + 18, progressBarWidth, progressBarHeight)
          currentAgentLayer.fill(0xCCCCCC)
          
          // Progress bar
          currentAgentLayer.rect(ax - progressBarWidth/2, ay + 18, progressBarWidth * progress, progressBarHeight)
          currentAgentLayer.fill(0x00AA00) // Green for progress
        }
        
        // Only show state indicator for stationary agents (occupying or at front of queue)
        if (agent.state === 'occupying' && agent.dwellTimeRemaining) {
          const stateText = new Text({
            text: `using (${Math.ceil(agent.dwellTimeRemaining/1000)}s)`,
            style: {
              fontSize: 8,
              fill: 0x000000,
              fontWeight: 'bold'
            }
          })
          stateText.x = ax - 20
          stateText.y = ay - 25
          currentAgentLayer.addChild(stateText)
        }
      }
    })
    
    // Ensure agent layer is always on top
    if (currentApp.stage.children.length > 0) {
      currentApp.stage.setChildIndex(currentAgentLayer, currentApp.stage.children.length - 1)
    }
  }, []) // Empty dependency array - this function never changes

  // Add stable tick function to PIXI ticker
  useEffect(() => {
    console.log('App: Tick useEffect triggered, pixiReady =', pixiReady)
    if (!pixiReady) {
      console.log('App: PIXI not ready yet, skipping tick function setup')
      return
    }
    const app = appRef.current
    console.log('App: Tick useEffect - app available:', !!app)
    if (!app) {
      console.log('App: No PIXI app available for tick function')
      return
    }

    console.log('App: Adding stableTick function to PIXI ticker')
    app.ticker.add(stableTick)

    return () => {
      console.log('App: Removing stableTick function from PIXI ticker')
      app.ticker.remove(stableTick)
    }
  }, [pixiReady, stableTick])

  // Layout changes no longer require PIXI redraw; background tiles update via React

  // Compute scale for stage to fit into available space (center column)
  useEffect(() => {
    const compute = () => {
      const gridContainer = stageWrapperRef.current?.parentElement
      if (!gridContainer) return
      const availW = gridContainer.clientWidth
      const availH = gridContainer.clientHeight
      const s = Math.min(availW / renderWidth, availH / renderHeight)
      setStageScale(Math.max(0.1, Math.min(s, 3)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [renderWidth, renderHeight])

  if (activeTab === 'batch') {
    return (
      <div style={{ height: '100vh', overflow: 'auto', background: '#0e0e0e' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'live' ? '#4CAF50' : '#1f1f1f',
              color: '#eee',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Live Simulation
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'batch' ? '#4CAF50' : '#1f1f1f',
              color: '#eee',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Batch Analysis
          </button>
        </div>
        <BatchAnalysis />
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1fr) 400px', 
      height: '100vh',
      gap: '1rem',
      padding: '1rem'
    }}>
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '1rem', zIndex: 1000 }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'live' ? '#4CAF50' : '#1f1f1f',
            color: '#eee',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Live Simulation
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'batch' ? '#4CAF50' : '#1f1f1f',
            color: '#eee',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Batch Analysis
        </button>
      </div>

      {/* Center stage container */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <div 
          ref={stageWrapperRef}
          style={{ 
            position:'relative', 
            width: Math.round(renderWidth * stageScale), 
            height: Math.round(renderHeight * stageScale)
          }}
        >
          <div 
            className="stage"
            style={{
              position: 'relative',
              width: renderWidth,
              height: renderHeight,
              border: '2px solid #333',
              transform: `scale(${stageScale})`,
              transformOrigin: 'top left'
            }}
          >
            {/* Tile grid background */}
            <div style={{ position:'absolute', inset:0 }}>
              <LayoutGrid layout={layout} tileSize={TILE_SIZE} />
            </div>
            {/* PIXI canvas overlay */}
            <div ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>
      </div>

      {/* Right side - Controls and Metrics */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem' 
      }}>
        <RightPanel />
</div>
</div>
)
}
