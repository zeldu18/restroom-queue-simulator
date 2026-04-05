import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StickyGraphic, { type StickyMode } from './story/StickyGraphic';
import { getDataset } from './story/resultsStoryData';
import type { LayoutDataset, Snapshot } from './story/resultsStoryData';

interface StepDef {
  headline: string;
  text: string;
  layoutId: string;
  snapshotIdx: number;
  summary?: string;
  stickyMode?: StickyMode;
}

const STEPS: StepDef[] = [
  {
    headline: 'Imagine 50 men and 50 women waiting to use a public restroom.',
    text: 'What\u2019s the fastest and fairest way to serve everyone?',
    layoutId: 'layout1',
    snapshotIdx: 0,
    stickyMode: 'intro',
  },
  {
    headline: 'If we split the floor 50:50, is it fair?',
    text: 'Most buildings divide restroom space equally between men and women. Sounds reasonable. Watch how the two queues develop as people arrive at the same rate.',
    layoutId: 'layout1',
    snapshotIdx: 1,
  },
  {
    headline: 'Same space. Unequal lines.',
    text: 'With an Equal Space layout (the traditional 50:50 split), the women\u2019s queue grows longer even though both sides get the same crowd. Look at the left lane \u2014 it keeps building while the right clears.',
    layoutId: 'layout1',
    snapshotIdx: 2,
    stickyMode: 'queueGrow',
  },
  {
    headline: 'Not everyone\u2019s restroom visit takes the same time.',
    text: 'On average, women\u2019s visits take longer due to biological needs (e.g., menstruation), clothing adjustments, and more steps per visit. In our model, this shows up as a longer average time in stall.',
    layoutId: 'layout1',
    snapshotIdx: 2,
    stickyMode: 'stepChain',
  },
  {
    headline: 'Small delays snowball.',
    text: 'When one group takes longer per visit, the line grows faster than it drains. Once a queue forms, it takes time to recover. Notice the yellow-outlined dots \u2014 those are people waiting the longest.',
    layoutId: 'layout1',
    snapshotIdx: 3,
    stickyMode: 'queueCompound',
    summary: 'In this layout, women waited an average of twice as long as men \u2014 despite using the same total floor space.',
  },
  {
    headline: 'What if we give women more stalls?',
    text: 'More for Women reallocates space toward women\u2019s fixtures. The gap shrinks \u2014 but men\u2019s side gets fewer urinals.',
    layoutId: 'layout2',
    snapshotIdx: 1,
  },
  {
    headline: 'The gap narrows',
    text: 'More stalls on the women\u2019s side soaks up demand. Compare the gap number to Equal Space.',
    layoutId: 'layout2',
    snapshotIdx: 2,
  },
  {
    headline: 'Still a tradeoff',
    text: 'Parity-oriented design helps, but visit time still differs. The line doesn\u2019t disappear overnight.',
    layoutId: 'layout2',
    snapshotIdx: 3,
  },
  {
    headline: 'One way to shrink the gap',
    text: 'You\u2019ve seen how reallocating fixtures changes the balance. Next we try optimizing for total throughput.',
    layoutId: 'layout2',
    snapshotIdx: 4,
    summary: 'Adding more stalls for women reduces the gap \u2014 but requires reallocating space away from men\u2019s fixtures.',
  },
  {
    headline: 'Minimal Waits',
    text: 'Throughput-optimized layout: stalls tuned to reduce total system wait time.',
    layoutId: 'layout3',
    snapshotIdx: 1,
  },
  {
    headline: 'Overall waits drop',
    text: 'The system tries to clear everyone faster. Watch how the gap compares to earlier layouts.',
    layoutId: 'layout3',
    snapshotIdx: 2,
  },
  {
    headline: 'Not the same as parity',
    text: 'Optimizing total throughput doesn\u2019t automatically equalize men\u2019s and women\u2019s waits.',
    layoutId: 'layout3',
    snapshotIdx: 3,
  },
  {
    headline: 'Throughput wins, parity lags',
    text: 'Throughput helps everyone on average \u2014 but the gap story is subtler.',
    layoutId: 'layout3',
    snapshotIdx: 4,
    summary: 'Optimizing for total throughput reduces overall waits but doesn\u2019t fully close the gap between groups.',
  },
  {
    headline: 'High Throughput',
    text: 'Urinal-heavy mixed layout. Men\u2019s line moves fast \u2014 but what happens to women\u2019s waits under peak demand?',
    layoutId: 'layout4',
    snapshotIdx: 1,
  },
  {
    headline: 'Men clear fast',
    text: 'Urinals maximize men\u2019s throughput. The men\u2019s queue drains quickly.',
    layoutId: 'layout4',
    snapshotIdx: 2,
  },
  {
    headline: 'Women\u2019s left behind',
    text: 'With fewer women\u2019s fixtures, the left lane stays long. The gap widens.',
    layoutId: 'layout4',
    snapshotIdx: 3,
  },
  {
    headline: 'The gap widens',
    text: 'Speed on one side doesn\u2019t always mean fairness across both.',
    layoutId: 'layout4',
    snapshotIdx: 4,
    summary: 'More urinals speed up men\u2019s side but leave women\u2019s wait unchanged \u2014 the gap widens under peak demand.',
  },
  {
    headline: 'Fully Shared',
    text: 'All stalls are pooled. No separate men\u2019s or women\u2019s rooms \u2014 everyone uses the same queues.',
    layoutId: 'layout5',
    snapshotIdx: 1,
  },
  {
    headline: 'Fairer rotation',
    text: 'A single pool spreads demand evenly. Wait times tighten toward each other.',
    layoutId: 'layout5',
    snapshotIdx: 2,
  },
  {
    headline: 'No urinal lane',
    text: 'Without urinals, everyone competes for stalls. Throughput changes compared to mixed designs.',
    layoutId: 'layout5',
    snapshotIdx: 3,
  },
  {
    headline: 'Everyone in one queue',
    text: 'Pooling can look fairer \u2014 at the cost of a dedicated fast lane.',
    layoutId: 'layout5',
    snapshotIdx: 4,
    summary: 'Pooling all capacity into shared stalls substantially reduces the gap \u2014 but removes the throughput advantage of urinals.',
  },
  {
    headline: 'Mixed Access',
    text: 'Shared stalls plus urinals: the practical compromise. Same crowd as before \u2014 watch the gap.',
    layoutId: 'layout6',
    snapshotIdx: 1,
  },
  {
    headline: 'Flexibility',
    text: 'Shared stalls absorb demand spikes while urinals keep a fast lane.',
    layoutId: 'layout6',
    snapshotIdx: 2,
  },
  {
    headline: 'Best practical solution: Mixed Access',
    text: 'Compare the gap number now to where we started with Equal Space.',
    layoutId: 'layout6',
    snapshotIdx: 3,
    stickyMode: 'spotlight',
  },
  {
    headline: 'It\u2019s not perfect \u2014 it\u2019s flexible.',
    text: 'Three features make Mixed Access the best practical option. Watch each one light up in the diagram.',
    layoutId: 'layout6',
    snapshotIdx: 4,
    stickyMode: 'spotlight',
  },
  {
    headline: 'Design for flexibility, not symmetry.',
    text: 'A 50:50 floor split doesn\u2019t guarantee equal waiting. Outcomes depend on demand, service time, and fixture flexibility. We recommend gender-neutral stalls while keeping urinals \u2014 and urinals can be placed behind doors or in partitions for privacy and comfort. The best solution isn\u2019t more space \u2014 it\u2019s smarter space.',
    layoutId: 'layout6',
    snapshotIdx: 4,
    summary: 'Shared stalls plus urinals: the fast lane clears quick visits, the shared pool handles the rest. This consistently produces the smallest gap.',
  },
];

