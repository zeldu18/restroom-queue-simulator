import { useSimStore } from '../state/store'

export default function Metrics(){
const { agents, layout, preset } = useSimStore()

// Calculate basic metrics
const totalAgents = agents.length
const arriving = agents.filter(a => a.state === 'arriving').length
const queueing = agents.filter(a => a.state === 'queueing').length
const occupying = agents.filter(a => a.state === 'occupying').length
const washing = agents.filter(a => a.state === 'washing').length
const exiting = agents.filter(a => a.state === 'exiting').length

const femaleAgents = agents.filter(a => a.gender === 'female').length
const maleAgents = agents.filter(a => a.gender === 'male').length

// Calculate queue metrics by gender
const femaleQueueing = agents.filter(a => a.gender === 'female' && a.state === 'queueing').length
const maleQueueing = agents.filter(a => a.gender === 'male' && a.state === 'queueing').length

// Calculate fixture counts
const stalls = layout.fixtures.filter(f => f.kind === 'stall').length
const urinals = layout.fixtures.filter(f => f.kind === 'urinal').length
const sinks = layout.fixtures.filter(f => f.kind === 'sink').length

// Calculate dwell time metrics
const occupyingAgents = agents.filter(a => a.state === 'occupying')
const avgDwellTime = occupyingAgents.length > 0 
  ? occupyingAgents.reduce((sum, a) => sum + (a.dwellTimeRemaining || 0), 0) / occupyingAgents.length / 1000
  : 0

// Calculate wait gap (simplified)
const femaleWaitRatio = femaleQueueing / Math.max(femaleAgents, 1)
const maleWaitRatio = maleQueueing / Math.max(maleAgents, 1)
const waitGap = Math.abs(femaleWaitRatio - maleWaitRatio)

return (
<div style={{marginTop:12, color: '#ffffff'}}>
<h4 style={{margin:'12px 0 8px', color: '#ffffff'}}>Live Metrics</h4>
<div style={{fontSize:'12px', lineHeight:'1.4', color: '#ffffff'}}>
  <div><strong>Total Agents:</strong> {totalAgents}</div>
  <div><strong>Female:</strong> {femaleAgents} | <strong>Male:</strong> {maleAgents}</div>
  
  <hr style={{margin:'8px 0', border:'none', borderTop:'1px solid #444'}} />
  
  <div><strong>States:</strong></div>
  <div>• Arriving: {arriving}</div>
  <div>• Queueing: {queueing}</div>
  <div>• Occupying: {occupying}</div>
  <div>• Washing: {washing}</div>
  <div>• Exiting: {exiting}</div>
  
  {occupying > 0 && (
    <div style={{marginTop: '4px', fontSize: '11px', opacity: 0.8}}>
      • Avg dwell time: {avgDwellTime.toFixed(1)}s
    </div>
  )}
  
  <hr style={{margin:'8px 0', border:'none', borderTop:'1px solid #444'}} />
  
  <div><strong>Queue by Gender:</strong></div>
  <div style={{color: femaleQueueing > maleQueueing ? '#ff69b4' : '#87ceeb'}}>
    • Female queueing: {femaleQueueing}
  </div>
  <div style={{color: maleQueueing > femaleQueueing ? '#87ceeb' : '#ff69b4'}}>
    • Male queueing: {maleQueueing}
  </div>
  
  <hr style={{margin:'8px 0', border:'none', borderTop:'1px solid #444'}} />
  
  <div><strong>Facilities:</strong></div>
  <div>• Stalls: {stalls}</div>
  <div>• Urinals: {urinals}</div>
  <div>• Sinks: {sinks}</div>
  
  <hr style={{margin:'8px 0', border:'none', borderTop:'1px solid #444'}} />
  
  <div><strong>Wait Gap:</strong></div>
  <div style={{
    color: waitGap > 0.2 ? '#ff4444' : waitGap > 0.1 ? '#ffaa00' : '#44ff44',
    fontWeight: 'bold'
  }}>
    {waitGap.toFixed(2)}
  </div>
  <div style={{fontSize:'10px', opacity:0.7}}>
    {waitGap > 0.2 ? 'High inequality' : waitGap > 0.1 ? 'Moderate gap' : 'Fair access'}
  </div>
</div>
</div>
)
}