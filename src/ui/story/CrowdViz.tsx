import React, { useMemo } from 'react';
import type { Person, Position } from './resultsStoryData';
import { SVG_W, SVG_H } from './resultsStoryData';

interface Props {
  people: Person[];
  positions: Record<number, Position>;
  longWaitIds: number[];
  dimmed?: boolean;
  introMode?: boolean;
  queueLabel?: string;
  reducedMotion?: boolean;
}

const R = 9;
const R_FINISHED = 7;

const GROUP_COLOR: Record<string, string> = { women: '#f472b6', men: '#60a5fa' };

const CrowdViz: React.FC<Props> = ({ people, positions, longWaitIds, dimmed, introMode, queueLabel, reducedMotion }) => {
  const longSet = useMemo(() => new Set(longWaitIds), [longWaitIds]);
  const dur = reducedMotion ? '0s' : '0.7s';

  const introPositions = useMemo(() => {
    const p: Record<number, Position> = {};
    const cols = 10;
    const spacing = 28;
    const gridW = cols * spacing;
    const gridH = cols * spacing;
    const startX = (SVG_W - gridW) / 2 + spacing / 2;
    const startY = (SVG_H - gridH) / 2 + spacing / 2;
    people.forEach((person, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      p[person.id] = { x: startX + col * spacing, y: startY + row * spacing, zone: 'arrive' };
    });
    return p;
  }, [people]);

  const activePositions = introMode ? introPositions : positions;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        opacity: dimmed ? 0.3 : 1,
        transition: `opacity ${dur}`,
      }}
    >
      {!introMode && (
        <>
          <text x={80} y={92} textAnchor="middle" fill="#f472b6" fontSize={10} fontWeight={600} opacity={0.6}>Women queue</text>
          <text x={SVG_W - 80} y={92} textAnchor="middle" fill="#60a5fa" fontSize={10} fontWeight={600} opacity={0.6}>Men queue</text>
          <line x1={SVG_W / 2} y1={98} x2={SVG_W / 2} y2={295} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <text x={SVG_W / 2} y={8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9} dominantBaseline="hanging">arriving</text>
          <text x={SVG_W / 2} y={298} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9}>finished</text>
          {queueLabel && (
            <text x={80} y={80} textAnchor="middle" fill="#fbbf24" fontSize={10} fontWeight={700} opacity={0.9}>{queueLabel}</text>
          )}
        </>
      )}

      {people.map((p) => {
        const pos = activePositions[p.id];
        if (!pos) return null;
        const isLong = longSet.has(p.id);
        const isFinished = pos.zone === 'finished';
        const r = isFinished ? R_FINISHED : R;

        return (
          <circle
            key={p.id}
            cx={pos.x}
            cy={pos.y}
            r={r}
            fill={GROUP_COLOR[p.group]}
            opacity={1}
            stroke={isLong ? '#fbbf24' : isFinished ? 'rgba(255,255,255,0.35)' : 'none'}
            strokeWidth={isLong ? 2.5 : isFinished ? 1.5 : 0}
            style={{ transition: `cx ${dur}, cy ${dur}, r ${dur} ease` }}
          />
        );
      })}
    </svg>
  );
};

export default CrowdViz;
