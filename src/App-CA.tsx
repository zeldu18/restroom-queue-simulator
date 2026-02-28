// CA-based App - Updated with Article Layouts and Character Types

import { useState, useEffect, useRef } from 'react';
import { CASimulation } from './engine/ca-simulation';
import { 
  type CAConfig, 
  PersonState, 
  ARTICLE_LAYOUTS,
  DEFAULT_CA_CONFIG,
} from './engine/ca-types';
import CACanvas from './ui/CACanvas';
import BatchAnalysis from './ui/BatchAnalysis';

const DEFAULT_CONFIG: CAConfig = {
  ...DEFAULT_CA_CONFIG,
  gridCols: 32,
  gridRows: 18,
  cellSize: 20,
  tickMs: 150,
  secondsPerTick: 0.5,
  arrivalRatePerMin: 12,
  warmupSeconds: 120,
};

export default function AppCA() {
  const [activeTab, setActiveTab] = useState<'live' | 'batch'>('live');
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

  // Start simulation loop
  useEffect(() => {
    if (activeTab === 'live') {
      const adjustedTickMs = config.tickMs / speedMultiplier;
      intervalRef.current = window.setInterval(() => {
        simulation.update();
        forceUpdate(prev => prev + 1);
      }, adjustedTickMs);

      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [simulation, config.tickMs, speedMultiplier, activeTab]);

  const handleStart = () => {
    simulation.start();
  };

  const handlePause = () => {
    simulation.pause();
  };

  const handleReset = () => {
    simulation.pause();
    simulation.reset();
    forceUpdate(prev => prev + 1);
  };

  const handleLayoutChange = (layoutId: string) => {
    simulation.pause();
    setSelectedLayout(layoutId);
    
    switch (layoutId) {
      case 'layout1':
        simulation.grid.buildLayout1_Basic5050();
        break;
      case 'layout2':
        simulation.grid.buildLayout2_EqualWaiting();
        break;
      case 'layout3':
        simulation.grid.buildLayout3_MinimalWaiting();
        break;
      case 'layout4':
        simulation.grid.buildLayout4_MixedBasic();
        break;
      case 'layout5':
        simulation.grid.buildLayout5_GenderNeutral();
        break;
      case 'layout6':
        simulation.grid.buildLayout6_MixedMinimal();
        break;
      default:
        simulation.grid.buildSimpleLayout();
    }
    
    simulation.reset();
    forceUpdate(prev => prev + 1);
  };

  const handleArrivalRateChange = (rate: number) => {
    setConfig(prev => ({ ...prev, arrivalRatePerMin: rate }));
    simulation.config.arrivalRatePerMin = rate;
  };

  const getArrivalRateLabel = (rate: number): string => {
    if (rate <= 3) return '😴 Quiet';
    if (rate <= 12) return '🚶 Normal';
    if (rate <= 20) return '🏃 Busy';
    if (rate <= 30) return '⏰ Rush Hour';
    return '🎉 Event Spike';
  };

  const getCurrentLayout = () => {
    return ARTICLE_LAYOUTS.find(l => l.id === selectedLayout) || ARTICLE_LAYOUTS[0];
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count people by state
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

  // Get fixture counts
  const counts = simulation.grid.getFixtureCounts();
  const areaPercentages = simulation.grid.getAreaPercentages();
  const currentLayout = getCurrentLayout();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%)',
      padding: '1rem',
      overflow: 'auto',
      position: 'relative'
    }}>
      {/* Decorative background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 40px)
        `,
        pointerEvents: 'none'
      }} />


      <div style={{ maxWidth: '1500px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Title + Start CTA */}
        <div style={{
          background: 'linear-gradient(135deg, #4c51bf 0%, #6366f1 100%)',
          borderRadius: '20px',
          padding: '1.25rem 2rem',
          marginBottom: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '3px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 800,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}>
            PUBLIC RESTROOM QUEUE SIMULATION
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>Start here →</span>
            <button
              onClick={handleStart}
              disabled={simulation.running}
              style={{
                padding: '0.6rem 1.5rem',
                background: simulation.running ? 'rgba(255,255,255,0.3)' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: simulation.running ? 'default' : 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: simulation.running ? 'none' : '0 4px 15px rgba(0,0,0,0.3)',
              }}
            >
              {simulation.running ? '▶ Running' : '▶ Start'}
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 320px',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Left Panel - Stats & Layout Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current Layout - compact */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#1a365d', fontSize: '1rem', fontWeight: 700 }}>
                {currentLayout.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4a5568', margin: 0 }}>
                {currentLayout.areaRatio} • {counts.womenStalls}♀ stalls, {counts.menStalls}♂ stalls, {counts.urinals} urinals
              </p>
            </div>

            {/* Live Statistics - simplified */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Time</span>
                  <span style={{ fontWeight: 700, color: '#1a365d' }}>{simulation.stats.simTimeSeconds.toFixed(0)}s</span>
                </div>
                {simulation.stats.simTimeSeconds < config.warmupSeconds && (
                  <div style={{ padding: '0.4rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e', textAlign: 'center' }}>
                    Warmup: {(config.warmupSeconds - simulation.stats.simTimeSeconds).toFixed(0)}s left
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Served</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>{simulation.stats.servedCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#db2777' }}>
                  <span>♀ Women wait</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getFemaleAverageTime().toFixed(1)}s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                  <span>♂ Men wait</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getMaleAverageTime().toFixed(1)}s</span>
                </div>
              </div>
              {showAdvanced && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Queue</span><span>{inQueue}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Using fixtures</span><span>{usingFixtures}</span></div>
                </div>
              )}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
              >
                {showAdvanced ? 'Show less' : 'Show more'}
              </button>
            </div>
          </div>

          {/* Canvas - Middle Column */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <CACanvas 
              simulation={simulation} 
              cellSize={config.cellSize} 
              customMode={false}
            />
            
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Pink = women, Blue = men. Watch the queues and wait times.
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Playback Controls */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#1a365d', fontWeight: 700 }}>▶️ Controls</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  onClick={handleStart}
                  disabled={simulation.running}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: simulation.running ? '#ccc' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: simulation.running ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  ▶ Start
                </button>
                <button
                  onClick={handlePause}
                  disabled={!simulation.running}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: !simulation.running ? '#ccc' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: !simulation.running ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  ↻ Reset
                </button>
              </div>

              {/* Speed Controls */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>
                  ⚡ Simulation Speed:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 1.5, 2, 3].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setSpeedMultiplier(speed)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: speedMultiplier === speed 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                          : '#f3f4f6',
                        color: speedMultiplier === speed ? 'white' : '#1f2937',
                        border: speedMultiplier === speed ? 'none' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: speedMultiplier === speed ? 700 : 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrival Rate */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>
                  🚶 Arrival Rate: {config.arrivalRatePerMin}/min {getArrivalRateLabel(config.arrivalRatePerMin)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={config.arrivalRatePerMin}
                  onChange={(e) => handleArrivalRateChange(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.65rem', 
                  color: '#9ca3af',
                  marginTop: '0.25rem'
                }}>
                  <span>😴 3</span>
                  <span>🚶 12</span>
                  <span>🏃 20</span>
                  <span>⏰ 30</span>
                  <span>🎉 60</span>
                </div>
              </div>
            </div>

            {/* Layout Selection */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#1a365d', fontWeight: 700 }}>📐 Layout (from Research)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ARTICLE_LAYOUTS.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => handleLayoutChange(layout.id)}
                    style={{
                      padding: '10px 12px',
                      background: selectedLayout === layout.id 
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                        : '#f9fafb',
                      color: selectedLayout === layout.id ? 'white' : '#374151',
                      border: selectedLayout === layout.id ? 'none' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: selectedLayout === layout.id ? 700 : 500,
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{layout.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>
                      {layout.description} • {layout.areaRatio}
                    </div>
                  </button>
                ))}
              </div>
              
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: '#f9fafb',
                borderRadius: '6px'
                }}>
                <strong>Research-based layouts</strong> compare gender equity under different facility configurations.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
