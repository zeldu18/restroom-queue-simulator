import { create } from 'zustand'
import type { Agent, Layout, SimParams } from '../engine/types'
import baseParams from '../presets/parameters.json'
import equalLayout from '../presets/layouts/equal.json'
import moreStallsLayout from '../presets/layouts/more-stalls-women.json'


interface SimState {
width: number
height: number
layout: Layout
params: SimParams
agents: Agent[]
running: boolean
worker: Worker | null
preset: 'equal' | 'more-stalls-women'
setRunning: (v:boolean)=>void
setPreset: (preset: 'equal' | 'more-stalls-women')=>void
initWorker: ()=>void
}


function generateInitialAgents(count:number, width:number, height:number): Agent[] {
 return Array.from({ length: count }).map((_, i) => ({
 id: i,
 gender: Math.random()<0.5 ? 'female' : 'male',
 pos: { x: Math.random()*width, y: Math.random()*height },
 state: 'arriving',
 }))
}

export const useSimStore = create<SimState>((set: (next: Partial<SimState>)=>void, get)=>({
 width: 1200,
 height: 800,
 layout: equalLayout as unknown as Layout,
 params: baseParams as unknown as SimParams,
 agents: generateInitialAgents(6, 1200, 800),
 running: false,
 worker: null,
 preset: 'equal',
 setRunning: (v: boolean)=>{
   const state = get()
   set({running: v})
   if (state.worker) {
     state.worker.postMessage({ type: v ? 'start' : 'stop' })
   }
 },
 setPreset: (preset: 'equal' | 'more-stalls-women')=>{
   const layout = (preset === 'equal' ? equalLayout : moreStallsLayout) as Layout
   set({ preset, layout })
   // Reinitialize worker with new layout
   const state = get()
   if (state.worker) {
     state.worker.postMessage({
       type: 'init',
       params: state.params,
       layout: layout,
       seed: 1234
     })
   }
 },
 initWorker: ()=>{
   const state = get()
   if (state.worker) {
     state.worker.terminate()
   }
   
   const worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' })
   
   // Initialize worker with params and layout
   worker.postMessage({
     type: 'init',
     params: state.params,
     layout: state.layout,
     seed: 1234
   })
   
   // Listen for state updates
   worker.onmessage = (ev) => {
     if (ev.data.type === 'state') {
       set({ agents: ev.data.agents })
     }
   }
   
   // Start the simulation loop
  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    const dt = now - last // milliseconds
    last = now
    worker.postMessage({ type: 'tick', dt })
    requestAnimationFrame(tick)
  }
  tick()
   
    // Save worker and auto-start simulation
    set({ worker, running: true })
    worker.postMessage({ type: 'start' })
 },
}))