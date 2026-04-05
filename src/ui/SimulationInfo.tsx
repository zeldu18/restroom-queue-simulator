import React from 'react';
import type { LayoutPreset } from '../engine/ca-types';
import {
  ARTICLE_LAYOUTS,
  DEFAULT_CA_CONFIG,
  DEFAULT_SERVICE_TIMES,
  DEFAULT_CHARACTER_FREQUENCIES,
} from '../engine/ca-types';

const sectionStyle: React.CSSProperties = {
  background: 'rgba(30,30,46,0.8)',
  borderRadius: '16px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  border: '1px solid rgba(99,102,241,0.2)',
};

function formatLayoutFixtures(l: LayoutPreset): string {
  const parts: string[] = [];
  if (l.womenStalls) parts.push(`${l.womenStalls} women's stalls`);
  if (l.menStalls) parts.push(`${l.menStalls} men's stalls`);
  if (l.menUrinals) parts.push(`${l.menUrinals} urinals`);
  if (l.sharedStalls) parts.push(`${l.sharedStalls} shared stalls`);
  if (l.sharedUrinals) parts.push(`${l.sharedUrinals} shared urinals`);
  const sinkBits: string[] = [];
  if (l.womenSinks) sinkBits.push(`${l.womenSinks} women`);
  if (l.menSinks) sinkBits.push(`${l.menSinks} men`);
  if (l.sharedSinks) sinkBits.push(`${l.sharedSinks} shared`);
  if (sinkBits.length) parts.push(`sinks: ${sinkBits.join(', ')}`);
  return parts.join(' · ');
}

