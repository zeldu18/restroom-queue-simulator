// Introduction Page Component
import { useState } from 'react';

interface IntroPageProps {
  onStart: () => void;
}

export function IntroPage({ onStart }: IntroPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "The Bathroom Equity Gap",
      subtitle: "Why do women always wait longer?",
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚺 ⏱️ 🚹</div>
          <p style={{ fontSize: '1.3rem', color: '#a5b4fc', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Studies show women wait <strong style={{ color: '#f472b6' }}>2-3x longer</strong> than men 
            to use public restrooms. This isn't just inconvenient—it's a design failure.
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '3rem',
            marginTop: '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#f472b6' }}>89s</div>
              <div style={{ color: '#9ca3af' }}>Avg. Women's Wait</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#60a5fa' }}>39s</div>
              <div style={{ color: '#9ca3af' }}>Avg. Men's Wait</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Why The Difference?",
      subtitle: "Biology, not behavior",
      content: (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1.5rem',
            marginTop: '1rem'
          }}>
            {[
              { icon: '🚽', title: 'Biological Need', desc: 'Women must sit for all functions', time: '+30-60s' },
              { icon: '👗', title: 'Clothing', desc: 'More layers, complex fasteners', time: '+15-30s' },
              { icon: '👶', title: 'Childcare', desc: 'Often accompanying children', time: '+60-180s' },
              { icon: '🩸', title: 'Menstrual Care', desc: 'Managing menstrual products', time: '+30-60s' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(99,102,241,0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(99,102,241,0.2)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>{item.desc}</div>
                <div style={{ 
                  color: '#f472b6', 
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Equal Space ≠ Equal Experience",
      subtitle: "The 50-50 fallacy",
      content: (
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '2rem', 
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '2px solid rgba(239,68,68,0.3)',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              minWidth: '200px'
            }}>
              <div style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem' }}>❌ EQUALITY</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0' }}>50% / 50%</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem' }}>Same space allocation</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '2rem' }}>→</div>
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '2px solid rgba(16,185,129,0.3)',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              minWidth: '200px'
            }}>
              <div style={{ fontSize: '1rem', color: '#10b981', marginBottom: '0.5rem' }}>✅ EQUITY</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0' }}>68% / 32%</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem' }}>Fair wait times</div>
            </div>
          </div>
          <p style={{ color: '#a5b4fc', fontSize: '1.1rem' }}>
            When we give equal space to people with unequal needs, we create unequal outcomes.
          </p>
        </div>
      )
    },
    {
      title: "How To Use This Simulator",
      subtitle: "Explore different layouts and see the impact",
      content: (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {[
              { step: '1', title: 'Choose a Layout', desc: 'Select from 6 different bathroom configurations—from traditional 50-50 to gender-neutral designs' },
              { step: '2', title: 'Watch the Simulation', desc: 'See people arrive, queue, and use facilities in real-time. Pink dots are women, blue are men.' },
              { step: '3', title: 'Compare Wait Times', desc: 'Track average wait times by gender and see how different layouts affect equity' },
              { step: '4', title: 'Run Batch Analysis', desc: 'Compare all layouts at once to find the most equitable design' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                background: 'rgba(99,102,241,0.05)',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                border: '1px solid rgba(99,102,241,0.1)'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0
                }}>{item.step}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  const currentSlideData = slides[currentSlide];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0e0e1a 0%, #1a1a2e 50%, #16162a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Logo/Title */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 700, 
          margin: 0,
          background: 'linear-gradient(135deg, #f472b6, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🚻 Wait Gap Simulator
        </h1>
        <p style={{ 
          color: '#9ca3af', 
          margin: '0.5rem 0 0',
          fontSize: '1.1rem'
        }}>
          Visualizing bathroom equity through simulation
        </p>
      </div>

      {/* Slide Content */}
      <div style={{
        background: 'rgba(30,30,46,0.8)',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '900px',
        width: '100%',
        border: '1px solid rgba(99,102,241,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        minHeight: '450px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '1.8rem', 
            fontWeight: 700, 
            margin: 0,
            color: '#fff'
          }}>
            {currentSlideData.title}
          </h2>
          <p style={{ 
            color: '#a5b4fc', 
            margin: '0.5rem 0 0',
            fontSize: '1.1rem'
          }}>
            {currentSlideData.subtitle}
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {currentSlideData.content}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        marginTop: '2rem'
      }}>
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          style={{
            padding: '0.75rem 1.5rem',
            background: currentSlide === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            color: currentSlide === 0 ? '#6b7280' : '#e2e8f0',
            cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          ← Previous
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                background: i === currentSlide 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                  : 'rgba(99,102,241,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>

        {currentSlide < slides.length - 1 ? (
          <button
            onClick={() => setCurrentSlide(currentSlide + 1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(99,102,241,0.3)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onStart}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s'
            }}
          >
            Start Simulator →
          </button>
        )}
      </div>

      {/* Skip button */}
      <button
        onClick={onStart}
        style={{
          marginTop: '1.5rem',
          padding: '0.5rem 1rem',
          background: 'transparent',
          border: 'none',
          color: '#6b7280',
          cursor: 'pointer',
          fontSize: '0.9rem',
          textDecoration: 'underline'
        }}
      >
        Skip intro
      </button>
    </div>
  );
}

