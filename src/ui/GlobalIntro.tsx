import { useState } from 'react';

interface GlobalIntroProps {
  onStart: () => void;
}

const slides = [
  {
    title: 'PUBLIC RESTROOM QUEUE SIMULATION',
    subtitle: 'Test layouts, observe flow, compare outcomes',
    body: 'This simulator lets you explore how restroom design choices change queue behavior in real time.',
  },
  {
    title: 'What To Watch',
    subtitle: 'Use these prompts while exploring',
    body: 'Where do bottlenecks form first? Which fixtures stay underused? Does one group wait longer for the same demand?',
  },
  {
    title: 'Try Multiple Views',
    subtitle: 'Each view answers a different question',
    body: 'Use 2D for clear pathing, 3D for spatial understanding, Batch Analysis for summary metrics, and Results for guided findings.',
  },
  {
    title: 'How To Explore',
    subtitle: 'Quick workflow',
    body: 'Pick a layout, run the simulation, change arrival rate, then compare outcomes across modes.',
  },
];

export function GlobalIntro({ onStart }: GlobalIntroProps) {
  const [index, setIndex] = useState(0);
  const last = index === slides.length - 1;
  const current = slides[index];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'radial-gradient(circle at 20% 20%, #2a2a54 0%, #121226 45%, #0a0a14 100%)',
        color: '#eef2ff',
      }}
    >
      <div
        style={{
          width: 'min(960px, 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(129,140,248,0.25)',
          background: 'rgba(20,20,40,0.78)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          padding: '2.25rem',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '1rem' }}>
          Intro {index + 1} / {slides.length}
        </div>
        <h1 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.2 }}>{current.title}</h1>
        <p style={{ margin: '0.65rem 0 1.2rem', color: '#c7d2fe', fontWeight: 600 }}>{current.subtitle}</p>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6 }}>{current.body}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => setIndex((v) => Math.max(0, v - 1))}
            disabled={index === 0}
            style={{
              padding: '0.7rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.3)',
              background: index === 0 ? 'rgba(30,41,59,0.5)' : 'rgba(30,41,59,0.95)',
              color: index === 0 ? '#64748b' : '#e2e8f0',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          <div style={{ display: 'flex', gap: '0.45rem' }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: i === index ? '#818cf8' : 'rgba(148,163,184,0.45)',
                }}
              />
            ))}
          </div>

          {last ? (
            <button
              onClick={onStart}
              style={{
                padding: '0.72rem 1.2rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Enter Simulation
            </button>
          ) : (
            <button
              onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
              style={{
                padding: '0.72rem 1.2rem',
                borderRadius: '10px',
                border: '1px solid rgba(129,140,248,0.4)',
                background: 'rgba(49,46,129,0.35)',
                color: '#e0e7ff',
                cursor: 'pointer',
              }}
            >
              Next
            </button>
          )}
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={onStart}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
