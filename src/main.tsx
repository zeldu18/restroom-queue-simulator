import React, { useState, useEffect, lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

// Always load 2D app immediately
import AppCA from './App-CA'
// import { ResultsInsights } from './ui/ResultsInsights'
// import BatchAnalysis from './ui/BatchAnalysis'
import ResultsStoryScrolly from './ui/ResultsStoryScrolly'
import { GlobalIntro } from './ui/GlobalIntro'
import { SimulationInfo } from './ui/SimulationInfo'

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
  const [showIntro, setShowIntro] = useState(true)
  const [mode, setMode] = useState<'2d' | '3d' | /* 'batch' | */ 'results' | 'info'>(() => {
    const params = new URLSearchParams(window.location.search)
    const urlMode = params.get('mode')
    if (urlMode === '3d') return '3d'
    // if (urlMode === 'batch') return 'batch'
    if (urlMode === 'results') return 'results'
    if (urlMode === 'info') return 'info'
    const stored = localStorage.getItem('simMode')
    if (stored === '3d') return '3d'
    // if (stored === 'batch') return 'batch'
    if (stored === 'results') return 'results'
    if (stored === 'info') return 'info'
    return '2d'
  })

  useEffect(() => {
    localStorage.setItem('simMode', mode)
  }, [mode])

  const handleIntroDone = () => {
    localStorage.setItem('introSeen', '1')
    setShowIntro(false)
    setMode('3d')
  }

  if (showIntro) {
    return <GlobalIntro onStart={handleIntroDone} />
  }

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
          onClick={() => setShowIntro(true)}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s'
          }}
        >
          Intro
        </button>
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
          2D View
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
          3D View
        </button>
        {/* Batch Analysis button hidden — code preserved
        <button
          onClick={() => setMode('batch')}
          style={{
            padding: '10px 20px',
            background: mode === 'batch'
              ? 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)'
              : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: mode === 'batch' ? '2px solid #38bdf8' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: mode === 'batch' ? 700 : 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === 'batch' ? '0 4px 15px rgba(14,165,233,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Batch Analysis
        </button>
        */}
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
          Results
        </button>
        <button
          onClick={() => setMode('info')}
          style={{
            padding: '10px 20px',
            background: mode === 'info' ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: mode === 'info' ? '2px solid #94a3b8' : '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: mode === 'info' ? 700 : 400,
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s'
          }}
        >
          Simulation Info
        </button>
      </div>

      {mode === '2d' && <AppCA />}
      {mode === '3d' && (
        <Suspense fallback={<LoadingScreen />}>
          <App3D />
        </Suspense>
      )}
      {/* Batch Analysis hidden — code preserved
      {mode === 'batch' && (
        <div style={{ minHeight: '100vh', background: '#0e0e0e', paddingTop: '4rem' }}>
          <BatchAnalysis />
        </div>
      )}
      */}
      {mode === 'results' && (
        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #0f172a, #111827)',
          paddingTop: '4rem'
        }}>
          <ResultsStoryScrolly onNavigateToInfo={() => setMode('info')} />
        </div>
      )}
      {mode === 'info' && (
        <div style={{ paddingTop: '4rem' }}>
          <SimulationInfo />
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
