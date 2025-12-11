// 3D Bathroom Simulator App

import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { CASimulation } from './engine/ca-simulation';
import { 
  PersonState, 
  ARTICLE_LAYOUTS,
  DEFAULT_CA_CONFIG,
} from './engine/ca-types';
import { BathroomScene } from './3d/BathroomScene';

const DEFAULT_CONFIG = {
  ...DEFAULT_CA_CONFIG,
  gridCols: 32,
  gridRows: 18,
  cellSize: 1,
  tickMs: 150,
  secondsPerTick: 0.5,
  arrivalRatePerMin: 12,
  warmupSeconds: 120,
};

// Loading fallback inside Canvas
function SceneLoader({ center }: { center?: [number, number, number] }) {
  const pos = center || [10, 1, 10];
  return (
    <mesh position={pos}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#8b5cf6" />
    </mesh>
  );
}

export default function App3D() {
  const [simulation] = useState(() => {
    const sim = new CASimulation(DEFAULT_CONFIG);
    sim.grid.buildLayout1_Basic5050();
    return sim;
  });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [selectedLayout, setSelectedLayout] = useState('layout1');
  const [, forceUpdate] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Simulation loop
  useEffect(() => {
    const adjustedTickMs = config.tickMs / speedMultiplier;
    let tickCount = 0;
    intervalRef.current = window.setInterval(() => {
      simulation.update();
      tickCount++;
      if (tickCount % 10 === 0) {
        console.log(`🔄 Tick ${tickCount}: People=${simulation.people.length}, Running=${simulation.running}, Time=${simulation.stats.simTimeSeconds}s`);
      }
      forceUpdate(prev => prev + 1);
    }, adjustedTickMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulation, config.tickMs, speedMultiplier]);

  const handleStart = () => {
    console.log('▶️ START CLICKED');
    simulation.start();
    console.log(`After start(): Running=${simulation.running}`);
    forceUpdate(prev => prev + 1);
  };
  
  const handlePause = () => {
    console.log('⏸ PAUSE CLICKED');
    simulation.pause();
    forceUpdate(prev => prev + 1);
  };
  
  const handleReset = () => {
    console.log('↻ RESET CLICKED');
    simulation.pause();
    simulation.reset();
    forceUpdate(prev => prev + 1);
  };

  const handleLayoutChange = (layoutId: string) => {
    simulation.pause();
    setSelectedLayout(layoutId);
    
    switch (layoutId) {
      case 'layout1': simulation.grid.buildLayout1_Basic5050(); break;
      case 'layout2': simulation.grid.buildLayout2_EqualWaiting(); break;
      case 'layout3': simulation.grid.buildLayout3_MinimalWaiting(); break;
      case 'layout4': simulation.grid.buildLayout4_MixedBasic(); break;
      case 'layout5': simulation.grid.buildLayout5_GenderNeutral(); break;
      case 'layout6': simulation.grid.buildLayout6_MixedMinimal(); break;
      default: simulation.grid.buildSimpleLayout();
    }
    
    simulation.reset();
    forceUpdate(prev => prev + 1);
  };

  const handleArrivalRateChange = (rate: number) => {
    setConfig(prev => ({ ...prev, arrivalRatePerMin: rate }));
    simulation.config.arrivalRatePerMin = rate;
  };

  // Stats
  const inQueue = simulation.people.filter(p => p.state === PersonState.IN_QUEUE).length;
  const usingFixtures = simulation.people.filter(p => 
    p.state === PersonState.IN_STALL || 
    p.state === PersonState.AT_SINK ||
    p.state === PersonState.AT_CHANGING_TABLE
  ).length;
  const walking = simulation.people.filter(p => 
    p.state === PersonState.WALKING_TO_QUEUE || 
    p.state === PersonState.WALKING_TO_STALL || 
    p.state === PersonState.WALKING_TO_SINK || 
    p.state === PersonState.WALKING_TO_CHANGING_TABLE ||
    p.state === PersonState.EXITING
  ).length;

  const counts = simulation.grid.getFixtureCounts();
  const currentLayout = ARTICLE_LAYOUTS.find(l => l.id === selectedLayout);
  
  // Calculate center of layout for camera target
  const bounds = simulation.grid.bounds;
  const centerX = (bounds.minCol + bounds.maxCol) / 2;
  const centerZ = (bounds.minRow + bounds.maxRow) / 2;
  const layoutWidth = bounds.maxCol - bounds.minCol;
  const layoutDepth = bounds.maxRow - bounds.minRow;
  const cameraDistance = Math.max(layoutWidth, layoutDepth) * 1.5;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', display: 'flex' }}>
      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas shadows camera={{ position: [centerX + cameraDistance, cameraDistance * 0.8, centerZ + cameraDistance], fov: 45 }}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[centerX + 10, 30, centerZ + 10]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Controls - dynamically centered on layout */}
          <OrbitControls 
            target={[centerX, 0, centerZ]}
            enablePan
            enableZoom
            maxPolarAngle={Math.PI / 2.1}
            minDistance={10}
            maxDistance={80}
          />

          {/* Scene */}
          <Suspense fallback={<SceneLoader />}>
            <BathroomScene simulation={simulation} cellSize={1} />
            <Environment preset="apartment" />
          </Suspense>
        </Canvas>
      </div>

      {/* Right Panel - Controls */}
      <div style={{
        width: '320px',
        background: '#16213e',
        padding: '1rem',
        overflowY: 'auto',
        color: '#e2e8f0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#ffffff' }}>
          🚻 3D Simulator
        </h2>

        {/* Controls */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>▶️ Controls</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleStart}
              disabled={simulation.running}
              style={{
                flex: 1,
                padding: '10px',
                background: simulation.running ? '#4a5568' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: simulation.running ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              ▶
            </button>
            <button
              onClick={handlePause}
              disabled={!simulation.running}
              style={{
                flex: 1,
                padding: '10px',
                background: !simulation.running ? '#4a5568' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: !simulation.running ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              ⏸
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '10px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Speed */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>⚡ Speed</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 1.5, 2, 3].map(speed => (
              <button
                key={speed}
                onClick={() => setSpeedMultiplier(speed)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: speedMultiplier === speed ? '#3b82f6' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: speedMultiplier === speed ? 700 : 400
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Arrival Rate */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
            🚶 Arrivals: {config.arrivalRatePerMin}/min
          </h3>
          <input
            type="range"
            min="1"
            max="60"
            value={config.arrivalRatePerMin}
            onChange={(e) => handleArrivalRateChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Layout Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>📐 Layout</h3>
          <select
            value={selectedLayout}
            onChange={(e) => handleLayoutChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {ARTICLE_LAYOUTS.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
          {currentLayout && (
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
              {currentLayout.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>📊 Live Stats</h3>
          <div style={{ fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>⏱️ Time:</span>
              <span>{simulation.stats.simTimeSeconds.toFixed(0)}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>✅ Served:</span>
              <span>{simulation.stats.servedCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>👥 Inside:</span>
              <span>{inQueue + usingFixtures + walking}</span>
            </div>
          </div>
        </div>

        {/* Average Times */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>⏱️ Avg Times</h3>
          <div style={{ fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e91e63' }}>
              <span>♀ Women:</span>
              <span>{simulation.getFemaleAverageTime().toFixed(1)}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f51b5' }}>
              <span>♂ Men:</span>
              <span>{simulation.getMaleAverageTime().toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Fixtures & Space */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1rem', 
          borderRadius: '8px' 
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🏗️ Fixtures</h3>
          <div style={{ fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.75rem' }}>
            <span>🚺 W:</span><span>{counts.womenStalls}</span>
            <span>🚹 M:</span><span>{counts.menStalls}</span>
            <span>🚽 U:</span><span>{counts.urinals}</span>
            <span>🚰 S:</span><span>{counts.sinks}</span>
          </div>
          
          <div style={{ 
            paddingTop: '0.75rem', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>📐 Circ. Efficiency:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                {(simulation.grid.getCirculationEfficiency() * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
              Fixture space vs. dead space
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(99,102,241,0.1)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#a5b4fc'
        }}>
          <strong>🖱️ Controls:</strong>
          <br />• Left drag: Rotate
          <br />• Right drag: Pan
          <br />• Scroll: Zoom
        </div>
      </div>
    </div>
  );
}
