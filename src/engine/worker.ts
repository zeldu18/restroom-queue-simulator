import type { Agent, Fixture, Gender, SimParams, Layout, Grid, GridCell, CellType } from './types'

// Simple PathFinder stub for legacy worker
class PathFinder {
  private grid: Grid | null = null;
  
  initFromGrid(grid: Grid) {
    this.grid = grid;
  }
  
  async findPath(sx: number, sy: number, tx: number, ty: number): Promise<Array<{x: number, y: number}>> {
    // Simple straight-line path for legacy compatibility
    const path: Array<{x: number, y: number}> = [];
    let x = sx, y = sy;
    while (x !== tx || y !== ty) {
      if (x < tx) x++;
      else if (x > tx) x--;
      if (y < ty) y++;
      else if (y > ty) y--;
      path.push({ x, y });
    }
    return path;
  }
}

// Worker state
let params: SimParams
let fixtures: Fixture[] = []
let agents: Agent[] = []
let t = 0
let running = false
const pf = new PathFinder()
let gridSizePx = 20

function toGrid(v:number) { return Math.max(0, Math.floor(v / gridSizePx)) }
function centerPxFromGrid(x:number) { return x * gridSizePx + gridSizePx / 2 }

function requestPathForAgent(agentId: number, txPx: number, tyPx: number, kind: 'STALL'|'SINK'|'EXIT') {
  const agent = agents.find(a => a.id === agentId)
  if (!agent) return
  const sx = toGrid(agent.pos.x)
  const sy = toGrid(agent.pos.y)
  const tx = toGrid(txPx)
  const ty = toGrid(tyPx)
  ;(pf.findPath as any)(sx, sy, tx, ty).then((path: Array<{x:number,y:number}>) => {
    const ag = agents.find(a => a.id === agentId)
    if (!ag) return
    ag.path = path
    ag.pathStep = 0
    ag.target = { x: tx, y: ty, kind }
    ag.state = 'going' as any
    ag.rx = sx; ag.ry = sy; ag.x = sx; ag.y = sy
    ag.speed = ag.speed ?? 4
  })
}

// Fixture state tracking
interface FixtureState {
  occupiedBy: number | null
  queue: number[]
  dwellTimeRemaining: number
}

const fixtureStates = new Map<string, FixtureState>()

// Message types
type InitMsg = { type: 'init', params: SimParams, layout: Layout }
type TickMsg = { type: 'tick', dt: number }
type ControlMsg = { type: 'start' | 'stop' | 'reset' }

// Random number generator
function rand(): number {
  return Math.random()
}

// Generate dwell time based on distribution
function generateDwellTime(gender: 'female' | 'male'): number {
  const dist = params.dwell[gender]
  switch (dist.name) {
    case 'lognormal':
      // Box-Muller transform for lognormal
      const u1 = rand()
      const u2 = rand()
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      // Very reduced dwell time for active simulation
      return Math.exp(dist.params.mu + dist.params.sigma * z0) * 0.5
      
    case 'exponential':
      return -Math.log(rand()) / dist.params.rate * 0.5
      
    case 'normal':
      const u3 = rand()
      const u4 = rand()
      const z1 = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4)
      return Math.max(0, dist.params.mean + dist.params.std * z1) * 0.5
      
    case 'fixed':
      return dist.params.value * 0.5
      
    default:
      return 100 // 0.1 seconds default
  }
}

function addToQueue(fixtureId: string, agentId: number) {
  const state = fixtureStates.get(fixtureId)
  if (state && !state.queue.includes(agentId)) {
    state.queue.push(agentId)
  }
}

function removeFromQueue(fixtureId: string, agentId: number) {
  const state = fixtureStates.get(fixtureId)
  if (state) {
    state.queue = state.queue.filter(id => id !== agentId)
  }
}

function findBestFixture(agent: Agent): Fixture | null {
  const availableFixtures = fixtures.filter(f => {
    if (f.kind === 'stall') return true
    if (f.kind === 'urinal') return agent.gender === 'male'
    return false
  })

  if (availableFixtures.length === 0) return null

  // Find fixture with shortest queue
  let bestFixture = availableFixtures[0]
  let shortestQueue = fixtureStates.get(bestFixture.id)?.queue.length || 0

  for (const fixture of availableFixtures) {
    const queueLength = fixtureStates.get(fixture.id)?.queue.length || 0
    if (queueLength < shortestQueue) {
      bestFixture = fixture
      shortestQueue = queueLength
    }
  }

  return bestFixture
}

