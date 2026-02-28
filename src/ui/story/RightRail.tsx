import React, { useEffect, useRef, useState } from 'react';
import type { SnapshotMetrics, Assumptions } from './resultsStoryData';

interface Props {
  visible: boolean;
  activeLayout: string;
  metrics: SnapshotMetrics;
  assumptions: Assumptions;
  highlightAssumptions?: boolean;
  reducedMotion?: boolean;
}

const LAYOUTS: { id: string; label: string }[] = [
  { id: 'layout1', label: '50:50 split' },
  { id: 'layout3', label: 'More women stalls' },
  { id: 'layout6', label: 'Shared stalls + urinals' },
];

function useAnimatedNumber(target: number, duration: number, enabled: boolean): number {
  const [current, setCurrent] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (!enabled) { setCurrent(target); prevRef.current = target; return; }
    const from = prevRef.current;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setCurrent(from + (target - from) * ease);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prevRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return current;
}

const RightRail: React.FC<Props> = ({ visible, activeLayout, metrics, assumptions, highlightAssumptions, reducedMotion }) => {
  const animated = !reducedMotion;
  const wWait = useAnimatedNumber(metrics.womenAvgWait, 600, animated);
  const mWait = useAnimatedNumber(metrics.menAvgWait, 600, animated);
  const gap = useAnimatedNumber(metrics.gap, 600, animated);

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14, width: 170,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s',
    }}>
      {/* Layout pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LAYOUTS.map((l) => {
          const active = l.id === activeLayout;
          return (
            <div
              key={l.id}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: active ? 700 : 400,
                color: active ? '#fff' : '#94a3b8',
                background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: active ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.4s',
                position: 'relative',
              }}
            >
              {l.label}
              {active && l.id === 'layout6' && (
                <span style={{ fontSize: 8, position: 'absolute', right: 8, top: 4, color: '#34d399', fontWeight: 700 }}>best</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Assumptions */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: highlightAssumptions ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
          border: highlightAssumptions ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.5s',
          fontSize: 10,
          color: '#94a3b8',
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 600, color: '#cbd5e1', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assumptions</div>
        <div>Women avg service: {assumptions.womenServiceAvg}s</div>
        <div>Men avg service: {assumptions.menServiceAvg}s</div>
        <div>Demand mix: {assumptions.demandMix}</div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <StatChip label="Avg wait (W)" value={`${wWait.toFixed(1)}s`} color="#f472b6" />
        <StatChip label="Avg wait (M)" value={`${mWait.toFixed(1)}s`} color="#60a5fa" />
        <StatChip label="Gap" value={`${gap.toFixed(1)}s`} color={gap > 20 ? '#f87171' : '#34d399'} />
        {metrics.servedByMinute5 != null && (
          <div style={{ fontSize: 9, color: '#64748b', marginTop: -2, textAlign: 'center' }}>
            By minute 5: {metrics.servedByMinute5} finished
          </div>
        )}
      </div>
    </div>
  );
};

const StatChip: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

export default RightRail;
