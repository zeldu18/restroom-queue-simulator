// CA-based App

import { useState, useEffect, useRef } from 'react';
import { CASimulation } from './engine/ca-simulation';
import { type CAConfig } from './engine/ca-types';
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

  const handleLayoutChange = (layout: 'simple' | 'split') => {
    simulation.pause();
    if (layout === 'simple') {
      simulation.grid.buildSimpleLayout();
    } else {
      simulation.grid.buildSplitLayout();
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

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      overflow: 'auto'
    }}>
      {/* Tab Navigation */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '1rem', zIndex: 1000 }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: '#eee',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Live Simulation (CA)
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          style={{
            padding: '8px 16px',
            background: '#1f1f1f',
            color: '#eee',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Batch Analysis
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          color: 'white',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 800,
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          Restroom Queue Cellular Automaton
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 350px',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Canvas */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <CACanvas simulation={simulation} cellSize={config.cellSize} />
            
            {/* Legend */}
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e91e63' }} />
                <span>Women</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#3f51b5' }} />
                <span>Men</span>
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
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
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
                  Layout:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleLayoutChange('simple')}
                    style={{
                      padding: '6px 12px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Simple (Unisex)
                  </button>
                  <button
                    onClick={() => handleLayoutChange('split')}
                    style={{
                      padding: '6px 12px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Split (W/M)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
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
              </div>
            </div>

            {/* Stats */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Statistics</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Simulation time:</span>
                  <span>{simulation.stats.simTimeSeconds.toFixed(0)}s</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>People served:</span>
                  <span>{simulation.stats.servedCount}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Currently inside:</span>
                  <span>{simulation.people.filter(p => p.state !== 'done').length}</span>
                </div>

                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Avg time in system:</span>
                  <span>{simulation.getAverageTime().toFixed(1)}s</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e91e63' }}>
                  <span style={{ fontWeight: 600 }}>Women avg:</span>
                  <span>{simulation.getFemaleAverageTime().toFixed(1)}s ({simulation.stats.femaleCount})</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f51b5' }}>
                  <span style={{ fontWeight: 600 }}>Men avg:</span>
                  <span>{simulation.getMaleAverageTime().toFixed(1)}s ({simulation.stats.maleCount})</span>
                </div>

                {simulation.stats.femaleCount > 0 && simulation.stats.maleCount > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#fff3e0',
                    borderRadius: '6px',
                    border: '1px solid #ffb74d'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#e65100' }}>
                      Gender Gap:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#e65100' }}>
                      {(simulation.getFemaleAverageTime() - simulation.getMaleAverageTime()).toFixed(1)}s
                      {' '}
                      ({((simulation.getFemaleAverageTime() / simulation.getMaleAverageTime() - 1) * 100).toFixed(1)}%)
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