export function SimulationInfo() {
  const st = DEFAULT_SERVICE_TIMES;
  const cfg = DEFAULT_CA_CONFIG;
  const area = cfg.areaConfig;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0e0e1a 0%, #1a1a2e 50%, #16162a 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
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
        <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '1rem', lineHeight: 1.6 }}>
          This page documents how the restroom queue model is set up: what it measures, what the defaults are,
          and how to interpret the 2D, 3D, and Results views. Values below come from the engine defaults unless
          you change sliders or layout in the live simulation.
        </p>

        {/* Overview */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            What the model does
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 0.85rem' }}>
            The simulation runs on a <strong style={{ color: '#e2e8f0' }}>grid</strong>. People arrive at an
            entrance, walk to a gender-appropriate or shared queue, wait for a free stall, urinal, or sink, then
            exit. Each person is an <strong style={{ color: '#e2e8f0' }}>agent</strong> with states such as
            walking, queued, in fixture, at sink, and done. Wait times and queue lengths come from that
            process—not from a separate formula layered on top.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: '#cbd5e1' }}>2D View</strong> shows the full queue logic and paths.{' '}
            <strong style={{ color: '#cbd5e1' }}>3D View</strong> uses the same simulation with a spatial
            camera. <strong style={{ color: '#cbd5e1' }}>Results</strong> is a separate, story-driven animation
            that illustrates outcomes; it does not drive the live engine.
          </p>
        </section>

        {/* Time & ticks */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Time, ticks, and warmup
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.7 }}>
            <li>
              The clock advances in <strong style={{ color: '#e2e8f0' }}>{cfg.secondsPerTick}s</strong> steps per
              simulation tick (UI update rate is tied to tick duration in the 2D app).
            </li>
            <li>
              Statistics for average waits usually ignore the first{' '}
              <strong style={{ color: '#e2e8f0' }}>{cfg.warmupSeconds}s</strong> of simulated time so the system
              can reach a steadier queue before measurements count.
            </li>
            <li>
              Arrivals are modeled as a <strong style={{ color: '#e2e8f0' }}>rate</strong> (people per minute),
              not a fixed crowd size; busier settings mean longer lines when capacity is fixed.
            </li>
          </ul>
        </section>

        {/* Metrics */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Metrics you see in the UI
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.65 }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#f472b6' }}>Women&apos;s average wait</strong> and{' '}
              <strong style={{ color: '#60a5fa' }}>men&apos;s average wait</strong> are rolling averages of time
              spent waiting (in queue or walking to a fixture when that counts as delay), typically shown after
              warmup.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#e2e8f0' }}>Gap</strong> is the difference between those averages (women
              minus men). A positive gap means women wait longer on average under the current layout and demand.
            </p>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
              Exact definitions can vary slightly by code path; use the same layout and arrival settings when
              comparing runs.
            </p>
          </div>
        </section>

        {/* Layout presets */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Layout presets (same names as the selector)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.55 }}>
            Each preset places a different mix of stalls, urinals, and sinks on the grid. Area ratio labels are a
            guide to how floor space is split or marked as shared.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ARTICLE_LAYOUTS.map((layout) => (
              <div
                key={layout.id}
                style={{
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(99,102,241,0.15)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: '0.35rem' }}>{layout.name}</div>
                <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  {layout.description}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  <span style={{ color: '#64748b' }}>Area label:</span> {layout.areaRatio}
                  <br />
                  <span style={{ color: '#64748b' }}>Fixtures:</span> {formatLayoutFixtures(layout)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bathroom use times */}
        <section style={sectionStyle}>
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
          <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: 0 }}>
            Service times are sampled from these ranges each visit. Longer stall times on the women&apos;s side are a
            major reason queues diverge when stall counts are symmetric.
          </p>
        </section>

        {/* Hand wash / sink */}
        <section style={sectionStyle}>
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
                Use sink {(cfg.pMaleUseSink * 100).toFixed(0)}% of the time (skip {((1 - cfg.pMaleUseSink) * 100).toFixed(0)}% of visits)
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                When they do use sink: {st.male.sinkMin}–{st.male.sinkMax} seconds
              </div>
            </div>
          </div>
        </section>

        {/* Male fixture preference */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Male fixture preference
          </h2>
          <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            Men choose urinal over stall {(cfg.pMaleUrinal * 100).toFixed(0)}% of the time when available.
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8', marginBottom: 0, lineHeight: 1.55 }}>
            That increases effective throughput on the men&apos;s side when urinals exist, which is why equal floor
            area does not imply equal waits.
          </p>
        </section>

        {/* Changing table */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Changing table (diaper station)
          </h2>
          <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            {st.changingTable.min}–{st.changingTable.max} seconds when used. Parents with children may need it (currently disabled in simplified mode).
          </div>
        </section>

        {/* Character types */}
        <section style={sectionStyle}>
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

        {/* Engine geometry & determinism */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Grid, area model, and random seed
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr)', gap: '0.65rem 1rem', fontSize: '0.95rem', color: '#cbd5e1', alignItems: 'start' }}>
            <div style={{ color: '#94a3b8' }}>Grid size</div>
            <div>{cfg.gridCols} × {cfg.gridRows} cells</div>
            <div style={{ color: '#94a3b8' }}>Cell size (2D)</div>
            <div>{cfg.cellSize}px (visual)</div>
            <div style={{ color: '#94a3b8' }}>Default arrival rate</div>
            <div>{cfg.arrivalRatePerMin} people / minute</div>
            <div style={{ color: '#94a3b8' }}>Gender mix</div>
            <div>{(cfg.genderMix.female * 100).toFixed(0)}% women, {(cfg.genderMix.male * 100).toFixed(0)}% men</div>
            <div style={{ color: '#94a3b8' }}>Floor split (area model)</div>
            <div>
              {area.womenSectionPercent}% women / {area.menSectionPercent}% men / {area.sharedSectionPercent}% shared (used for layout budgeting)
            </div>
            <div style={{ color: '#94a3b8' }}>Random seed</div>
            <div>{cfg.seed} — same seed and settings yield the same sequence of random draws (useful for reproducible comparisons).</div>
          </div>
        </section>

        {/* Other settings - condensed */}
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            Other defaults (summary)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.95rem', color: '#cbd5e1' }}>
            <div>Warmup</div>
            <div>{cfg.warmupSeconds}s before stats emphasize steady state</div>
            <div>Simulation tick</div>
            <div>{cfg.secondsPerTick}s simulated per tick</div>
          </div>
        </section>

        {/* Limitations */}
        <section style={{ ...sectionStyle, marginBottom: '2.5rem', borderColor: 'rgba(148,163,184,0.25)' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>
            What this model doesn&apos;t include
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.7 }}>
            <li>Real building codes, ADA clearances, and multi-room floor plans.</li>
            <li>Cleaning cycles, broken fixtures, or staff-only closures.</li>
            <li>Events where arrival rate or gender mix swings far from the defaults.</li>
            <li>Full demographic diversity (special character types are present in config but disabled in simplified runs).</li>
          </ul>
          <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            Use the results as directional insight—how queueing and fixture mix interact—not as a substitute for
            architectural or code review.
          </p>
        </section>
      </div>
    </div>
  );
}
