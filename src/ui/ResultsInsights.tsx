import React, { useState, useEffect, useRef } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { ARTICLE_LAYOUTS as LAYOUTS } from '../engine/ca-types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from 'recharts';

interface LayoutResult {
  id: string;
  name: string;
  shortName: string;
  womenWait: number;
  menWait: number;
  gap: number;
  equityScore: number;
  throughput: number;
  description: string;
}

interface ResultsInsightsProps {
  currentSimulation?: CASimulation;
}

// Fun facts to display
const FUN_FACTS = [
  "The average person spends about 3 years of their life on the toilet.",
  "Women's restroom lines at concerts can be 20x longer than men's.",
  "The first gender-neutral public restroom law was passed in 2014.",
  "A 2:1 ratio of women's to men's facilities is now required in many US stadiums.",
  "The 'potty parity' movement started in the 1980s.",
  "Some airports now use AI to predict restroom wait times.",
];

export function ResultsInsights({ currentSimulation }: ResultsInsightsProps) {
  const [results, setResults] = useState<LayoutResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [animatedEquity, setAnimatedEquity] = useState(0);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [verdictCardFlipped, setVerdictCardFlipped] = useState(false);
  const factIntervalRef = useRef<number | null>(null);

  // Rotate fun facts during loading
  useEffect(() => {
    if (isRunning) {
      factIntervalRef.current = window.setInterval(() => {
        setCurrentFact(prev => (prev + 1) % FUN_FACTS.length);
      }, 3000);
    } else {
      if (factIntervalRef.current) {
        clearInterval(factIntervalRef.current);
      }
    }
    return () => {
      if (factIntervalRef.current) {
        clearInterval(factIntervalRef.current);
      }
    };
  }, [isRunning]);

  // Animate equity score
  useEffect(() => {
    if (results.length > 0) {
      const best = results.reduce((a, b) => a.equityScore > b.equityScore ? a : b);
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= best.equityScore) {
          current = best.equityScore;
          clearInterval(interval);
        }
        setAnimatedEquity(current);
      }, 20);
      return () => clearInterval(interval);
    }
  }, [results]);

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
      sim.start();
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
        name: layout.name,
        shortName: layout.name.replace('Layout ', '').split(':')[0],
        womenWait: Math.round(womenWait * 10) / 10,
        menWait: Math.round(menWait * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        equityScore: Math.round(equityScore),
        throughput: Math.round(sim.stats.servedCount / 5),
        description: layout.description
      });
    }

    setResults(newResults);
    setProgress(100);
    setIsRunning(false);
  };

  // Get best and worst layouts
  const bestLayout = results.length > 0
    ? results.reduce((best, curr) => curr.equityScore > best.equityScore ? curr : best)
    : null;

  const worstLayout = results.length > 0
    ? results.reduce((worst, curr) => curr.equityScore < worst.equityScore ? curr : worst)
    : null;

  // Get verdict message based on results
  const getVerdict = () => {
    if (!bestLayout || !worstLayout) return null;

    if (bestLayout.equityScore > 90) {
      return {
        title: "Near-Perfect Equity Achieved!",
        message: `${bestLayout.shortName} creates almost equal wait times for everyone.`,
        color: "#10b981"
      };
    } else if (bestLayout.equityScore > 70) {
      return {
        title: "Good Progress on Equity",
        message: `${bestLayout.shortName} significantly reduces the wait gap compared to traditional designs.`,
        color: "#3b82f6"
      };
    } else {
      return {
        title: "Room for Improvement",
        message: `Even the best layout shows a ${Math.abs(bestLayout.gap).toFixed(0)}s gap. Consider hybrid approaches.`,
        color: "#f59e0b"
      };
    }
  };

  const verdict = getVerdict();
  const guidedSlides = bestLayout && worstLayout ? [
    {
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚺 ⏱️ 🚹</div>
          <p style={{ fontSize: '1.2rem', color: '#a5b4fc', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Studies show women wait <strong style={{ color: '#f472b6' }}>2–3x longer</strong> than men
            to use public restrooms. This is not just inconvenient: it is a design failure.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#f472b6' }}>{bestLayout.womenWait}s</div>
              <div style={{ color: '#9ca3af' }}>Women&apos;s avg wait (best layout)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#60a5fa' }}>{bestLayout.menWait}s</div>
              <div style={{ color: '#9ca3af' }}>Men&apos;s avg wait (best layout)</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      content: (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
            {[
              { icon: '🚽', title: 'Biological need', desc: 'Women must sit for all functions', time: '+30–60s' },
              { icon: '👗', title: 'Clothing', desc: 'More layers, complex fasteners', time: '+15–30s' },
              { icon: '👶', title: 'Childcare', desc: 'Often accompanying children', time: '+60–180s' },
              { icon: '🩸', title: 'Menstrual care', desc: 'Managing menstrual products', time: '+30–60s' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(99,102,241,0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.5rem' }}>{item.desc}</div>
                <div style={{ color: '#f472b6', fontWeight: 700, fontSize: '0.95rem' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      content: (
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '2px solid rgba(239,68,68,0.3)',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              minWidth: '200px',
            }}>
              <div style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem' }}>❌ EQUALITY</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0' }}>50% / 50%</div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>Same space for both</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '2rem' }}>→</div>
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '2px solid rgba(16,185,129,0.3)',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              minWidth: '200px',
            }}>
              <div style={{ fontSize: '1rem', color: '#10b981', marginBottom: '0.5rem' }}>✅ EQUITY</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0' }}>68% / 32%</div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>Fair wait times</div>
            </div>
          </div>
          <p style={{ color: '#a5b4fc', fontSize: '1.1rem', lineHeight: 1.6 }}>
            When we give equal space to people with unequal needs, we create unequal outcomes.
          </p>
        </div>
      ),
    },
    {
      content: (
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.3rem' }}>
            Our best layout: {bestLayout.shortName}
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#f472b6', fontWeight: 700, fontSize: '1.8rem' }}>{bestLayout.womenWait}s</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Women</div>
            </div>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1.8rem' }}>{bestLayout.menWait}s</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Men</div>
            </div>
          </div>
          <p style={{ color: '#10b981', fontWeight: 600 }}>
            Gap: only {Math.abs(bestLayout.gap).toFixed(1)}s. Equity score: {bestLayout.equityScore}%
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '1rem' }}>
            Worst layout ({worstLayout.shortName}) had a {Math.abs(worstLayout.gap).toFixed(1)}s gap
          </p>
        </div>
      ),
    },
    {
      content: (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>🚻</div>
          <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}>
            Do shared (gender-neutral) facilities help?
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {[
              { icon: '📐', title: 'Fixtures flex to demand', desc: 'When one group has a surge, everyone shares the capacity' },
              { icon: '⚡', title: 'No wasted space', desc: 'One side overflowing while the other sits empty does not happen' },
              { icon: '🌈', title: 'Inclusive by design', desc: 'Works for non-binary and families too' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                background: 'rgba(99,102,241,0.08)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <div style={{ fontSize: '1.8rem', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.95rem', color: '#9ca3af' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ] : [];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0e0e1a 0%, #1a1a2e 50%, #16162a 100%)',
      padding: '2rem', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #f472b6, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            The Verdict Is In
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: '600px', margin: '0 auto' }}>
            We ran 6 different bathroom layouts through our simulator. Here's what we found.
          </p>
        </div>

        {/* Run Comparison Button */}
        {results.length === 0 && !isRunning && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={runComparison}
              style={{
                padding: '1.25rem 3rem',
                fontSize: '1.3rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
                fontWeight: 600,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.4)';
              }}
            >
              Run the Experiment
            </button>
            <p style={{ color: '#6b7280', marginTop: '1rem', fontSize: '0.9rem' }}>
              Simulates 5 minutes of bathroom traffic for each layout
            </p>
          </div>
        )}

        {/* Loading State */}
        {isRunning && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            background: 'rgba(30,30,46,0.8)',
            borderRadius: '24px',
            border: '1px solid rgba(99,102,241,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔬</div>
            <h2 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Running Simulations...</h2>
            
            {/* Progress Bar */}
            <div style={{ 
              width: '100%',
              maxWidth: '400px',
              margin: '0 auto 1.5rem',
              background: 'rgba(99,102,241,0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '12px'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                transition: 'width 0.3s',
                borderRadius: '10px'
              }} />
            </div>
            
            <p style={{ color: '#a5b4fc', fontSize: '1rem', margin: '0 0 1rem 0' }}>
              {Math.round(progress)}% complete
            </p>
            
            {/* Fun Fact */}
            <div style={{
              background: 'rgba(99,102,241,0.1)',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <p style={{ margin: 0, color: '#a5b4fc', fontSize: '0.9rem', fontStyle: 'italic' }}>
                💡 {FUN_FACTS[currentFact]}
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <>
            {/* Main Verdict Card - Flippable */}
            {verdict && (
              <div style={{ marginBottom: '2rem' }}>
                <div
                  className={`results-flip-card ${verdictCardFlipped ? 'flipped' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest?.('button')) return;
                    setVerdictCardFlipped((f) => !f);
                  }}
                >
                  <div className="results-flip-inner">
                    {/* Front */}
                    <div
                      className="results-flip-front"
                      style={{
                        background: `linear-gradient(135deg, ${verdict.color}20, ${verdict.color}08)`,
                        border: `2px solid ${verdict.color}50`,
                      }}
                    >
                      <h2 style={{ fontSize: '2rem', margin: '0 0 0.75rem 0', color: verdict.color }}>
                        {verdict.title}
                      </h2>
                      <p style={{ fontSize: '1.2rem', color: '#e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
                        {verdict.message}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVerdictCardFlipped(true); }}
                        style={{
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(148,163,184,0.4)',
                          background: 'rgba(51,65,85,0.6)',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Flip to see &quot;or is it?&quot;
                      </button>
                    </div>
                  {/* Back - "or is it?" */}
                  <div
                    className="results-flip-back"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.08))',
                      border: '2px solid rgba(245,158,11,0.5)',
                    }}
                  >
                    <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.4rem 0', color: '#f59e0b', flexShrink: 0 }}>
                      …or is it? 🤔
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '0.5rem', flexShrink: 0 }}>
                      Real life throws curveballs:
                    </p>
                    <ul style={{
                      textAlign: 'left',
                      margin: 0,
                      paddingLeft: '1.25rem',
                      color: '#cbd5e1',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      maxWidth: '500px',
                      flexShrink: 0,
                    }}>
                      <li><strong>Building codes</strong>: often require 50/50 or fixed ratios</li>
                      <li><strong>Old buildings</strong>: hard to change layout without big renovations</li>
                      <li><strong>Cost and space</strong>: more fixtures mean more money and square feet</li>
                      <li><strong>Busy vs quiet hours</strong>: one design can't fit every time of day</li>
                      <li><strong>Local attitudes</strong>: gender-neutral restrooms are accepted differently everywhere</li>
                    </ul>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setVerdictCardFlipped(false); }}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(245,158,11,0.4)',
                        background: 'rgba(245,158,11,0.15)',
                        color: '#f59e0b',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      Flip back
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Key Finding Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Best Layout */}
              {bestLayout && (
                <div style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '0.5rem', fontWeight: 600 }}>
                    🏆 WINNER
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#fff' }}>
                    {bestLayout.shortName}
                  </h3>
                  <div style={{ 
                    fontSize: '3rem', 
                    fontWeight: 700, 
                    color: '#10b981',
                    lineHeight: 1
                  }}>
                    {animatedEquity}%
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Equity Score</div>
                  <div style={{ 
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1.5rem'
                  }}>
                    <div>
                      <div style={{ color: '#f472b6', fontWeight: 600 }}>{bestLayout.womenWait}s</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Women</div>
                    </div>
                    <div>
                      <div style={{ color: '#60a5fa', fontWeight: 600 }}>{bestLayout.menWait}s</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Men</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Worst Layout */}
              {worstLayout && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#ef4444', marginBottom: '0.5rem', fontWeight: 600 }}>
                    ❌ NEEDS WORK
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#fff' }}>
                    {worstLayout.shortName}
                  </h3>
                  <div style={{ 
                    fontSize: '3rem', 
                    fontWeight: 700, 
                    color: '#ef4444',
                    lineHeight: 1
                  }}>
                    {worstLayout.equityScore}%
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Equity Score</div>
                  <div style={{ 
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1.5rem'
                  }}>
                    <div>
                      <div style={{ color: '#f472b6', fontWeight: 600 }}>{worstLayout.womenWait}s</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Women</div>
                    </div>
                    <div>
                      <div style={{ color: '#60a5fa', fontWeight: 600 }}>{worstLayout.menWait}s</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Men</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gap Comparison */}
              {bestLayout && worstLayout && (
                <div style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#a5b4fc', marginBottom: '0.5rem', fontWeight: 600 }}>
                    📊 THE DIFFERENCE
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#fff' }}>
                    Design Matters
                  </h3>
                  <div style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 700, 
                    color: '#a5b4fc',
                    lineHeight: 1
                  }}>
                    {Math.abs(worstLayout.gap - bestLayout.gap).toFixed(0)}s
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Gap Reduction</div>
                  <p style={{ 
                    marginTop: '0.75rem', 
                    fontSize: '0.85rem', 
                    color: '#9ca3af',
                    lineHeight: 1.4
                  }}>
                    Switching from {worstLayout.shortName} to {bestLayout.shortName} saves women {Math.abs(worstLayout.gap - bestLayout.gap).toFixed(0)} seconds per visit
                  </p>
                </div>
              )}
            </div>

            {/* Understanding the Wait Gap - IntroPage style, moved down */}
            {guidedSlides.length > 0 && (
              <div style={{
                background: 'linear-gradient(145deg, rgba(30,30,46,0.95), rgba(20,20,35,0.9))',
                borderRadius: '24px',
                padding: '2.5rem',
                marginBottom: '2rem',
                border: '1px solid rgba(129,140,248,0.25)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)',
              }}>
                <h3 style={{ marginTop: 0, color: '#e2e8f0', fontSize: '1.5rem', textAlign: 'center' }}>
                  Understanding the Wait Gap
                </h3>
                <p style={{ color: '#a5b4fc', margin: '0.25rem 0 1.5rem', textAlign: 'center', fontSize: '0.95rem' }}>
                  Click through to explore why restroom equity matters
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {guidedSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSlideDirection(idx > guidedIndex ? 'next' : 'prev');
                        setGuidedIndex(idx);
                      }}
                      style={{
                        width: idx === guidedIndex ? '28px' : '10px',
                        height: '10px',
                        borderRadius: '5px',
                        border: 'none',
                        background: idx === guidedIndex ? 'linear-gradient(90deg, #818cf8, #a78bfa)' : 'rgba(148,163,184,0.35)',
                        cursor: 'pointer',
                        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        padding: 0,
                        boxShadow: idx === guidedIndex ? '0 0 12px rgba(129,140,248,0.5)' : 'none',
                      }}
                    />
                  ))}
                </div>

                <div
                  key={guidedIndex}
                  className={slideDirection === 'next' ? 'results-slide-enter' : 'results-slide-enter-prev'}
                  style={{
                    background: 'rgba(17,24,39,0.6)',
                    borderRadius: '20px',
                    padding: '2rem',
                    minHeight: '420px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {guidedSlides[guidedIndex]?.content}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => { setSlideDirection('prev'); setGuidedIndex((v) => Math.max(0, v - 1)); }}
                    disabled={guidedIndex === 0}
                    style={{
                      padding: '0.7rem 1.4rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.3)',
                      background: guidedIndex === 0 ? 'rgba(51,65,85,0.3)' : 'rgba(51,65,85,1)',
                      color: guidedIndex === 0 ? '#475569' : '#e2e8f0',
                      cursor: guidedIndex === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.25s',
                    }}
                  >
                    ← Previous
                  </button>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                    {guidedIndex + 1} / {guidedSlides.length}
                  </div>
                  <button
                    onClick={() => { setSlideDirection('next'); setGuidedIndex((v) => Math.min(guidedSlides.length - 1, v + 1)); }}
                    disabled={guidedIndex === guidedSlides.length - 1}
                    style={{
                      padding: '0.7rem 1.4rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(129,140,248,0.35)',
                      background: guidedIndex === guidedSlides.length - 1 ? 'rgba(49,46,129,0.25)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: guidedIndex === guidedSlides.length - 1 ? '#6366f1' : '#fff',
                      cursor: guidedIndex === guidedSlides.length - 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.25s',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Chart */}
            <div style={{
              background: 'rgba(30,30,46,0.8)',
              borderRadius: '24px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', textAlign: 'center' }}>
                Wait Time Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis 
                    dataKey="shortName" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#2a2a4a' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af' }}
                    axisLine={{ stroke: '#2a2a4a' }}
                    label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1e1e2e', 
                      border: '1px solid #3b3b5c',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="womenWait" 
                    name="Women's Wait" 
                    fill="#f472b6" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="menWait" 
                    name="Men's Wait" 
                    fill="#60a5fa" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Layout Cards - Interactive */}
            <h3 style={{ 
              textAlign: 'center', 
              margin: '0 0 1.5rem 0',
              color: '#fff',
              fontSize: '1.5rem'
            }}>
              Explore Each Layout
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {results.map((r) => (
                <div 
                  key={r.id}
                  onClick={() => setShowDetails(showDetails === r.id ? null : r.id)}
                  style={{
                    background: showDetails === r.id 
                      ? 'rgba(99,102,241,0.15)' 
                      : 'rgba(30,30,46,0.6)',
                    border: `1px solid ${showDetails === r.id ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
                    borderRadius: '16px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.1rem' }}>
                        {r.equityScore === bestLayout?.equityScore && '🏆 '}
                        {r.name.replace('Layout ', '')}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
                        {r.description}
                      </p>
                    </div>
                    <div style={{
                      background: r.equityScore > 80 ? 'rgba(16,185,129,0.2)' : r.equityScore > 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                      color: r.equityScore > 80 ? '#10b981' : r.equityScore > 50 ? '#f59e0b' : '#ef4444',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}>
                      {r.equityScore}%
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {showDetails === r.id && (
                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid rgba(99,102,241,0.2)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                        <div>
                          <div style={{ color: '#f472b6', fontWeight: 700, fontSize: '1.5rem' }}>{r.womenWait}s</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Women's Wait</div>
                        </div>
                        <div>
                          <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1.5rem' }}>{r.menWait}s</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Men's Wait</div>
                        </div>
                        <div>
                          <div style={{ 
                            color: Math.abs(r.gap) < 10 ? '#10b981' : r.gap > 30 ? '#ef4444' : '#f59e0b',
                            fontWeight: 700, 
                            fontSize: '1.5rem' 
                          }}>
                            {r.gap > 0 ? '+' : ''}{r.gap}s
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Gap</div>
                        </div>
                      </div>
                      <div style={{ 
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#a5b4fc'
                      }}>
                        {r.gap > 20 
                          ? `⚠️ Women wait ${r.gap.toFixed(0)} seconds longer than men`
                          : r.gap < -10
                            ? `ℹ️ Men wait ${Math.abs(r.gap).toFixed(0)} seconds longer than women`
                            : `✅ Wait times are roughly equal (${Math.abs(r.gap).toFixed(0)}s difference)`
                        }
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Key Takeaways */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
              borderRadius: '24px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', textAlign: 'center' }}>
                💡 Key Takeaways
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem'
              }}>
                <div style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1.25rem', 
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📐</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>50-50 Is Not Fair</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5 }}>
                    Equal space allocation creates unequal outcomes. Women need more facilities due to longer average visit times.
                  </p>
                </div>
                <div style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1.25rem', 
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚥</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>Gender-Neutral Works</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5 }}>
                    Shared facilities can improve equity by allowing flexible allocation based on real-time demand.
                  </p>
                </div>
                <div style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1.25rem', 
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>Design for Equity</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5 }}>
                    A 2:1 ratio (women:men) or gender-neutral designs can achieve near-equal wait times.
                  </p>
                </div>
              </div>
            </div>

            {/* Run Again */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => { setResults([]); setProgress(0); setAnimatedEquity(0); }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#a5b4fc',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                🔄 Run New Comparison
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
