import type { PiecewiseRate, Gender } from "./types/shared";

export function generateNHPP(rate: PiecewiseRate, horizonMin: number, rand: () => number): number[] {
  // returns arrival times in minutes
  const events: number[] = []
  
  for (const seg of rate) {
    const start = Math.max(0, seg.tStartMin)
    const end = Math.min(horizonMin, seg.tEndMin)
    if (end <= start || seg.lambdaPerMin <= 0) continue
    
    // homogeneous Poisson in this segment
    let t = start
    while (true) {
      const u = rand()
      const inter = -Math.log(1 - u) / seg.lambdaPerMin // minutes
      t += inter
      if (t >= end) break
      events.push(t)
    }
  }
  
  events.sort((a, b) => a - b)
  return events
}

export function interleaveByGender(fTimes: number[], mTimes: number[]): Array<{t: number; g: Gender}> {
  const merged: Array<{t: number; g: Gender}> = []
  let i = 0, j = 0
  
  while (i < fTimes.length || j < mTimes.length) {
    if (j >= mTimes.length || (i < fTimes.length && fTimes[i] <= mTimes[j])) {
      merged.push({ t: fTimes[i++], g: "F" })
    } else {
      merged.push({ t: mTimes[j++], g: "M" })
    }
  }
  
  return merged
}

