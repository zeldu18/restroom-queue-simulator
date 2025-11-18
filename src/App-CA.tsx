// CA-based App

import { useState, useEffect, useRef } from 'react';
import { CASimulation } from './engine/ca-simulation';
import { type CAConfig, PersonState } from './engine/ca-types';
import CACanvas from './ui/CACanvas';
import BatchAnalysis from './ui/BatchAnalysis';

const DEFAULT_CONFIG: CAConfig = {
  gridCols: 36,
  gridRows: 18,
  cellSize: 24,
  tickMs: 150,
  secondsPerTick: 0.5,
  arrivalRatePerMin: 12,
  dwellTimeMin: 30,
  dwellTimeMax: 90,
  sinkTimeMin: 5,
  sinkTimeMax: 15,
  genderMix: { female: 0.5, male: 0.5 },
  pMaleUrinal: 0.85,
  warmupSeconds: 60, // First 60 seconds don't count in stats
};

export default function AppCA() {
  const [activeTab, setActiveTab] = useState<'live' | 'batch'>('live');
  const [simulation] = useState(() => {
    const sim = new CASimulation(DEFAULT_CONFIG);
    sim.grid.buildSimpleLayout();
    return sim;
  });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [, forceUpdate] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Start simulation loop
  useEffect(() => {
    if (activeTab === 'live') {
      intervalRef.current = window.setInterval(() => {
        simulation.update();
        forceUpdate(prev => prev + 1);
      }, config.tickMs);

      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [simulation, config.tickMs, activeTab]);

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

  const handleLayoutChange = (layout: 'simple' | 'layout1' | 'layout2' | 'layout3' | 'layout4' | 'layout5' | 'layout6') => {
    simulation.pause();
    switch (layout) {
      case 'simple':
        simulation.grid.buildSimpleLayout();
        break;
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
    }
    simulation.reset();
    forceUpdate(prev => prev + 1);
  };

  const handleArrivalRateChange = (rate: number) => {
    setConfig(prev => ({ ...prev, arrivalRatePerMin: rate }));
    simulation.config.arrivalRatePerMin = rate;
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
            Live Simulation (CA)
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
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
    );
  }

  // Count people by state
  const inQueue = simulation.people.filter(p => p.state === PersonState.IN_QUEUE).length;
  const usingFixtures = simulation.people.filter(p => p.state === PersonState.IN_STALL || p.state === PersonState.AT_SINK).length;
  const walking = simulation.people.filter(p => 
    p.state === PersonState.WALKING_TO_QUEUE || 
    p.state === PersonState.WALKING_TO_STALL || 
    p.state === PersonState.WALKING_TO_SINK || 
    p.state === PersonState.EXITING
  ).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
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
          repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px)
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
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
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

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Title Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '3px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-50px',
            left: '-50px',
            width: '150px',
            height: '150px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%'
          }} />
          
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '2.5rem',
            fontWeight: 900,
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
            letterSpacing: '1px',
            position: 'relative',
            zIndex: 1
          }}>
            🚻 RESTROOM QUEUE SIMULATOR
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.95)',
            margin: '0.5rem 0 0 0',
            fontSize: '1.1rem',
            fontWeight: 600,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            Cellular Automaton • Gender Equity Analysis • CS166 Queueing Theory
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 350px',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Canvas */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
            border: '3px solid rgba(255,255,255,0.3)'
          }}>
            <CACanvas simulation={simulation} cellSize={config.cellSize} />
            
            {/* Legend */}
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#1f2937' }}>
              <strong style={{ color: '#111827' }}>Legend:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e91e63', border: '1px solid #333' }} />
                  <span>Women</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#3f51b5', border: '1px solid #333' }} />
                  <span>Men</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#ffc1e3', border: '1px solid #999' }} />
                  <span>W Stalls</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#b3d9ff', border: '1px solid #999' }} />
                  <span>M Stalls</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#4a90e2', border: '1px solid #999' }} />
                  <span>Urinals</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#ce93d8', border: '1px solid #999' }} />
                  <span>Sinks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#ffccf2', border: '1px solid #999' }} />
                  <span>W Queue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, background: '#d6eaff', border: '1px solid #999' }} />
                  <span>M Queue</span>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.8rem', color: '#374151' }}>
                <strong>Occupancy:</strong> 🟢 VAC = Vacant, 🔴 OCC = Occupied
              </div>
            </div>
          </div>

          {/* Controls & Stats */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Controls */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Controls</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  onClick={handleStart}
                  disabled={simulation.running}
                  style={{
                    padding: '8px 16px',
                    background: simulation.running ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: simulation.running ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  ▶ Start
                </button>
                <button
                  onClick={handlePause}
                  disabled={!simulation.running}
                  style={{
                    padding: '8px 16px',
                    background: !simulation.running ? '#ccc' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: !simulation.running ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 16px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  ↻ Reset
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Layout (from research paper):
                </label>
                <select
                  onChange={(e) => handleLayoutChange(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="simple">Simple (Unisex - 4 stalls)</option>
                  <option value="layout1">Layout 1: Basic (50-50) - 3W/3M stalls</option>
                  <option value="layout2">Layout 2: ± Equal Waiting - 4W stalls / 2M stalls + 2 urinals</option>
                  <option value="layout3">Layout 3: Minimal Waiting - 5W stalls / 2M stalls + 3 urinals</option>
                  <option value="layout4">Layout 4: Mixed Basic - 6 shared stalls</option>
                  <option value="layout5">Layout 5: Gender-Neutral - 7 shared stalls</option>
                  <option value="layout6">Layout 6: Mixed Minimal - 7 shared stalls + 3 urinals</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  Compare configurations to analyze gender equity in wait times
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1f2937' }}>
                  Arrival rate (people/min): {config.arrivalRatePerMin}
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={config.arrivalRatePerMin}
                  onChange={(e) => handleArrivalRateChange(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  Currently: Constant rate. (Time-varying Poisson arrivals available in Batch Analysis tab)
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e3a8a', fontSize: '1.3rem', fontWeight: 700 }}>
                📊 Live Statistics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', color: '#1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>⏱️ Simulation time:</span>
                  <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{simulation.stats.simTimeSeconds.toFixed(0)}s</span>
                </div>
                
                {simulation.stats.simTimeSeconds < config.warmupSeconds && (
                  <div style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '6px',
                    border: '2px solid #fbbf24',
                    fontSize: '0.85rem',
                    color: '#92400e',
                    fontWeight: 600
                  }}>
                    ⏳ Warming up... ({(config.warmupSeconds - simulation.stats.simTimeSeconds).toFixed(0)}s remaining)
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>✅ People served:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>{simulation.stats.servedCount}</span>
                </div>
                
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                  (Stats counted after {config.warmupSeconds}s warmup)
                </div>
                
                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
                
                <div style={{ 
                  background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  border: '2px solid #93c5fd'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1e40af' }}>
                    👥 Currently Inside: {inQueue + usingFixtures + walking}
                  </div>
                  <div style={{ fontSize: '0.85rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🟠 In Queue:</span>
                      <span style={{ fontWeight: 600 }}>{inQueue}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🔴 Using Fixtures:</span>
                      <span style={{ fontWeight: 600 }}>{usingFixtures}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🟡 Walking:</span>
                      <span style={{ fontWeight: 600 }}>{walking}</span>
                    </div>
                  </div>
                </div>

                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1e3a8a' }}>
                  ⚙️ Simulation Parameters
                </div>
                <div style={{ fontSize: '0.85rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#4b5563' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fixture usage time:</span>
                    <span style={{ fontWeight: 600 }}>{config.dwellTimeMin}-{config.dwellTimeMax}s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🧼 Handwashing time:</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>{config.sinkTimeMin}-{config.sinkTimeMax}s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Arrival rate:</span>
                    <span style={{ fontWeight: 600 }}>{config.arrivalRatePerMin}/min</span>
                  </div>
                </div>
                
                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1f2937' }}>
                  <span style={{ fontWeight: 600 }}>Avg time in system:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getAverageTime().toFixed(1)}s</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#db2777' }}>
                  <span style={{ fontWeight: 700 }}>♀ Women avg:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getFemaleAverageTime().toFixed(1)}s ({simulation.stats.femaleCount})</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                  <span style={{ fontWeight: 700 }}>♂ Men avg:</span>
                  <span style={{ fontWeight: 700 }}>{simulation.getMaleAverageTime().toFixed(1)}s ({simulation.stats.maleCount})</span>
                </div>

                {simulation.stats.femaleCount > 0 && simulation.stats.maleCount > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '12px',
                    border: '3px solid #fbbf24',
                    boxShadow: '0 4px 15px rgba(251,191,36,0.3)'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#92400e', fontSize: '1.05rem' }}>
                      ⚖️ Gender Equity Gap
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Time difference:</strong> {Math.abs(simulation.getFemaleAverageTime() - simulation.getMaleAverageTime()).toFixed(1)}s
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Women wait:</strong> {((simulation.getFemaleAverageTime() / simulation.getMaleAverageTime() - 1) * 100).toFixed(1)}% longer
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.8 }}>
                        {simulation.getFemaleAverageTime() > simulation.getMaleAverageTime() 
                          ? '⚠️ Women experience longer wait times'
                          : '✅ Wait times are equal or favor women'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

