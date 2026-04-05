import { useState, useEffect, useRef, useCallback } from 'react';
import CrowdViz from './story/CrowdViz';
import { people, SVG_W, SVG_H } from './story/resultsStoryData';
import type { Position } from './story/resultsStoryData';

interface GlobalIntroProps {
  onStart: () => void;
}

// Static intro positions — same grid the Results page uses
function buildIntroPositions(): Record<number, Position> {
  const p: Record<number, Position> = {};
  const cols = 10;
  const spacing = 28;
  const gridW = cols * spacing;
  const gridH = cols * spacing;
  const startX = (SVG_W - gridW) / 2 + spacing / 2;
  const startY = (SVG_H - gridH) / 2 + spacing / 2;
  people.forEach((person, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    p[person.id] = { x: startX + col * spacing, y: startY + row * spacing, zone: 'arrive' };
  });
  return p;
}

const INTRO_POSITIONS = buildIntroPositions();

const NAV_STEPS = [
  {
    title: 'Restroom Queue Simulator',
    subtitle: 'Your first action',
    content: (
      <div style={{ padding: '1.5rem 0' }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '3px solid #10b981',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>▶</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>Start</div>
          <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            This button is at the top of the 2D view. Click it to begin the simulation.
          </p>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', textAlign: 'center' }}>
          People will start arriving and using the restrooms. Watch the pink and blue dots.
        </p>
      </div>
    ),
  },
  {
    title: 'Step 2: What to watch',
    subtitle: 'Focus on these',
    content: (
      <div style={{ padding: '1rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>
          {[
            { emoji: '📋', label: 'The queues', desc: 'Lines forming at the entrance. Which side gets longer?' },
            { emoji: '⏱️', label: 'Wait times', desc: "Women's wait vs Men's wait. Shown in the left panel." },
            { emoji: '📐', label: 'Layout', desc: 'Try different layouts from the right panel. Compare Equal Space vs Mixed Access.' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              background: 'rgba(99, 102, 241, 0.08)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Step 3: Explore',
    subtitle: 'Try different views',
    content: (
      <div style={{ padding: '1rem 0' }}>
        <p style={{ color: '#cbd5e1', marginBottom: '1rem', lineHeight: 1.6 }}>
          Use the top navigation to switch between:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
            <strong style={{ color: '#e2e8f0' }}>2D View</strong> — Clear view of queues and paths
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
            <strong style={{ color: '#e2e8f0' }}>3D View</strong> — Spatial layout
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
            <strong style={{ color: '#e2e8f0' }}>Results</strong> — The story behind the simulation
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Step 4: Compare layouts',
    subtitle: 'Find the fairest design',
    content: (
      <div style={{ padding: '1rem 0' }}>
        <p style={{ color: '#cbd5e1', marginBottom: '1rem', lineHeight: 1.6 }}>
          Switch between layouts in the 2D view and watch how the queues change. Which design clears the line fairly?
        </p>
        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.25rem' }}>Hint</div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Pay attention to the wait-time gap between women and men. A fair layout keeps that gap small.
          </div>
        </div>
      </div>
    ),
  },
];

export function GlobalIntro({ onStart }: GlobalIntroProps) {
  const [phase, setPhase] = useState<'scrolly' | 'nav'>('scrolly');
  const [activeScreen, setActiveScreen] = useState(0);
  const [fairlyVisible, setFairlyVisible] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setScreenRef = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    screenRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    screenRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveScreen(i); },
        { threshold: 0.5 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [phase]);

  useEffect(() => {
    if (activeScreen === 2) {
      const t = setTimeout(() => setFairlyVisible(true), 300);
      return () => clearTimeout(t);
    }
    setFairlyVisible(false);
  }, [activeScreen]);

  useEffect(() => {
    if (activeScreen === 3) {
      const t = setTimeout(() => setBarsVisible(true), 400);
      return () => clearTimeout(t);
    }
    setBarsVisible(false);
  }, [activeScreen]);

  if (phase === 'nav') {
    const currentSlide = NAV_STEPS[navStep];
    const lastStep = navStep === NAV_STEPS.length - 1;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #0f172a, #111827)',
        color: '#eef2ff',
      }}>
        <div style={{
          width: 'min(560px, 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(129,140,248,0.25)',
          background: 'rgba(20,20,40,0.9)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          padding: '2rem',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#818cf8', marginBottom: '1rem' }}>
            Step {navStep + 1} of {NAV_STEPS.length}
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', lineHeight: 1.2, color: '#fff' }}>
            {currentSlide.title}
          </h1>
          <p style={{ margin: '0.5rem 0 1rem', color: '#a5b4fc', fontWeight: 600, fontSize: '1rem' }}>
            {currentSlide.subtitle}
          </p>
          <div style={{ minHeight: '200px' }}>
            {currentSlide.content}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button
              onClick={() => setNavStep((v) => Math.max(0, v - 1))}
              disabled={navStep === 0}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.3)',
                background: navStep === 0 ? 'rgba(30,41,59,0.5)' : 'rgba(30,41,59,0.95)',
                color: navStep === 0 ? '#64748b' : '#e2e8f0',
                cursor: navStep === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Previous
            </button>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {NAV_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setNavStep(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: i === navStep ? '#818cf8' : 'rgba(148,163,184,0.4)',
                  }}
                />
              ))}
            </div>

            {lastStep ? (
              <button
                onClick={onStart}
                style={{
                  padding: '0.7rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Start &rarr;
              </button>
            ) : (
              <button
                onClick={() => setNavStep((v) => Math.min(NAV_STEPS.length - 1, v + 1))}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(129,140,248,0.4)',
                  background: 'rgba(49,46,129,0.35)',
                  color: '#e0e7ff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Next
              </button>
            )}
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={onStart}
              style={{ background: 'transparent', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Skip intro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scrolly intro: full-screen splash → dot grid + cards
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #111827)' }}>
      {/* Screen 0 — full-screen centered text, no dots */}
      <div
        ref={setScreenRef(0)}
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          lineHeight: 1.2,
          color: '#f1f5f9',
          margin: 0,
          maxWidth: 700,
          fontWeight: 700,
        }}>
          Imagine 50 men and 50 women waiting to use a public restroom.
        </h1>
        <div className="scroll-cue" style={{ marginTop: 48, opacity: activeScreen === 0 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Scroll to begin</div>
          <div className="scroll-cue-arrow">&darr;</div>
        </div>
      </div>

      {/* Screens 1–3: dot grid + scrolling cards */}
      <div className="scrolly-root" style={{ paddingTop: '2rem' }}>
        {/* Sticky dot grid */}
        <div className="scrolly-sticky-wrap">
          <div className="scrolly-sticky">
            <div style={{ height: 'calc(100vh - 8rem)' }}>
              <CrowdViz
                people={people}
                positions={INTRO_POSITIONS}
                longWaitIds={[]}
                introMode
                expandWomen={activeScreen === 3}
                reducedMotion={false}
              />
            </div>
          </div>
        </div>

        {/* Scrolling cards */}
        <div className="scrolly-text">
          {/* Screen 1 — question */}
          <div ref={setScreenRef(1)} className="scrolly-step" data-step="1">
            <div
              className="scrolly-step-card"
              style={{ opacity: activeScreen === 1 ? 1 : 0.25, transition: 'opacity 0.4s', maxWidth: 380 }}
            >
              <h2 style={{ fontSize: '1.7rem', lineHeight: 1.25, margin: '0 0 0.75rem', color: '#f1f5f9' }}>
                How can we serve the most people?
              </h2>
              <div className="scroll-cue" style={{ marginTop: 24, textAlign: 'center', opacity: activeScreen === 1 ? 1 : 0, transition: 'opacity 0.5s' }}>
                <div className="scroll-cue-arrow">&darr;</div>
              </div>
            </div>
          </div>

          {/* Screen 2 — FAIRLY */}
          <div ref={setScreenRef(2)} className="scrolly-step" data-step="2">
            <div
              className="scrolly-step-card"
              style={{ opacity: activeScreen === 2 ? 1 : 0.25, transition: 'opacity 0.4s', maxWidth: 380 }}
            >
              <h2 style={{ fontSize: '1.7rem', lineHeight: 1.25, margin: '0 0 0.75rem', color: '#f1f5f9' }}>
                How can we serve the most people{' '}
                <span className={fairlyVisible ? 'fairly-word fairly-word--active' : 'fairly-word'}>
                  FAIRLY
                </span>
                ?
              </h2>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 0.25rem' }}>
                Different needs. Same space.
              </p>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#94a3b8', margin: 0 }}>
                What design clears the line fairly?
              </p>
              <div className="scroll-cue" style={{ marginTop: 20, textAlign: 'center', opacity: activeScreen <= 2 ? 1 : 0, transition: 'opacity 0.5s' }}>
                <div className="scroll-cue-arrow">&darr;</div>
              </div>
            </div>
          </div>

          {/* Screen 3 — Time chips + bars */}
          <div ref={setScreenRef(3)} className="scrolly-step" data-step="3">
            <div
              className="scrolly-step-card"
              style={{ opacity: activeScreen === 3 ? 1 : 0.25, transition: 'opacity 0.4s', maxWidth: 380 }}
            >
              <h2 style={{ fontSize: '1.5rem', lineHeight: 1.25, margin: '0 0 1rem', color: '#f1f5f9' }}>
                What if one group takes longer per visit?
              </h2>

              {/* Time chips */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.4)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f472b6' }}>~90s</div>
                  <div style={{ fontSize: 11, color: '#f9a8d4', marginTop: 2 }}>avg</div>
                </div>
                <div style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>~42s</div>
                  <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>avg</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginBottom: 16 }}>
                Example scenario
              </div>

              {/* Animated bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 18, borderRadius: 6, background: '#f472b6',
                    width: barsVisible ? '100%' : '0%',
                    transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                  }} />
                  <span style={{ fontSize: 11, color: '#f472b6', fontWeight: 600, whiteSpace: 'nowrap' }}>90s</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 18, borderRadius: 6, background: '#60a5fa',
                    width: barsVisible ? '47%' : '0%',
                    transition: 'width 0.8s cubic-bezier(.4,0,.2,1) 0.15s',
                  }} />
                  <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, whiteSpace: 'nowrap' }}>42s</span>
                </div>
              </div>

              {/* Microcopy */}
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 0.25rem' }}>
                Small time differences can change who waits longer.
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 1.25rem' }}>
                Try designs that reduce unfair waiting.
              </p>

              {/* Continue button */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <button
                  onClick={() => setPhase('nav')}
                  style={{
                    padding: '10px 28px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  How to use the tool &rarr;
                </button>
              </div>

              {/* Credit line */}
              <div
                style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, textAlign: 'center', cursor: 'pointer' }}
                title="Click for more info"
                onClick={onStart}
              >
                Layouts inspired by restroom design research by Wouter Rogiest and Kurt Van Hautegem (Ghent University, 2017).
              </div>

              {/* Skip */}
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button
                  onClick={onStart}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Skip to simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
