import React, { useState, useEffect } from 'react';

interface Props {
  visible: boolean;
  reducedMotion?: boolean;
}

const CARDS = [
  {
    emoji: '🟩',
    title: 'Inclusive',
    caption: 'Gender-neutral stalls serve everyone who needs them.',
    zone: 'shared' as const,
    accent: '#34d399',
  },
  {
    emoji: '🔵',
    title: 'Optimized mix (14 stalls, 8 urinals)',
    caption: 'Shared stalls absorb demand spikes; urinals keep throughput high.',
    zone: 'urinals' as const,
    accent: '#60a5fa',
  },
  {
    emoji: '✨',
    title: 'Smaller fairness gap',
    caption: 'Capacity shifts to where it\u2019s needed most.',
    zone: 'all' as const,
    accent: '#a78bfa',
  },
];

const LayoutSpotlight: React.FC<Props> = ({ visible, reducedMotion }) => {
  const [activeCard, setActiveCard] = useState(-1);

  useEffect(() => {
    if (!visible) { setActiveCard(-1); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    CARDS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveCard(i), (i + 1) * (reducedMotion ? 200 : 1000)));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, reducedMotion]);

  const glow = (zone: string) => {
    if (activeCard < 0) return false;
    const active = CARDS[activeCard].zone;
    if (active === 'all') return true;
    if (active === 'shared') return zone === 'shared' || zone === 'sinks';
    return active === zone;
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: reducedMotion ? 'opacity 0.15s' : 'opacity 0.5s, transform 0.5s',
        pointerEvents: visible ? 'auto' : 'none',
        padding: '24px 28px',
        background: 'rgba(15,23,42,0.88)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
        Layout 6 — why it works
      </div>

      <svg viewBox="0 0 320 60" width="100%" style={{ display: 'block', marginBottom: 20 }}>
        <rect x={0} y={0} width={100} height={60} rx={8}
          fill={glow('sinks') ? '#34d399' : '#065f46'}
          opacity={glow('sinks') ? 1 : 0.45}
          style={{ transition: 'fill 0.5s, opacity 0.5s' }} />
        <text x={50} y={35} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>Shared sinks</text>

        <rect x={110} y={0} width={100} height={60} rx={8}
          fill={glow('shared') ? '#34d399' : '#065f46'}
          opacity={glow('shared') ? 1 : 0.45}
          style={{ transition: 'fill 0.5s, opacity 0.5s' }} />
        <text x={160} y={35} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>Shared stalls</text>

        <rect x={220} y={0} width={100} height={60} rx={8}
          fill={glow('urinals') ? '#60a5fa' : '#1e3a5f'}
          opacity={glow('urinals') ? 1 : 0.45}
          style={{ transition: 'fill 0.5s, opacity 0.5s' }} />
        <text x={270} y={35} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>Urinals</text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CARDS.map((card, i) => {
          const shown = activeCard >= i;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                padding: '14px 18px',
                borderRadius: 12,
                background: activeCard === i ? `${card.accent}18` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeCard === i ? card.accent + '55' : 'rgba(255,255,255,0.04)'}`,
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateX(0)' : 'translateX(16px)',
                transition: reducedMotion ? 'opacity 0.15s' : 'opacity 0.4s, transform 0.4s, background 0.4s, border-color 0.4s',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{card.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: card.accent, marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{card.caption}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayoutSpotlight;
