import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StickyGraphic from './story/StickyGraphic';
import { getDataset } from './story/resultsStoryData';
import type { LayoutDataset, Snapshot } from './story/resultsStoryData';

interface StepDef {
  headline: string;
  text: string;
  layoutId: string;
  snapshotIdx: number;
}

const STEPS: StepDef[] = [
  // 0 — Intro
  {
    headline: 'Imagine 50 men and 50 women waiting to use a public restroom.',
    text: 'What\u2019s the fastest and fairest way to serve everyone?',
    layoutId: 'layout1',
    snapshotIdx: 0,
  },
  // 1 — Queue forms
  {
    headline: 'If we split the floor 50:50, is it fair?',
    text: 'Most buildings divide restroom space equally between men and women. Sounds reasonable. Watch how the two queues develop as people arrive at the same rate.',
    layoutId: 'layout1',
    snapshotIdx: 1,
  },
  // 2 — Myth breaks
  {
    headline: 'Same space. Unequal lines.',
    text: 'With a 50:50 split (like Layout 1 in the simulation), the women\u2019s queue grows longer even though both sides get the same crowd. Look at the left lane \u2014 it keeps building while the right clears.',
    layoutId: 'layout1',
    snapshotIdx: 2,
  },
  // 3 — Why women take longer
  {
    headline: 'Not everyone\u2019s restroom visit takes the same time.',
    text: 'On average, women\u2019s visits take longer due to biological needs (e.g., menstruation), clothing adjustments, and more steps per visit. In our model, this shows up as a longer average time in stall.',
    layoutId: 'layout1',
    snapshotIdx: 2,
  },
  // 4 — Compounding
  {
    headline: 'Small delays snowball.',
    text: 'When one group takes longer per visit, the line grows faster than it drains. Once a queue forms, it takes time to recover. Notice the yellow-outlined dots \u2014 those are people waiting the longest.',
    layoutId: 'layout1',
    snapshotIdx: 3,
  },
  // 5 — Layout 3
  {
    headline: 'What if we change the layout?',
    text: 'Same 100 people, but now we give women more stalls. The gap shrinks \u2014 but doesn\u2019t disappear. Allocating more area helps, yet the fundamental mismatch in visit time remains.',
    layoutId: 'layout3',
    snapshotIdx: 3,
  },
  // 6 — Layout 6
  {
    headline: 'Best practical solution: Layout 6',
    text: 'Shared stalls absorb demand spikes while urinals keep a fast lane. Flexibility means capacity shifts to where it\u2019s needed most. Compare the gap number now to where we started.',
    layoutId: 'layout6',
    snapshotIdx: 3,
  },
  // 7 — Why Layout 6 works
  {
    headline: 'It\u2019s not perfect \u2014 it\u2019s flexible.',
    text: 'Three features make Layout 6 the best practical option. Watch each one light up in the diagram.',
    layoutId: 'layout6',
    snapshotIdx: 4,
  },
  // 8 — Wrap
  {
    headline: 'Design for flexibility, not symmetry.',
    text: 'A 50:50 floor split doesn\u2019t guarantee equal waiting. Outcomes depend on demand, service time, and fixture flexibility. The best solution isn\u2019t more space \u2014 it\u2019s smarter space.',
    layoutId: 'layout6',
    snapshotIdx: 4,
  },
];

const ResultsStoryScrolly: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const setStepRef = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    stepRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i); },
        { threshold: 0.5, root: null },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const stepDef = STEPS[activeStep] ?? STEPS[0];
  const dataset: LayoutDataset = getDataset(stepDef.layoutId);
  const snapshot: Snapshot = dataset.snapshots[stepDef.snapshotIdx] ?? dataset.snapshots[0];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isIntro = activeStep === 0;

  return (
    <div ref={scrollContainerRef} className="scrolly-root">
      {/* Sticky graphic panel */}
      <div className="scrolly-sticky-wrap">
        <div className="scrolly-sticky">
          <StickyGraphic
            activeStep={activeStep}
            dataset={dataset}
            snapshot={snapshot}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>

      {/* Scrolling text column */}
      <div className="scrolly-text">
        {STEPS.map((s, i) => (
          <div
            key={i}
            ref={setStepRef(i)}
            className="scrolly-step"
            data-step={i}
          >
            <div
              className="scrolly-step-card"
              style={{
                opacity: activeStep === i ? 1 : 0.25,
                transition: 'opacity 0.4s',
                ...(i === 0 ? { maxWidth: 400 } : {}),
              }}
            >
              {i > 0 && <div className="scrolly-step-num">Step {i}</div>}
              <h2
                className="scrolly-step-headline"
                style={i === 0 ? { fontSize: '1.6rem', lineHeight: 1.25 } : undefined}
              >
                {s.headline}
              </h2>
              <p className="scrolly-step-text">{s.text}</p>

              {/* Scroll cue only on intro */}
              {i === 0 && (
                <div
                  className="scroll-cue"
                  style={{
                    marginTop: 28,
                    textAlign: 'center',
                    opacity: isIntro ? 1 : 0,
                    transition: 'opacity 0.5s',
                  }}
                >
                  <div className="scroll-cue-arrow">&darr;</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Scroll to begin</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Replay / end */}
        <div className="scrolly-step" style={{ minHeight: '40vh' }}>
          <div className="scrolly-step-card" style={{ textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
              That&rsquo;s the story. Try the live simulation yourself.
            </p>
            <button
              onClick={scrollToTop}
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
              &uarr; Replay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsStoryScrolly;
