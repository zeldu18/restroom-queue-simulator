import React from 'react';

interface Props {
  visible: boolean;
  womenTime?: number;
  menTime?: number;
  reducedMotion?: boolean;
}

const WOMEN_RATIOS = [
  { label: 'Enter', ratio: 0.05, color: '#f9a8d4' },
  { label: 'Stall', ratio: 0.50, color: '#f472b6' },
  { label: 'Clothing', ratio: 0.16, color: '#ec4899' },
  { label: 'Handwash', ratio: 0.23, color: '#db2777' },
  { label: 'Exit', ratio: 0.06, color: '#f9a8d4' },
];

const MEN_RATIOS = [
  { label: 'Enter', ratio: 0.10, color: '#93c5fd' },
  { label: 'Urinal', ratio: 0.48, color: '#60a5fa' },
  { label: 'Handwash', ratio: 0.32, color: '#3b82f6' },
  { label: 'Exit', ratio: 0.10, color: '#93c5fd' },
];

const BAR_W = 320;

const Row: React.FC<{
  label: string;
  ratios: typeof WOMEN_RATIOS;
  totalTime: number;
  maxTime: number;
  color: string;
  delay: number;
  visible: boolean;
  reducedMotion?: boolean;
}> = ({ label, ratios, totalTime, maxTime, color, delay, visible, reducedMotion }) => {
  const scale = totalTime / maxTime;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 5 }}>
        {label} — {totalTime}s total
      </div>
      <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'stretch' }}>
        {ratios.map((s, i) => {
          const w = s.ratio * BAR_W * scale;
          return (
            <div
              key={i}
              style={{
                width: visible ? w : 0,
                background: s.color,
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: reducedMotion ? 'none' : `width 0.6s cubic-bezier(.4,0,.2,1) ${delay + i * 0.08}s`,
                whiteSpace: 'nowrap',
              }}
            >
              {w > 38 && <span style={{ fontSize: 9, color: '#000', fontWeight: 600 }}>{s.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StepChain: React.FC<Props> = ({ visible, womenTime = 90, menTime = 42, reducedMotion }) => {
  const maxTime = Math.max(womenTime, menTime);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: reducedMotion ? 'opacity 0.15s' : 'opacity 0.5s, transform 0.5s',
        pointerEvents: visible ? 'auto' : 'none',
        padding: '18px 22px',
        background: 'rgba(15,23,42,0.88)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Average visit-time breakdown
      </div>

      <Row label="Women typical visit" ratios={WOMEN_RATIOS} totalTime={womenTime} maxTime={maxTime} color="#f472b6" delay={0} visible={visible} reducedMotion={reducedMotion} />
      <Row label="Men typical visit" ratios={MEN_RATIOS} totalTime={menTime} maxTime={maxTime} color="#60a5fa" delay={0.3} visible={visible} reducedMotion={reducedMotion} />

      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.6 }}>
        Each bar is one restroom visit. The difference adds up fast.
      </div>
    </div>
  );
};

export default StepChain;
