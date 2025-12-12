import React, { useState, useEffect, lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

// Always load 2D app immediately
import AppCA from './App-CA'
import { ResultsInsights } from './ui/ResultsInsights'

// Lazy load 3D app only when needed (heavy Three.js dependencies)
const App3D = lazy(() => import('./App-3D'))

function LoadingScreen() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      color: 'white',
      fontSize: '1.5rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem' }}>🏗️ Loading 3D View...</div>
        <div style={{ fontSize: '0.9rem', color: '#a0aec0' }}>
          First load may take a moment
        </div>
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<'2d' | '3d' | 'results'>(() => {
    const params = new URLSearchParams(window.location.search)
    const urlMode = params.get('mode')
    if (urlMode === '3d') return '3d'
    if (urlMode === 'results') return 'results'
    const stored = localStorage.getItem('simMode')
    // Default to 2d to avoid loading 3D on first visit
    if (stored === '3d') return '3d'
    if (stored === 'results') return 'results'
    return '2d'
  })

  useEffect(() => {
    localStorage.setItem('simMode', mode)
  }, [mode])

  return (
    <>
      {/* Mode toggle button */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => setMode('2d')}
          style={{
            padding: '10px 20px',
            background: mode === '2d' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: mode === '2d' ? '2px solid #34d399' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: mode === '2d' ? 700 : 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === '2d' ? '0 4px 15px rgba(16,185,129,0.4)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          🎮 2D View
        </button>
        <button
          onClick={() => setMode('3d')}
          style={{
            padding: '10px 20px',
            background: mode === '3d' 
              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: mode === '3d' ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: mode === '3d' ? 700 : 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === '3d' ? '0 4px 15px rgba(139,92,246,0.4)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          🏗️ 3D View
        </button>
        <button
          onClick={() => setMode('results')}
          style={{
            padding: '10px 20px',
            background: mode === 'results' 
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: mode === 'results' ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: mode === 'results' ? 700 : 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === 'results' ? '0 4px 15px rgba(245,158,11,0.4)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          📊 Results
        </button>
      </div>

      {mode === '2d' && <AppCA />}
      {mode === '3d' && (
        <Suspense fallback={<LoadingScreen />}>
          <App3D />
        </Suspense>
      )}
      {mode === 'results' && (
        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          paddingTop: '4rem'
        }}>
          <ResultsInsights />
        </div>
      )}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
