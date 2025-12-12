import React, { useState, useEffect } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { ARTICLE_LAYOUTS as LAYOUTS } from '../engine/ca-types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface LayoutResult {
  id: string;
  name: string;
  womenWait: number;
  menWait: number;
  gap: number;
  equityScore: number;
  throughput: number;
}

interface ResultsInsightsProps {
  currentSimulation?: CASimulation;
}

export function ResultsInsights({ currentSimulation }: ResultsInsightsProps) {
  const [results, setResults] = useState<LayoutResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedComparison, setSelectedComparison] = useState<'wait' | 'equity' | 'throughput'>('wait');

  // Run batch comparison of all layouts
  const runComparison = async () => {
    setIsRunning(true);
    setProgress(0);
    const newResults: LayoutResult[] = [];

    const layoutMethods = [
      'buildLayout1_Basic5050',
      'buildLayout2_EqualWaiting',
      'buildLayout3_MinimalWaiting',
      'buildLayout4_MixedBasic',
      'buildLayout5_GenderNeutral',
      'buildLayout6_MixedMinimal',
    ] as const;

    for (let i = 0; i < LAYOUTS.length; i++) {
      const layout = LAYOUTS[i];
      setProgress((i / LAYOUTS.length) * 100);

      // Create simulation for this layout
      const sim = new CASimulation({
        arrivalRatePerMin: 12,
        warmupSeconds: 60,
        secondsPerTick: 0.5,
        pMaleUrinal: 0.7,
        pMaleUseSink: 0.5,
      });

      // Build the specific layout
      const methodName = layoutMethods[i];
      if (methodName && typeof sim.grid[methodName] === 'function') {
        (sim.grid[methodName] as () => void)();
      }

      // Start and run simulation
      sim.start();  // Set running = true
      const totalTicks = 300 / 0.5; // 600 ticks for 5 minutes
      for (let t = 0; t < totalTicks; t++) {
        sim.update();
        // Yield to UI every 50 ticks
        if (t % 50 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      const womenWait = sim.getFemaleAverageTime();
      const menWait = sim.getMaleAverageTime();
      const gap = womenWait - menWait;
      const maxWait = Math.max(womenWait, menWait, 1);
      const equityScore = Math.max(0, 100 - (Math.abs(gap) / maxWait * 100));

      newResults.push({
        id: layout.id,
        name: layout.name.replace('Layout ', '').replace(': ', '\n'),
        womenWait: Math.round(womenWait * 10) / 10,
        menWait: Math.round(menWait * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        equityScore: Math.round(equityScore),
        throughput: Math.round(sim.stats.servedCount / 5) // per minute
      });
    }

    setResults(newResults);
    setProgress(100);
    setIsRunning(false);
  };

  // Get best layout
  const bestLayout = results.length > 0
    ? results.reduce((best, curr) => curr.equityScore > best.equityScore ? curr : best)
    : null;

  const worstLayout = results.length > 0
    ? results.reduce((worst, curr) => curr.equityScore < worst.equityScore ? curr : worst)
    : null;

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: '#1e293b' }}>
          📊 Results & Insights
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
          Understanding why <strong>equal space ≠ equal experience</strong>
        </p>
      </div>

      {/* Run Comparison Button */}
      {results.length === 0 && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={runComparison}
            disabled={isRunning}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              background: isRunning ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isRunning ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            {isRunning ? `Running... ${Math.round(progress)}%` : '🚀 Run Layout Comparison'}
          </button>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Simulates all 6 layouts for 5 minutes each
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {isRunning && (
        <div style={{ 
          marginBottom: '2rem',
          background: '#e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '8px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            transition: 'width 0.3s'
          }} />
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <>
          {/* Best Layout Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '2rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              🏆 BEST LAYOUT FOR EQUITY
            </div>
            <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>
              {bestLayout?.name.replace('\n', ': ')}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{bestLayout?.womenWait}s</div>
                <div style={{ opacity: 0.8 }}>♀ Women's Wait</div>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{bestLayout?.menWait}s</div>
                <div style={{ opacity: 0.8 }}>♂ Men's Wait</div>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{bestLayout?.equityScore}%</div>
                <div style={{ opacity: 0.8 }}>Equity Score</div>
              </div>
            </div>
            {bestLayout && Math.abs(bestLayout.gap) < 10 && (
              <div style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
                ✅ Only {Math.abs(bestLayout.gap).toFixed(1)}s difference - Nearly equal!
              </div>
            )}
          </div>

          {/* Equality vs Equity */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem 0', color: '#1e293b' }}>
              ⚖️ Equality vs Equity
            </h3>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Equality Box */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                width: '280px',
                border: '2px solid #fee2e2',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ef4444', marginBottom: '1rem' }}>
                  ❌ EQUALITY (Same Space)
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ width: '100px', height: '60px', background: '#fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 600 }}>50%</span>
                  </div>
                  <div style={{ width: '100px', height: '60px', background: '#bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 600 }}>50%</span>
                  </div>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {worstLayout && (
                    <>
                      ♀ Wait: <strong>{worstLayout.womenWait}s</strong> | ♂ Wait: <strong>{worstLayout.menWait}s</strong>
                      <br />
                      <span style={{ color: '#ef4444' }}>Gap: {worstLayout.gap}s</span>
                    </>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '2rem' }}>→</div>

              {/* Equity Box */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                width: '280px',
                border: '2px solid #bbf7d0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#10b981', marginBottom: '1rem' }}>
                  ✅ EQUITY (Fair Outcomes)
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ width: '140px', height: '60px', background: '#bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 600 }}>68%</span>
                  </div>
                  <div style={{ width: '60px', height: '60px', background: '#bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 600 }}>32%</span>
                  </div>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {bestLayout && (
                    <>
                      ♀ Wait: <strong>{bestLayout.womenWait}s</strong> | ♂ Wait: <strong>{bestLayout.menWait}s</strong>
                      <br />
                      <span style={{ color: '#10b981' }}>Gap: {Math.abs(bestLayout.gap)}s ✓</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              <em>"When we give equal space to people with unequal needs, we create unequal outcomes. 
              True fairness means allocating resources based on actual need."</em>
            </p>
          </div>

          {/* Chart */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📊 Layout Comparison</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['wait', 'equity', 'throughput'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedComparison(type)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedComparison === type ? '#6366f1' : '#e2e8f0',
                      color: selectedComparison === type ? 'white' : '#64748b',
                      fontWeight: 500
                    }}
                  >
                    {type === 'wait' ? 'Wait Times' : type === 'equity' ? 'Equity Score' : 'Throughput'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedComparison === 'wait' && (
                  <>
                    <Bar dataKey="womenWait" name="Women's Wait (s)" fill="#f472b6" />
                    <Bar dataKey="menWait" name="Men's Wait (s)" fill="#60a5fa" />
                  </>
                )}
                {selectedComparison === 'equity' && (
                  <Bar dataKey="equityScore" name="Equity Score (%)" fill="#10b981" />
                )}
                {selectedComparison === 'throughput' && (
                  <Bar dataKey="throughput" name="Throughput (people/min)" fill="#8b5cf6" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>📋 Detailed Results</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Layout</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>♀ Wait</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>♂ Wait</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Gap</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Equity</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Throughput</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ 
                    borderBottom: '1px solid #e2e8f0',
                    background: r.equityScore === bestLayout?.equityScore ? '#f0fdf4' : 'transparent'
                  }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      {r.equityScore === bestLayout?.equityScore && '🏆 '}
                      {r.name.replace('\n', ': ')}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ec4899' }}>{r.womenWait}s</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#3b82f6' }}>{r.menWait}s</td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      color: Math.abs(r.gap) < 10 ? '#10b981' : r.gap > 30 ? '#ef4444' : '#f59e0b'
                    }}>
                      {r.gap > 0 ? '+' : ''}{r.gap}s
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      fontWeight: 600,
                      color: r.equityScore > 80 ? '#10b981' : r.equityScore > 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {r.equityScore}%
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{r.throughput}/min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Why Women Wait Longer */}
          <div style={{
            background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#831843', textAlign: 'center' }}>
              🔬 Why Women Take Longer (The Science)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '🚽', title: 'Biological', time: '+30-60s', desc: 'Must sit for all functions' },
                { icon: '👗', title: 'Clothing', time: '+15-30s', desc: 'More layers, complex fasteners' },
                { icon: '👶', title: 'Childcare', time: '+60-180s', desc: 'Accompanying children' },
                { icon: '🩸', title: 'Menstrual', time: '+30-60s', desc: 'Managing products' },
                { icon: '👵', title: 'Mobility', time: 'Variable', desc: 'More elderly women users' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem' }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, color: '#831843' }}>{item.title}</div>
                  <div style={{ color: '#be185d', fontWeight: 500 }}>{item.time}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e40af', textAlign: 'center' }}>
              💡 Recommendations
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>🏗️ For Architects</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
                  <li>Never use 50-50 split</li>
                  <li>Minimum 60:40 ratio for women</li>
                  <li>Consider gender-neutral options</li>
                  <li>Add more stalls, not urinals</li>
                </ul>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>🎪 For Event Planners</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
                  <li>Concerts/Sports: 70:30 women's ratio</li>
                  <li>Offices: 60:40 or gender-neutral</li>
                  <li>High-traffic: Add family restrooms</li>
                </ul>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>📜 For Policy Makers</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
                  <li>Update building codes for equity</li>
                  <li>Mandate simulation studies</li>
                  <li>Require wait time reporting</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Run Again */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => { setResults([]); setProgress(0); }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#64748b',
                fontWeight: 500
              }}
            >
              🔄 Run New Comparison
            </button>
          </div>
        </>
      )}

      {/* Footer Quote */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '3rem', 
        padding: '2rem',
        background: '#f8fafc',
        borderRadius: '16px'
      }}>
        <p style={{ 
          fontSize: '1.2rem', 
          fontStyle: 'italic', 
          color: '#64748b',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          "Every minute a woman waits longer than a man is a minute of inequality we can fix."
        </p>
      </div>
    </div>
  );
}
