import React from 'react';
import {
  DEFAULT_CA_CONFIG,
  DEFAULT_SERVICE_TIMES,
  DEFAULT_CHARACTER_FREQUENCIES,
} from '../engine/ca-types';

export function SimulationInfo() {
  const st = DEFAULT_SERVICE_TIMES;
  const cfg = DEFAULT_CA_CONFIG;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0e0e1a 0%, #1a1a2e 50%, #16162a 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2rem',
          margin: '0 0 0.5rem 0',
          background: 'linear-gradient(135deg, #f472b6, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Simulation Info
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>
          Default parameters used in the simulation. These affect wait times and queue behavior.
        </p>

        {/* Bathroom use times */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            How long does each gender use the bathroom?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#f472b6', marginBottom: '0.25rem' }}>Women (stall)</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                {st.female.stallMin}–{st.female.stallMax} seconds per visit
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.25rem' }}>Men (stall)</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                {st.male.stallMin}–{st.male.stallMax} seconds per visit
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.25rem' }}>Men (urinal)</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                {st.male.urinalMin}–{st.male.urinalMax} seconds per visit
              </div>
            </div>
          </div>
        </section>

        {/* Hand wash / sink */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Hand washing (sink time)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#f472b6', marginBottom: '0.25rem' }}>Women</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                Always use sink: {st.female.sinkMin}–{st.female.sinkMax} seconds
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '0.25rem' }}>Men</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                Use sink {(cfg.pMaleUseSink * 100).toFixed(0)}% of the time (skip {(1 - cfg.pMaleUseSink) * 100}% of visits)
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                When they do use sink: {st.male.sinkMin}–{st.male.sinkMax} seconds
              </div>
            </div>
          </div>
        </section>

        {/* Male fixture preference */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Male fixture preference
          </h2>
          <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            Men choose urinal over stall {(cfg.pMaleUrinal * 100).toFixed(0)}% of the time when available.
          </div>
        </section>

        {/* Changing table */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Changing table (diaper station)
          </h2>
          <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            {st.changingTable.min}–{st.changingTable.max} seconds when used. Parents with children may need it (currently disabled in simplified mode).
          </div>
        </section>

        {/* Character types */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Character types
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: '#cbd5e1' }}>
            <div>Regular: {(DEFAULT_CHARACTER_FREQUENCIES.regular * 100).toFixed(0)}%</div>
            <div>Pregnant: {(DEFAULT_CHARACTER_FREQUENCIES.pregnant * 100).toFixed(0)}% (of women)</div>
            <div>Parent with child: {(DEFAULT_CHARACTER_FREQUENCIES.parentWithChild * 100).toFixed(0)}%</div>
            <div>Elderly: {(DEFAULT_CHARACTER_FREQUENCIES.elderly * 100).toFixed(0)}%</div>
            <div>Wheelchair: {(DEFAULT_CHARACTER_FREQUENCIES.wheelchair * 100).toFixed(0)}%</div>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Special types have different time multipliers. Currently simplified mode uses regular only.
          </p>
        </section>

        {/* Other settings */}
        <section style={{
          background: 'rgba(30,30,46,0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Other settings
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.95rem', color: '#cbd5e1' }}>
            <div>Gender mix</div>
            <div>50% women, 50% men</div>
            <div>Arrival rate</div>
            <div>12 people/min (default)</div>
            <div>Warmup</div>
            <div>{cfg.warmupSeconds}s before stats count</div>
          </div>
        </section>
      </div>
    </div>
  );
}
