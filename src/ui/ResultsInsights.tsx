import React, { useEffect, useRef, useState } from 'react';
import { CASimulation } from '../engine/ca-simulation';
import { ARTICLE_LAYOUTS as LAYOUTS } from '../engine/ca-types';

interface LayoutResult {
  id: string;
  name: string;
  shortName: string;
  womenWait: number;
  menWait: number;
  gap: number;
  equityScore: number;
}

const FUN_FACTS = [
  "Women's restroom lines can be many times longer in events.",
  'Equal floor space does not guarantee equal wait time.',
  'Shared stalls reduce wasted capacity during surges.',
  'Queue design can change fairness as much as fixture count.',
];

function QueueDots({ count, color }: { count: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '170px' }}>
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: color,
            opacity: 0.95,
          }}
        />
      ))}
    </div>
  );
}

export function ResultsInsights() {
  const [results, setResults] = useState<LayoutResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [storyStep, setStoryStep] = useState(0);
  const factIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      factIntervalRef.current = window.setInterval(() => {
        setCurrentFact((prev) => (prev + 1) % FUN_FACTS.length);
      }, 2500);
    } else if (factIntervalRef.current) {
      clearInterval(factIntervalRef.current);
    }
    return () => {
      if (factIntervalRef.current) clearInterval(factIntervalRef.current);
    };
  }, [isRunning]);

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

      const sim = new CASimulation({
        arrivalRatePerMin: 12,
        warmupSeconds: 60,
        secondsPerTick: 0.5,
      });

      const methodName = layoutMethods[i];
      if (methodName && typeof sim.grid[methodName] === 'function') {
        (sim.grid[methodName] as () => void)();
      }

      sim.start();
      const totalTicks = 300 / 0.5;
      for (let t = 0; t < totalTicks; t++) {
        sim.update();
        if (t % 50 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      const womenWait = sim.getFemaleAverageTime();
      const menWait = sim.getMaleAverageTime();
      const gap = womenWait - menWait;
      const maxWait = Math.max(womenWait, menWait, 1);
      const equityScore = Math.max(0, 100 - (Math.abs(gap) / maxWait * 100));

      newResults.push({
        id: layout.id,
        name: layout.name,
        shortName: layout.name.replace('Layout ', '').split(':')[0]!,
        womenWait: Math.round(womenWait * 10) / 10,
        menWait: Math.round(menWait * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        equityScore: Math.round(equityScore),
      });
    }

    setResults(newResults);
    setProgress(100);
    setIsRunning(false);
    setStoryStep(0);
  };

  const layout50 = results.find((r) => r.id === 'layout1');
  const layout6 = results.find((r) => r.id === 'layout6');

  const womenQueueDots50 = layout50 ? Math.round(layout50.womenWait / 8) : 0;
  const menQueueDots50 = layout50 ? Math.round(layout50.menWait / 8) : 0;
  const womenQueueDots6 = layout6 ? Math.round(layout6.womenWait / 8) : 0;
  const menQueueDots6 = layout6 ? Math.round(layout6.menWait / 8) : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0e0e1a 0%, #1a1a2e 50%, #16162a 100%)',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2.2rem',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #f472b6, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Results Story
          </h1>
          <p style={{ fontSize: '1rem', color: '#9ca3af', margin: 0 }}>
            One key message: 50:50 split does not equal wait times.
          </p>
        </div>

        {results.length === 0 && !isRunning && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={runComparison}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Run Comparison
            </button>
          </div>
        )}

        {isRunning && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: 'rgba(30,30,46,0.85)',
              borderRadius: '20px',
              border: '1px solid rgba(99,102,241,0.2)',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#fff' }}>Running simulations...</h2>
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                margin: '0 auto 1rem',
                background: 'rgba(99,102,241,0.2)',
                borderRadius: '10px',
                overflow: 'hidden',
                height: '12px',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <p style={{ color: '#a5b4fc', margin: '0 0 0.6rem 0' }}>{Math.round(progress)}% complete</p>
            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>💡 {FUN_FACTS[currentFact]}</p>
          </div>
        )}

        {results.length > 0 && layout50 && layout6 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.6rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              {['Causes', 'The Myth', 'Best Practical Layout', 'What This Means'].map((label, idx) => (
                <button
                  key={label}
                  onClick={() => setStoryStep(idx)}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(129,140,248,0.4)',
                    background: storyStep === idx ? 'rgba(99,102,241,0.45)' : 'rgba(30,30,46,0.65)',
                    color: storyStep === idx ? '#fff' : '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {storyStep === 0 && (
              <div
                style={{
                  background: 'rgba(30,30,46,0.85)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <h3 style={{ marginTop: 0, color: '#fff' }}>Why lines become unequal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '0.75rem' }}>
                  {[
                    ['🚽', 'Longer fixture time', 'Women typically need more stall time.'],
                    ['👗', 'More task steps', 'Clothing and care needs add time.'],
                    ['👶', 'Caregiving load', 'Parents and children often queue on one side.'],
                    ['📈', 'Queue compounding', 'Small delay differences grow into long lines.'],
                  ].map(([emoji, title, text]) => (
                    <div key={title} style={{ background: 'rgba(99,102,241,0.12)', borderRadius: 12, padding: '0.9rem' }}>
                      <div style={{ fontSize: '1.5rem' }}>{emoji}</div>
                      <div style={{ fontWeight: 700, margin: '0.3rem 0', color: '#e2e8f0' }}>{title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {storyStep === 1 && (
              <div
                style={{
                  background: 'rgba(30,30,46,0.85)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(239,68,68,0.35)',
                }}
              >
                <h3 style={{ marginTop: 0, color: '#fff' }}>The myth: 50:50 split means fairness</h3>
                <p style={{ color: '#cbd5e1', marginTop: 0 }}>
                  Layout 1 has equal floor area, but the queues are not equal.
                </p>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#f472b6', fontWeight: 700, marginBottom: 6 }}>Women queue</div>
                    <QueueDots count={womenQueueDots50} color="#f472b6" />
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>{layout50.womenWait}s avg</div>
                  </div>
                  <div>
                    <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 6 }}>Men queue</div>
                    <QueueDots count={menQueueDots50} color="#60a5fa" />
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>{layout50.menWait}s avg</div>
                  </div>
                </div>
                <p style={{ color: '#fca5a5', fontWeight: 700, marginBottom: 0, marginTop: '1rem' }}>
                  Gap in Layout 1: +{Math.abs(layout50.gap).toFixed(1)}s (women waiting longer)
                </p>
              </div>
            )}

            {storyStep === 2 && (
              <div
                style={{
                  background: 'rgba(30,30,46,0.85)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(16,185,129,0.35)',
                }}
              >
                <h3 style={{ marginTop: 0, color: '#fff' }}>Best practical solution: Layout 6</h3>
                <p style={{ color: '#cbd5e1', marginTop: 0 }}>
                  Not perfect, but most balanced in practice: <strong>shared stalls</strong> absorb demand while
                  <strong> urinals remain accessible</strong> for fast male throughput.
                </p>

                <div
                  style={{
                    background: 'rgba(15,23,42,0.55)',
                    borderRadius: '14px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 10, background: 'rgba(236,72,153,0.25)', color: '#f472b6' }}>Women stalls</div>
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 10, background: 'rgba(16,185,129,0.25)', color: '#34d399' }}>Shared stalls</div>
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 10, background: 'rgba(96,165,250,0.25)', color: '#60a5fa' }}>Urinals</div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.75rem 0 0' }}>
                    Visual aid: mixed fixture access lowers bottlenecks on one side.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#f472b6', fontWeight: 700, marginBottom: 6 }}>Women queue</div>
                    <QueueDots count={womenQueueDots6} color="#f472b6" />
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>{layout6.womenWait}s avg</div>
                  </div>
                  <div>
                    <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 6 }}>Men queue</div>
                    <QueueDots count={menQueueDots6} color="#60a5fa" />
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 6 }}>{layout6.menWait}s avg</div>
                  </div>
                </div>
              </div>
            )}

            {storyStep === 3 && (
              <div
                style={{
                  background: 'rgba(30,30,46,0.85)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <h3 style={{ marginTop: 0, color: '#fff' }}>What this means</h3>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', lineHeight: 1.7 }}>
                  <li>50:50 floor split alone does not guarantee equal waiting.</li>
                  <li>Queue fairness depends on both demand and fixture flexibility.</li>
                  <li>
                    Layout 6 is a strong practical compromise: shared stalls for flexibility plus urinals for throughput.
                  </li>
                </ul>
              </div>
            )}

            <div
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '14px',
                padding: '0.9rem 1rem',
                marginBottom: '1.5rem',
                color: '#a5b4fc',
                fontSize: '0.9rem',
              }}
            >
              Quick compare: Layout 1 gap = {Math.abs(layout50.gap).toFixed(1)}s vs Layout 6 gap ={' '}
              {Math.abs(layout6.gap).toFixed(1)}s.
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  setResults([]);
                  setProgress(0);
                  setStoryStep(0);
                }}
                style={{
                  padding: '0.7rem 1.3rem',
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: '#a5b4fc',
                  fontWeight: 600,
                }}
              >
                Run Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
