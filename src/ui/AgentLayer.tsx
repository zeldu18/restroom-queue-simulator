import React from 'react'

export function AgentLayer({ agents, tile = 24 }: { agents: any[]; tile?: number }) {
  return (
    <svg className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      {agents.map((a: any) => (
        <circle
          key={a.aid ?? a.id}
          cx={a.ry !== undefined ? a.rx * tile + tile / 2 : 0}
          cy={a.ry !== undefined ? a.ry * tile + tile / 2 : 0}
          r={tile * 0.35}
          fill={a.gender === 'F' || a.gender === 'female' ? '#e91e63' : '#2196f3'}
          opacity={a.state === 'WASHING' || a.state === 'washing' ? 0.6 : 0.9}
        />
      ))}
    </svg>
  )
}