interface Props {
  onNavigateToInfo?: () => void;
}

const ResultsStoryScrolly: React.FC<Props> = ({ onNavigateToInfo }) => {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shareMsg, setShareMsg] = useState('');

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
  }, [STEPS.length]);

  const stepDef = STEPS[activeStep] ?? STEPS[0];
  const stickyMode: StickyMode = stepDef.stickyMode ?? 'default';
  const dataset: LayoutDataset = getDataset(stepDef.layoutId);
  const snapshot: Snapshot = dataset.snapshots[stepDef.snapshotIdx] ?? dataset.snapshots[0];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isIntro = activeStep === 0;

  const l1Data = useMemo(() => getDataset('layout1'), []);
  const l6Data = useMemo(() => getDataset('layout6'), []);
  const l1Final = l1Data.snapshots[l1Data.snapshots.length - 1].metrics;
  const l6Final = l6Data.snapshots[l6Data.snapshots.length - 1].metrics;
  const menIncrease = Math.round(l6Final.menAvgWait - l1Final.menAvgWait);
  const womenDecrease = Math.round(l1Final.womenAvgWait - l6Final.womenAvgWait);

  const handleShare = async () => {
    const shareData = {
      title: 'The Wait Gap Simulator',
      text: 'Equal space doesn\u2019t have to mean unequal waiting. See why restroom design is a fairness issue.',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareMsg('Link copied!');
        setTimeout(() => setShareMsg(''), 2500);
      } catch { /* fallback */ }
    }
  };

  return (
    <div>
      <div ref={scrollContainerRef} className="scrolly-root">
        {/* Sticky graphic panel */}
        <div className="scrolly-sticky-wrap">
          <div className="scrolly-sticky">
            <StickyGraphic
              dataset={dataset}
              snapshot={snapshot}
              reducedMotion={reducedMotion}
              stickyMode={stickyMode}
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
              <h2
                className="scrolly-step-headline"
                style={i === 0 ? { fontSize: '1.6rem', lineHeight: 1.25 } : undefined}
              >
                {s.headline}
              </h2>
              <p className="scrolly-step-text">{s.text}</p>

              {i === 0 && (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    color: '#94a3b8',
                  }}
                >
                  Illustrated story — same 100 people, different layouts. Scroll to compare six ideas (not a live replay of the 2D simulator).
                </p>
              )}

              {s.summary && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(15,23,42,0.85)',
                    border: '1px solid rgba(148,163,184,0.22)',
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                    color: '#cbd5e1',
                  }}
                >
                  {s.summary}
                </div>
              )}

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
        </div>
      </div>

      {/* ── CONCLUSION SECTION ── */}

      {/* Part A — Tradeoff comparison */}
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '4rem 2rem 2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Equal Space column */}
          <div
            style={{
              flex: 1,
              padding: '1.75rem 1.5rem',
              background: 'rgba(239,68,68,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#94a3b8', fontWeight: 600, marginBottom: 16 }}>
              Equal Space layout
            </div>
            <div style={{ fontSize: 13, color: '#f472b6', marginBottom: 6 }}>
              Women&rsquo;s avg wait: <strong>{Math.round(l1Final.womenAvgWait)}s</strong>
            </div>
            <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 6 }}>
              Men&rsquo;s avg wait: <strong>{Math.round(l1Final.menAvgWait)}s</strong>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f87171', marginTop: 10 }}>
              Gap: {Math.round(l1Final.gap)}s
            </div>
          </div>
          {/* Mixed Access column */}
          <div
            style={{
              flex: 1,
              padding: '1.75rem 1.5rem',
              background: 'rgba(16,185,129,0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#94a3b8', fontWeight: 600, marginBottom: 16 }}>
              Mixed Access layout
            </div>
            <div style={{ fontSize: 13, color: '#f472b6', marginBottom: 6 }}>
              Women&rsquo;s avg wait: <strong>{Math.round(l6Final.womenAvgWait)}s</strong>
            </div>
            <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 6 }}>
              Men&rsquo;s avg wait: <strong>{Math.round(l6Final.menAvgWait)}s</strong>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginTop: 10 }}>
              Gap: {Math.round(l6Final.gap)}s
            </div>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#cbd5e1',
            fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
            lineHeight: 1.6,
            marginTop: 24,
            maxWidth: 620,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Men&rsquo;s wait increases by about {Math.abs(menIncrease)} second{Math.abs(menIncrease) !== 1 ? 's' : ''}.
          Women&rsquo;s wait drops by over {womenDecrease} seconds.
          The tradeoff is smaller than most buildings account for.
        </p>
      </div>

      {/* Part B — Named conclusion */}
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '2rem 2rem 1rem',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            color: '#f1f5f9',
            fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Mixed Access consistently produces the fairest outcomes.
        </h3>
        <p
          style={{
            color: '#94a3b8',
            fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Urinals clear the fast lane for quick visits. Shared stalls pool capacity so nobody
          is trapped behind a separate door. With the same square footage, this design reduces
          the wait gap without meaningfully increasing wait times for anyone.
        </p>
      </div>

      {/* Part C — Closing line */}
      <div
        className="results-conclusion-closing"
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '3rem 2rem',
        }}
      >
        <p
          className="results-conclusion-line results-conclusion-line--1"
          style={{
            color: '#e2e8f0',
            fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
            lineHeight: 1.65,
            fontWeight: 500,
            margin: 0,
          }}
        >
          Most buildings divide restroom space{' '}
          <span className="results-conclusion-em results-conclusion-em--amber">down the middle</span>{' '}
          and call it{' '}
          <span className="results-conclusion-em results-conclusion-em--amber">equal</span>. The simulation
          shows what that actually produces: women waiting{' '}
          <span className="results-conclusion-em results-conclusion-em--rose">two to three times longer</span>,
          not because more women show up, but because the{' '}
          <span className="results-conclusion-em results-conclusion-em--sky">fixtures</span> on their side move{' '}
          <span className="results-conclusion-em results-conclusion-em--rose">slower</span> and fit{' '}
          <span className="results-conclusion-em results-conclusion-em--rose">fewer people</span>.
        </p>
        <p
          className="results-conclusion-line results-conclusion-line--2"
          style={{
            color: '#e2e8f0',
            fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
            lineHeight: 1.65,
            fontWeight: 500,
            margin: '1.35rem 0 0',
          }}
        >
          Switching to{' '}
          <span className="results-conclusion-em results-conclusion-em--mint">stalls that anyone can use</span>
          {' — while keeping '}
          <span className="results-conclusion-em results-conclusion-em--sky">urinals</span>
          {' for '}
          <span className="results-conclusion-em results-conclusion-em--amber">faster visits</span>
          {' — '}
          <span className="results-conclusion-em results-conclusion-em--mint">nearly closes that gap</span>
          {' '}
          <span className="results-conclusion-em results-conclusion-em--amber">within the same square footage</span>.
        </p>
        <p className="results-conclusion-line results-conclusion-line--sub results-conclusion-subtext">
          The building doesn&apos;t need to get{' '}
          <span className="results-conclusion-em results-conclusion-em--amber">bigger</span>. The{' '}
          <span className="results-conclusion-em results-conclusion-em--mint">logic</span> inside it just needs
          to change.
        </p>
      </div>

      {/* Part D — CTA buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '1rem 2rem 4rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleShare}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            position: 'relative',
          }}
        >
          Share this
          {shareMsg && (
            <span
              style={{
                position: 'absolute',
                top: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 11,
                color: '#34d399',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {shareMsg}
            </span>
          )}
        </button>
        <button
          onClick={onNavigateToInfo ?? (() => {})}
          style={{
            padding: '12px 28px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Explore the model
        </button>
      </div>

      {/* Replay */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2rem 3rem' }}>
        <button
          onClick={scrollToTop}
          style={{
            padding: '8px 22px',
            background: 'rgba(255,255,255,0.05)',
            color: '#64748b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          &uarr; Replay
        </button>
      </div>
    </div>
  );
};

export default ResultsStoryScrolly;