function updateAgent(agent: Agent, dt: number): Agent {
  switch (agent.state) {
    case 'going' as any: {
      // Path-based movement in grid space with interpolation on rx/ry
      if (!agent.path || agent.pathStep === undefined || agent.pathStep >= agent.path.length) {
        return agent
      }
      if (agent.rx === undefined || agent.ry === undefined) {
        agent.rx = agent.x ?? toGrid(agent.pos.x)
        agent.ry = agent.y ?? toGrid(agent.pos.y)
      }
      const goal = agent.path[agent.pathStep]
      const dx = goal.x - (agent.rx as number)
      const dy = goal.y - (agent.ry as number)
      const dist = Math.hypot(dx, dy)
      const speed = (agent.speed ?? 4) * (dt / 1000) // tiles per second, dt ms
      if (dist <= speed) {
        agent.rx = goal.x; agent.ry = goal.y
        agent.x = goal.x; agent.y = goal.y
        agent.pathStep! += 1
        if (agent.pathStep! >= agent.path.length) {
          // Arrived at target
          if (agent.target?.kind === 'STALL') {
            // Enter occupying just like previous logic
            const targetFixture = agent.targetFixture
            if (targetFixture) {
              const fs = fixtureStates.get(targetFixture.id)
              if (fs) {
                fs.occupiedBy = agent.id
                const dwellTime = generateDwellTime(agent.gender as 'female' | 'male')
                fs.dwellTimeRemaining = dwellTime
                return { ...agent, state: 'occupying', dwellTimeRemaining: dwellTime, pos: { x: centerPxFromGrid(agent.x!), y: centerPxFromGrid(agent.y!) } }
              }
            }
            return { ...agent, state: 'occupying', pos: { x: centerPxFromGrid(agent.x!), y: centerPxFromGrid(agent.y!) } }
          } else if (agent.target?.kind === 'SINK') {
            return { ...agent, state: 'washing' }
          } else if (agent.target?.kind === 'EXIT') {
            return { ...agent, state: 'exiting' }
          }
        }
      } else {
        agent.rx += (dx / dist) * speed
        agent.ry += (dy / dist) * speed
      }
      // Also keep pixel pos in sync for legacy renderer
      return { ...agent, pos: { x: centerPxFromGrid(agent.rx!), y: centerPxFromGrid(agent.ry!) } }
    }
    case 'arriving':
      const door = fixtures.find(f => f.kind === 'door')
      if (!door) return agent

      const doorX = door.x + door.w / 2
      const doorY = door.y + door.h / 2
      const dx = doorX - agent.pos.x
      const dy = doorY - agent.pos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 15) {
        console.log(`Agent ${agent.id} reached door, moving to queueing`)
        return { ...agent, state: 'queueing', targetFixture: null }
      } else {
        const moveSpeed = 8
        const moveX = (dx / distance) * moveSpeed
        const moveY = (dy / distance) * moveSpeed
        return { ...agent, pos: { x: agent.pos.x + moveX, y: agent.pos.y + moveY } }
      }

    case 'queueing':
      if (!agent.targetFixture) {
        const bestFixture = findBestFixture(agent)
        if (bestFixture) {
          console.log(`Agent ${agent.id} (${agent.gender}) assigned to fixture ${bestFixture.id} (${bestFixture.kind})`)
          addToQueue(bestFixture.id, agent.id)
          return { ...agent, targetFixture: bestFixture }
        }
        return agent
      }

      const targetX = agent.targetFixture.x + agent.targetFixture.w / 2
      const targetY = agent.targetFixture.y + agent.targetFixture.h / 2
      const targetDx = targetX - agent.pos.x
      const targetDy = targetY - agent.pos.y
      const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy)

      // Check if we're at the front of the queue and fixture is available
      const fixtureState = fixtureStates.get(agent.targetFixture.id)
      const queueIndex = fixtureState?.queue.indexOf(agent.id) || 0
      const isAtFrontOfQueue = queueIndex === 0
      
      if (isAtFrontOfQueue && fixtureState && fixtureState.occupiedBy === null) {
        // Compute path to fixture center and start moving
        removeFromQueue(agent.targetFixture.id, agent.id)
        requestPathForAgent(agent.id, targetX, targetY, 'STALL')
        return { ...agent, state: 'going' as any }
      } else {
        // We're in queue - move to our queue position
        // Queue line to the left of the fixture with reasonable spacing
        const spacing = 28
        const baseOffset = 60
        const queueX = targetX - baseOffset - (queueIndex * spacing)
        const queueY = targetY
        
        const queueDx = queueX - agent.pos.x
        const queueDy = queueY - agent.pos.y
        const queueDistance = Math.sqrt(queueDx * queueDx + queueDy * queueDy)
        
        if (queueDistance < 10) {
          // We're at our queue position
          console.log(`Agent ${agent.id} queuing at position ${queueIndex} for fixture ${agent.targetFixture.id}`)
          return { ...agent, pos: { x: queueX, y: queueY } }
        } else {
          // Move towards our queue position
          const moveSpeed = 8
          const moveX = (queueDx / queueDistance) * moveSpeed
          const moveY = (queueDy / queueDistance) * moveSpeed
          return { ...agent, pos: { x: agent.pos.x + moveX, y: agent.pos.y + moveY } }
        }
      }

    case 'occupying':
      const occupiedFixture = agent.targetFixture
      if (!occupiedFixture) return agent

      const occupiedState = fixtureStates.get(occupiedFixture.id)
      if (occupiedState && occupiedState.occupiedBy === agent.id) {
        occupiedState.dwellTimeRemaining -= dt
        console.log(`Agent ${agent.id} in fixture ${occupiedFixture.id}, dwell time remaining: ${occupiedState.dwellTimeRemaining}ms`)
        
        if (occupiedState.dwellTimeRemaining <= 0) {
          occupiedState.occupiedBy = null
          console.log(`Agent ${agent.id} finished using fixture, moving to washing`)
          return { ...agent, state: 'washing', dwellTimeRemaining: 0 }
        }
      }
      return agent

    case 'washing':
      const sink = fixtures.find(f => f.kind === 'sink')
      if (!sink) {
        console.log(`Agent ${agent.id} no sink available, moving to exiting`)
        return { ...agent, state: 'exiting' }
      }

      const sinkX = sink.x + sink.w / 2
      const sinkY = sink.y + sink.h / 2
      const sinkDx = sinkX - agent.pos.x
      const sinkDy = sinkY - agent.pos.y
      const sinkDistance = Math.sqrt(sinkDx * sinkDx + sinkDy * sinkDy)

      if (sinkDistance < 15) {
        // Agent is at sink - wash for a very short time then exit
        if (!agent.dwellTimeRemaining) {
          agent.dwellTimeRemaining = 300 // Wash for only 0.3 seconds
        }
        agent.dwellTimeRemaining -= dt
        
        if (agent.dwellTimeRemaining <= 0) {
          console.log(`Agent ${agent.id} finished washing, moving to exiting`)
          return { ...agent, state: 'exiting', dwellTimeRemaining: 0 }
        }
        return agent
      } else {
        // Move towards sink
        const moveSpeed = 6
        const moveX = (sinkDx / sinkDistance) * moveSpeed
        const moveY = (sinkDy / sinkDistance) * moveSpeed
        return { ...agent, pos: { x: agent.pos.x + moveX, y: agent.pos.y + moveY } }
      }

    case 'exiting':
      const exitDoor = fixtures.find(f => f.kind === 'door')
      if (!exitDoor) return agent

      const exitX = exitDoor.x + exitDoor.w / 2
      const exitY = exitDoor.y + exitDoor.h / 2
      const exitDx = exitX - agent.pos.x
      const exitDy = exitY - agent.pos.y
      const exitDistance = Math.sqrt(exitDx * exitDx + exitDy * exitDy)

      if (exitDistance < 15) {
        console.log(`Agent ${agent.id} reached exit door, removing from simulation`)
        // Mark agent for removal by returning null
        return null
      } else {
        const moveSpeed = 8
        const moveX = (exitDx / exitDistance) * moveSpeed
        const moveY = (exitDy / exitDistance) * moveSpeed
        return { ...agent, pos: { x: agent.pos.x + moveX, y: agent.pos.y + moveY } }
      }

    default:
      return agent
  }
}

