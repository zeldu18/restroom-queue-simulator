import { useEffect } from 'react'
import { useSimStore } from '../state/store'
import Metrics from './Metrics'


export default function RightPanel(){
const { setRunning, initWorker, running, preset, setPreset } = useSimStore()

useEffect(() => {
  // Initialize worker when component mounts
  initWorker()
}, [initWorker])

return (
<div style={{borderLeft:'1px solid #2a2a2a', padding:12, color:'#eee', height:'100%', overflow:'auto'}}>
<h3 style={{marginTop:0}}>Controls</h3>
<div style={{display:'flex', gap:8, marginBottom:16}}>
<button onClick={()=>setRunning(true)} disabled={running}>Run</button>
<button onClick={()=>setRunning(false)} disabled={!running}>Pause</button>
<button onClick={()=>location.reload()}>Reset</button>
</div>

<div style={{marginBottom:16}}>
<h4 style={{margin:'0 0 8px'}}>Layout Preset</h4>
<div style={{display:'flex', gap:8}}>
<button 
  onClick={()=>setPreset('equal')} 
  style={{
    backgroundColor: preset === 'equal' ? '#4CAF50' : '#333',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  }}
>
  Equal Floor Area
</button>
<button 
  onClick={()=>setPreset('more-stalls-women')} 
  style={{
    backgroundColor: preset === 'more-stalls-women' ? '#4CAF50' : '#333',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  }}
>
  More Stalls for Women
</button>
</div>
<p style={{fontSize:'11px', opacity:0.7, margin:'4px 0 0'}}>
  {preset === 'equal' ? '3 stalls, 2 urinals' : '5 stalls, 2 urinals'}
</p>
</div>

<Metrics />
<hr />
<p style={{opacity:0.8, fontSize:'12px'}}>Watch the wait gap change between presets!</p>
</div>
)
}