// CA-based App - Updated with Article Layouts and Character Types

import { useState, useEffect, useRef } from 'react';
import { CASimulation } from './engine/ca-simulation';
import { 
  type CAConfig, 
  PersonState, 
  CharacterType,
  ARTICLE_LAYOUTS,
  DEFAULT_CA_CONFIG,
  DEFAULT_SERVICE_TIMES,
  DEFAULT_CHARACTER_FREQUENCIES,
} from './engine/ca-types';
import CACanvas from './ui/CACanvas';
import BatchAnalysis from './ui/BatchAnalysis';

const DEFAULT_CONFIG: CAConfig = {
  ...DEFAULT_CA_CONFIG,
  gridCols: 32,
  gridRows: 18,
  cellSize: 26,
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

  if (activeTab === 'batch') {
    return (
      <div style={{ height: '100vh', overflow: 'auto', background: '#0e0e0e' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '8px 16px',
              background: '#1f1f1f',
              color: '#eee',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🎮 Live Simulation
          </button>
          <button
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              color: '#eee',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📊 Batch Analysis
          </button>
        </div>
        <BatchAnalysis />
      </div>
    );
  }

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

      {/* Tab Navigation */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '1rem', zIndex: 1000 }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
          }}
        >
          🎮 Live Simulation
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          📊 Batch Analysis
        </button>
      </div>

      <div style={{ maxWidth: '1500px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Title Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4c51bf 0%, #6366f1 100%)',
          borderRadius: '20px',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '3px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
        }}>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '2rem',
            fontWeight: 900,
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
            letterSpacing: '1px',
          }}>
            🚻 RESTROOM QUEUE SIMULATOR
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            margin: '0.5rem 0 0 0',
            fontSize: '1rem',
            fontWeight: 600,
          }}>
            Cellular Automata • Gender Equity Analysis • CS166 Queueing Theory
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 320px',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Left Panel - Stats & Layout Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current Layout Info */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#1a365d', fontSize: '1.1rem', fontWeight: 700 }}>
                📐 {currentLayout.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.75rem' }}>
                {currentLayout.description}
              </p>
              
              {/* Fixture breakdown */}
          <div style={{
                background: '#f7fafc', 
                padding: '0.75rem', 
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#2d3748'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1a365d' }}>Fixtures:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  <span>🚺 Women's Stalls:</span><span style={{ fontWeight: 600 }}>{counts.womenStalls}</span>
                  <span>🚹 Men's Stalls:</span><span style={{ fontWeight: 600 }}>{counts.menStalls}</span>
                  <span>⚥ Shared Stalls:</span><span style={{ fontWeight: 600 }}>{counts.sharedStalls}</span>
                  <span>🚽 Urinals:</span><span style={{ fontWeight: 600 }}>{counts.urinals}</span>
                  <span>🚰 Sinks:</span><span style={{ fontWeight: 600 }}>{counts.sinks}</span>
                  <span>👶 Changing Tables:</span><span style={{ fontWeight: 600 }}>{counts.changingTables}</span>
                </div>
                
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Area Ratio: {currentLayout.areaRatio}</div>
                  {areaPercentages.women > 0 && <span>♀ {areaPercentages.women.toFixed(0)}% </span>}
                  {areaPercentages.men > 0 && <span>♂ {areaPercentages.men.toFixed(0)}% </span>}
                  {areaPercentages.shared > 0 && <span>⚥ {areaPercentages.shared.toFixed(0)}%</span>}
                </div>
              </div>
            </div>

            {/* Live Statistics */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#1a365d', fontSize: '1.1rem', fontWeight: 700 }}>
                📊 Live Statistics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>⏱️ Time:</span>
                  <span style={{ fontWeight: 700, color: '#1a365d' }}>{simulation.stats.simTimeSeconds.toFixed(0)}s</span>
                </div>
                
                {simulation.stats.simTimeSeconds < config.warmupSeconds && (
                  <div style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '6px',
                    border: '2px solid #fbbf24',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    ⏳ Warmup: {(config.warmupSeconds - simulation.stats.simTimeSeconds).toFixed(0)}s remaining
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>✅ Served:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>{simulation.stats.servedCount}</span>
                </div>
                
                <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                
                <div style={{ 
                  background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)', 
                  padding: '0.5rem', 
                  borderRadius: '6px',
                  border: '2px solid #93c5fd'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#1e40af', fontSize: '0.85rem' }}>
                    👥 Inside: {inQueue + usingFixtures + walking}
                  </div>
                  <div style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Queue:</span>
                      <span style={{ fontWeight: 600 }}>{inQueue}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Using Fixtures:</span>
                      <span style={{ fontWeight: 600 }}>{usingFixtures}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Walking:</span>
                      <span style={{ fontWeight: 600 }}>{walking}</span>
                    </div>
                  </div>
                </div>

                <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                
                {/* Wait times */}
                <div style={{ fontWeight: 700, color: '#1a365d', fontSize: '0.85rem' }}>⏱️ Average Times</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Overall Total:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getAverageTime().toFixed(1)}s</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#db2777' }}>
                  <span style={{ fontWeight: 600 }}>♀ Women:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getFemaleAverageTime().toFixed(1)}s</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                  <span style={{ fontWeight: 600 }}>♂ Men:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getMaleAverageTime().toFixed(1)}s</span>
                </div>

                {simulation.stats.femaleCount > 0 && simulation.stats.maleCount > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: simulation.getFemaleAverageTime() > simulation.getMaleAverageTime() 
                      ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                      : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: '8px',
                    border: simulation.getFemaleAverageTime() > simulation.getMaleAverageTime()
                      ? '2px solid #fca5a5'
                      : '2px solid #86efac',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#374151', fontSize: '0.85rem' }}>
                      ⚖️ Gender Gap Analysis
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                      <div>Difference: <strong>{Math.abs(simulation.getFemaleAverageTime() - simulation.getMaleAverageTime()).toFixed(1)}s</strong></div>
                      <div>
                        Women wait: <strong>{((simulation.getFemaleAverageTime() / simulation.getMaleAverageTime() - 1) * 100).toFixed(1)}%</strong> 
                        {simulation.getFemaleAverageTime() > simulation.getMaleAverageTime() ? ' longer' : ' less'}
                      </div>
                      <div style={{ marginTop: '0.25rem', fontWeight: 600, color: simulation.getFemaleAverageTime() > simulation.getMaleAverageTime() ? '#dc2626' : '#16a34a' }}>
                        {simulation.getFemaleAverageTime() > simulation.getMaleAverageTime() 
                          ? '⚠️ Women wait longer'
                          : '✅ Equitable wait times'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Character Types Legend */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              fontSize: '0.8rem'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#1a365d' }}>👥 Character Types</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#4a5568' }}>
                <span>👩/👨 Regular (~{(DEFAULT_CHARACTER_FREQUENCIES.regular * 100).toFixed(0)}%)</span>
                <span>🤰 Pregnant (~{(DEFAULT_CHARACTER_FREQUENCIES.pregnant * 100).toFixed(0)}% of women)</span>
                <span>👩‍👧/👨‍👦 Parent with child (~{(DEFAULT_CHARACTER_FREQUENCIES.parentWithChild * 100).toFixed(0)}%)</span>
                <span>👵/👴 Elderly (~{(DEFAULT_CHARACTER_FREQUENCIES.elderly * 100).toFixed(0)}%)</span>
                <span>🧑‍🦽 Wheelchair (~{(DEFAULT_CHARACTER_FREQUENCIES.wheelchair * 100).toFixed(0)}%)</span>
              </div>
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
            
            {/* Legend */}
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#1f2937' }}>
              <strong style={{ color: '#111827' }}>Legend:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#e91e63', border: '1px solid #333' }} />
                  <span>Women</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3f51b5', border: '1px solid #333' }} />
                  <span>Men</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#f8bbd9', border: '1px solid #999' }} />
                  <span>W Stalls</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#90caf9', border: '1px solid #999' }} />
                  <span>M Stalls</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#c5e1a5', border: '1px solid #999' }} />
                  <span>Shared</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#42a5f5', border: '1px solid #999' }} />
                  <span>Urinals</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#b39ddb', border: '1px solid #999' }} />
                  <span>Sinks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 14, height: 14, background: '#fff59d', border: '1px solid #999' }} />
                  <span>Changing</span>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.75rem', color: '#374151' }}>
                <strong>Status:</strong> 🟢 VAC = Vacant, 🔴 OCC = Occupied
              </div>
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

            {/* Service Time Info */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              fontSize: '0.75rem',
              color: '#4a5568'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#1a365d' }}>⏱️ Service Times</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                <span>♀ Stall:</span><span>{DEFAULT_SERVICE_TIMES.female.stallMin}-{DEFAULT_SERVICE_TIMES.female.stallMax}s</span>
                <span>♂ Stall:</span><span>{DEFAULT_SERVICE_TIMES.male.stallMin}-{DEFAULT_SERVICE_TIMES.male.stallMax}s</span>
                <span>🚽 Urinal:</span><span>{DEFAULT_SERVICE_TIMES.male.urinalMin}-{DEFAULT_SERVICE_TIMES.male.urinalMax}s</span>
                <span>♀ Sink:</span><span>{DEFAULT_SERVICE_TIMES.female.sinkMin}-{DEFAULT_SERVICE_TIMES.female.sinkMax}s</span>
                <span>♂ Sink:</span><span>{DEFAULT_SERVICE_TIMES.male.sinkMin}-{DEFAULT_SERVICE_TIMES.male.sinkMax}s</span>
                <span>👶 Changing:</span><span>{DEFAULT_SERVICE_TIMES.changingTable.min}-{DEFAULT_SERVICE_TIMES.changingTable.max}s</span>
                </div>
              <div style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.8 }}>
                Character types apply multipliers to base times.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