function reset() {
  console.log('Worker: Resetting simulation')
  t = 0
  agents = []
  fixtureStates.clear()

  // Initialize fixture states
  for (const fixture of fixtures) {
    if (fixture.kind === 'stall' || fixture.kind === 'urinal') {
      fixtureStates.set(fixture.id, {
        occupiedBy: null,
        queue: [],
        dwellTimeRemaining: 0
      })
    }
  }

  // Spawn initial agents (staggered so they don't overlap)
  const door = fixtures.find(f => f.kind === 'door')
  if (door) {
    for (let i = 0; i < 6; i++) {
      const gender: Gender = Math.random() < params.genderMix.female ? 'female' : 'male'
      const offsetX = -50 - (i * 20)
      const offsetY = ((i % 3) - 1) * 18
      agents.push({
        id: i,
        gender,
        pos: { x: door.x + offsetX, y: door.y + door.h / 2 + offsetY },
        state: 'arriving',
        targetFixture: null
      })
    }
  }

  console.log('Worker: Reset complete, spawned', agents.length, 'agents')
}

self.onmessage = (ev: MessageEvent<InitMsg|TickMsg|ControlMsg>) => {
  const msg = ev.data
  console.log('Worker received message:', msg.type, 'running =', running)
  
  if(msg.type==='init'){ 
    params = msg.params
    fixtures = msg.layout.fixtures
    console.log('Worker: Initializing with fixtures:', fixtures.length)
    console.log('Worker: Fixtures:', fixtures.map(f => `${f.kind}(${f.id})`))
    gridSizePx = msg.layout.gridSize || 20
    // Build a very simple walkable grid from layout bounds; treat non-fixture as FLOOR, fixtures as their types
    const gridW = Math.max(1, Math.ceil(msg.layout.width / msg.layout.gridSize))
    const gridH = Math.max(1, Math.ceil(msg.layout.height / msg.layout.gridSize))
    const cells: GridCell[] = []
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        let type: CellType = 'FLOOR'
        for (const f of fixtures) {
          if (x * msg.layout.gridSize >= f.x && x * msg.layout.gridSize < f.x + f.w &&
              y * msg.layout.gridSize >= f.y && y * msg.layout.gridSize < f.y + f.h) {
            if (f.kind === 'stall') type = 'STALL'
            else if (f.kind === 'urinal') type = 'URINAL'
            else if (f.kind === 'sink') type = 'SINK'
            else if (f.kind === 'door') type = 'DOOR'
          }
        }
        cells.push({ x, y, type })
      }
    }
    const grid: Grid = { width: gridW, height: gridH, cells }
    pf.initFromGrid(grid)
    reset() 
  }
  
  if(msg.type==='start') {
    running = true
    console.log('Worker: Simulation started. running =', running)
  }
  
  if(msg.type==='stop') {
    running = false
    console.log('Worker: Simulation stopped. running =', running)
  }
  
  if(msg.type==='reset') reset()
  
  if(msg.type==='tick'){
    const dt = msg.dt
    if (running) {
      console.log('Worker: Processing tick - agents are moving! dt =', dt)
      t += dt

      // Update all agents
      agents = agents.map(agent => {
        const updatedAgent = updateAgent(agent, dt)
        if (updatedAgent === null) {
          console.log(`Agent ${agent.id} marked for removal`)
          return null
        }
        if (updatedAgent.state !== agent.state) {
          console.log(`Agent ${agent.id} changed state from ${agent.state} to ${updatedAgent.state}`)
        }
        // Log agent positions for debugging
        if (agent.id === 0) {
          console.log(`Agent 0: state=${updatedAgent.state}, pos=(${updatedAgent.pos.x.toFixed(1)}, ${updatedAgent.pos.y.toFixed(1)})`)
        }
        return updatedAgent
      }).filter(agent => agent !== null) // Remove null agents immediately

      // Remove agents that have exited
      agents = agents.filter(agent => {
        if (agent.state === 'exiting') {
          const door = fixtures.find(f => f.kind === 'door')
          if (door) {
            const doorX = door.x + door.w / 2
            const doorY = door.y + door.h / 2
            const dx = doorX - agent.pos.x
            const dy = doorY - agent.pos.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance < 15) {
              console.log(`Agent ${agent.id} exited the simulation`)
              return false
            }
          }
        }
        return true
      })

      // Spawn new agents based on arrival rate (increased rate for more activity)
      if (Math.random() < params.arrival.ratePerMin / 30 * dt / 1000) {
        const door = fixtures.find(f => f.kind === 'door')
        if (door) {
          const gender: Gender = Math.random() < params.genderMix.female ? 'female' : 'male'
          const newAgent: Agent = {
            id: Date.now() + Math.random(),
            gender,
            pos: { x: door.x - 50, y: door.y + door.h / 2 },
            state: 'arriving',
            targetFixture: null
          }
          agents.push(newAgent)
          console.log(`Spawned new agent ${newAgent.id} (${gender})`)
        }
      }
    }

    // Always send state updates so UI can render agents
    ;(self as any).postMessage({ type:'state', t, agents })
  }
}
