// bathroom_sim.ts

// Math-only batch simulation for a restroom: NHPP arrivals → Fixture (stall/urinal) → Sink → Exit

// TypeScript, no UI. Exported API: runBatch(params: BatchParams) -> BatchResult

/***** Types *****/

export type Gender = "F" | "M";

export type FixtureKind = "stall" | "urinal";

export type PiecewiseRate = Array<{ tStartMin: number; tEndMin: number; lambdaPerMin: number }>;

export interface ArrivalSpec {
  female: PiecewiseRate;
  male: PiecewiseRate;
  pMaleUrinal: number;   // e.g., 0.85
}

export interface LognormalSpec { dist: "lognormal"; mu: number; sigma: number } // seconds

export interface GammaSpec     { dist: "gamma";     k: number;  theta: number } // seconds, mean = k*theta

export interface UsageTimeSpec {
  female: LognormalSpec;  // women's usage time for stalls
  male: LognormalSpec;    // men's usage time for stalls
  urinal: LognormalSpec;  // men's urinal usage (only men use urinals)
  sink: GammaSpec | LognormalSpec;
}

export interface Capacities {
  cStall: number;   // servers
  cUrinal: number;  // servers
  cSink: number;    // servers
}

export interface Delays {
  walkToFixtureSec: number; // entrance -> stall/urinal
  walkToSinkSec: number;    // fixture -> sink
  walkToExitSec: number;    // sink -> exit (for TIS only)
}

export interface BatchParams {
  arrivals: ArrivalSpec;
  usageTimes: UsageTimeSpec;  // renamed from services
  caps: Capacities;
  delays: Delays;
  warmupMin: number;     // discard initial minutes
  horizonMin: number;    // total run length (per replication)
  replications: number;  // R
  seed: number;          // master seed
}

/***** Outputs *****/

export interface PerCustomer {
  gender: Gender[];
  fixtureKind: FixtureKind[];      // which fixture they actually used
  waitFixtureSec: number[];        // queueing + pre-queue walking delay to fixture
  waitSinkSec: number[];           // queueing + pre-queue walking delay to sink
  timeInSystemSec: number[];       // arrival -> exit (includes exit walk)
}

export interface PerReplication {
  avgWaitTotalSec: number[];       // (waitFixture + waitSink) per replication mean
  p95WaitTotalSec: number[];
  utilStall: number[];             // fraction of busy server-seconds (post warm-up)
  utilUrinal: number[];
  utilSink: number[];
  throughputPerHour: number[];     // completed (post warm-up) per hour of observed time
}

export interface BatchResult {
  perCustomer: PerCustomer;        // pooled across replications, after warm-up
  perReplication: PerReplication;
  meta: { warmupMin: number; horizonMin: number; replications: number; detectedWarmupMin: number };
}

/***** RNG & samplers *****/

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal01(rand: () => number) {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleLognormal(mu: number, sigma: number, rand: () => number): number {
  return Math.exp(mu + sigma * normal01(rand));
}

function sampleGamma(k: number, theta: number, rand: () => number): number {
  // Marsaglia–Tsang for k >= 1; boosting trick if k < 1
  if (k < 1) {
    const u = rand();
    return sampleGamma(1 + k, theta, rand) * Math.pow(u, 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const z = normal01(rand);
    let x = 1 + c * z;
    if (x <= 0) continue;
    x = x * x * x;
    const u = rand();
    if (u < 1 - 0.0331 * (z * z) * (z * z)) return theta * d * x;
    if (Math.log(u) < 0.5 * z * z + d * (1 - x + Math.log(x))) return theta * d * x;
  }
}

function drawServiceSeconds(spec: LognormalSpec | GammaSpec, rand: () => number): number {
  if (spec.dist === "lognormal") return sampleLognormal(spec.mu, spec.sigma, rand);
  return sampleGamma(spec.k, spec.theta, rand);
}

/***** NHPP (piecewise-constant) arrivals *****/

function generateHomogeneousPoisson(startMin: number, endMin: number, lambdaPerMin: number, rand: () => number): number[] {
  const out: number[] = [];
  if (lambdaPerMin <= 0 || endMin <= startMin) return out;
  let t = startMin;
  while (true) {
    const u = rand();
    const inter = -Math.log(1 - u) / lambdaPerMin; // minutes
    t += inter;
    if (t >= endMin) break;
    out.push(t);
  }
  return out;
}

function generateNHPP(rate: PiecewiseRate, horizonMin: number, rand: () => number): number[] {
  const times: number[] = [];
  for (const seg of rate) {
    const s = Math.max(0, seg.tStartMin);
    const e = Math.min(horizonMin, seg.tEndMin);
    if (e <= s) continue;
    times.push(...generateHomogeneousPoisson(s, e, seg.lambdaPerMin, rand));
  }
  times.sort((a, b) => a - b);
  return times; // minutes
}

/***** Small helpers *****/

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

/***** Priority queue (binary heap) *****/

type EvKind =
  | "ARRIVE"
  | "ENTER_FIXTURE"   // after walk-to-fixture
  | "TRY_START_STALL"
  | "TRY_START_URINAL"
  | "END_STALL"
  | "END_URINAL"
  | "ENTER_SINK"      // after walk-to-sink
  | "TRY_START_SINK"
  | "END_SINK";

interface Event { t: number; kind: EvKind; id: number; }

class MinHeap {
  private a: Event[] = [];

  size() { return this.a.length; }

  push(e: Event) {
    this.a.push(e);
    this.bubble(this.a.length - 1);
  }

  pop(): Event | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      this.sink(0);
    }
    return top;
  }

  private bubble(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].t <= this.a[i].t) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }

  private sink(i: number) {
    const n = this.a.length;
    while (true) {
      let j = i;
      const l = i * 2 + 1, r = l + 1;
      if (l < n && this.a[l].t < this.a[j].t) j = l;
      if (r < n && this.a[r].t < this.a[j].t) j = r;
      if (j === i) break;
      [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
      i = j;
    }
  }
}

/***** Core DES per replication *****/

interface Person {
  id: number;
  gender: Gender;
  fixture: FixtureKind;            // chosen at arrival
  tArrive: number;                 // sec
  tEnterFixture?: number;          // sec (start of service at stall/urinal)
  tLeaveFixture?: number;          // sec
  tEnterSink?: number;             // sec
  tLeaveSink?: number;             // sec
}

interface RepMetrics {
  perCustomer: PerCustomer;
  utilStall: number;               // fraction (0-1), post warm-up
  utilUrinal: number;
  utilSink: number;
  throughputPerHour: number;       // post warm-up only
  detectedWarmupSec: number;       // actual warmup used (in seconds)
}

/**
 * Detects convergence by tracking moving averages of wait times
 * Returns the time (in seconds) when convergence is detected
 */
function detectConvergence(
  windowHistory: Array<{ t: number; avgWait: number }>,
  horizonSec: number,
  convergenceWindowSec: number = 300, // 5 minutes
  convergenceTolerance: number = 0.05 // 5% change threshold
): number {
  if (windowHistory.length < 3) return Math.min(horizonSec * 0.1, 120);

  const sorted = [...windowHistory].sort((a, b) => a.t - b.t);
  
  // Look for a period where wait times are stable
  for (let i = 2; i < sorted.length; i++) {
    const window = sorted.slice(Math.max(0, i - 2), i + 1);
    const windowStart = window[0].t;
    const windowEnd = window[window.length - 1].t;
    
    if (windowEnd - windowStart >= convergenceWindowSec) {
      const waits = window.map(w => w.avgWait);
      const mean = waits.reduce((a, b) => a + b, 0) / waits.length;
      const variance = waits.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / waits.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // coefficient of variation
      
      // If coefficient of variation is low, system has converged
      if (cv < convergenceTolerance || variance < 0.01) {
        return windowStart;
      }
    }
  }
  
  // Default: use 10% of horizon or minimum of 2 minutes
  return Math.min(horizonSec * 0.1, 120);
}

export function runOneReplication(p: BatchParams, seed: number): RepMetrics {
  // Timebase
  const horizonSec = p.horizonMin * 60;
  
  // Auto-detect warmup if not specified (0)
  let warmupSec = p.warmupMin * 60;
  if (warmupSec === 0) {
    // Will be computed after running simulation
    warmupSec = Math.min(horizonSec * 0.1, 120); // Default 10% or 2 min
  }

  // RNG streams (split deterministically from seed)
  const randMaster = mulberry32(seed >>> 0);
  const rArrF = mulberry32(Math.floor(randMaster() * 1e9));
  const rArrM = mulberry32(Math.floor(randMaster() * 1e9));
  const rSvcS = mulberry32(Math.floor(randMaster() * 1e9));
  const rSvcU = mulberry32(Math.floor(randMaster() * 1e9));
  const rSvcW = mulberry32(Math.floor(randMaster() * 1e9));
  const rRoute = mulberry32(Math.floor(randMaster() * 1e9));

  // Generate arrivals (minutes → seconds)
  const fMin = generateNHPP(p.arrivals.female, p.horizonMin, rArrF);
  const mMin = generateNHPP(p.arrivals.male, p.horizonMin, rArrM);
  const arrivals: Array<{ t: number; g: Gender }> = [];
  for (const t of fMin) arrivals.push({ t: t * 60, g: "F" });
  for (const t of mMin) arrivals.push({ t: t * 60, g: "M" });
  arrivals.sort((a, b) => a.t - b.t);

  // State
  const evq = new MinHeap();
  const people = new Map<number, Person>();
  let nextId = 1;

  // Queues (IDs) & busy server counts
  const qStall: number[] = [];
  const qUrinal: number[] = [];
  const qSink: number[] = [];
  let busyStall = 0, busyUrinal = 0, busySink = 0;

  // Busy-server-seconds accumulator (post warm-up only)
  let lastT = 0;
  let busySecStall = 0, busySecUrinal = 0, busySecSink = 0;

  // Debug counters
  let totalArrivals = 0;
  let totalCompleted = 0;

  // Outputs - collect ALL customers first, filter by warmup later
  const allCustomers: Array<{
    gender: Gender;
    fixtureKind: FixtureKind;
    waitFixtureSec: number;
    waitSinkSec: number;
    timeInSystemSec: number;
    tExit: number;
  }> = [];

  // Convergence detection: track wait times over time windows
  const convergenceWindows: Array<{ t: number; avgWait: number; count: number }> = [];
  const windowSize = 60; // 1 minute windows
  let currentWindowWaitSum = 0;
  let currentWindowCount = 0;
  let lastWindowTime = 0;

  // Seed arrival events
  for (const a of arrivals) {
    if (a.t >= horizonSec) break;
    totalArrivals++;
    const id = nextId++;
    const fixture: FixtureKind =
      a.g === "M" && p.caps.cUrinal > 0 && rRoute() < p.arrivals.pMaleUrinal ? "urinal" : "stall";
    people.set(id, { id, gender: a.g, fixture, tArrive: a.t });
    evq.push({ t: a.t, kind: "ARRIVE", id });
  }

  // Utility: accumulate busy-server-seconds only on overlap with [warmupSec, horizonSec]
  function accumulateBusy(toT: number) {
    if (toT <= lastT) { lastT = toT; return; }
    const a = Math.max(lastT, warmupSec);
    const b = Math.min(toT, horizonSec);
    if (b > a) {
      const dt = b - a;
      busySecStall += dt * busyStall;
      busySecUrinal += dt * busyUrinal;
      busySecSink += dt * busySink;
    }
    lastT = toT;
  }

  // Event loop
  while (evq.size()) {
    const ev = evq.pop()!;
    if (ev.t > horizonSec) break;

    // advance time accounting
    accumulateBusy(ev.t);

    const person = people.get(ev.id)!;
    if (!person) continue;

    switch (ev.kind) {
      case "ARRIVE": {
        // after walk-to-fixture, they physically join the chosen fixture queue
        const tJoin = ev.t + p.delays.walkToFixtureSec;
        evq.push({ t: tJoin, kind: "ENTER_FIXTURE", id: ev.id });
        break;
      }

      case "ENTER_FIXTURE": {
        if (person.fixture === "stall") {
          qStall.push(person.id);
          evq.push({ t: ev.t, kind: "TRY_START_STALL", id: qStall[0] }); // head-of-line try
        } else {
          qUrinal.push(person.id);
          evq.push({ t: ev.t, kind: "TRY_START_URINAL", id: qUrinal[0] });
        }
        break;
      }

      case "TRY_START_STALL": {
        if (qStall.length && qStall[0] === person.id && busyStall < p.caps.cStall) {
          qStall.shift();
          busyStall++;
          person.tEnterFixture = ev.t;
          // Gender-specific usage time for stalls
          const stallSpec = person.gender === "F" ? p.usageTimes.female : p.usageTimes.male;
          const svc = drawServiceSeconds(stallSpec, person.gender === "F" ? rSvcS : rSvcU);
          person.tLeaveFixture = ev.t + svc;
          evq.push({ t: person.tLeaveFixture, kind: "END_STALL", id: person.id });

          // Let next in line try immediately (if any)
          if (qStall.length) evq.push({ t: ev.t, kind: "TRY_START_STALL", id: qStall[0] });
        }
        break;
      }

      case "TRY_START_URINAL": {
        if (qUrinal.length && qUrinal[0] === person.id && busyUrinal < p.caps.cUrinal) {
          qUrinal.shift();
          busyUrinal++;
          person.tEnterFixture = ev.t;
          const svc = drawServiceSeconds(p.usageTimes.urinal, rSvcU);
          person.tLeaveFixture = ev.t + svc;
          evq.push({ t: person.tLeaveFixture, kind: "END_URINAL", id: person.id });
          if (qUrinal.length) evq.push({ t: ev.t, kind: "TRY_START_URINAL", id: qUrinal[0] });
        }
        break;
      }

      case "END_STALL": {
        busyStall = Math.max(0, busyStall - 1);
        const tWalk = ev.t + p.delays.walkToSinkSec;
        evq.push({ t: tWalk, kind: "ENTER_SINK", id: person.id });

        // Trigger next starter if queue not empty (already scheduled at END via TRY)
        if (qStall.length) evq.push({ t: ev.t, kind: "TRY_START_STALL", id: qStall[0] });
        break;
      }

      case "END_URINAL": {
        busyUrinal = Math.max(0, busyUrinal - 1);
        const tWalk = ev.t + p.delays.walkToSinkSec;
        evq.push({ t: tWalk, kind: "ENTER_SINK", id: person.id });
        if (qUrinal.length) evq.push({ t: ev.t, kind: "TRY_START_URINAL", id: qUrinal[0] });
        break;
      }

      case "ENTER_SINK": {
        qSink.push(person.id);
        evq.push({ t: ev.t, kind: "TRY_START_SINK", id: qSink[0] });
        break;
      }

      case "TRY_START_SINK": {
        if (qSink.length && qSink[0] === person.id && busySink < p.caps.cSink) {
          qSink.shift();
          busySink++;
          person.tEnterSink = ev.t;
          const svc = drawServiceSeconds(p.usageTimes.sink, rSvcW);
          person.tLeaveSink = ev.t + svc;
          evq.push({ t: person.tLeaveSink, kind: "END_SINK", id: person.id });
          if (qSink.length) evq.push({ t: ev.t, kind: "TRY_START_SINK", id: qSink[0] });
        }
        break;
      }

      case "END_SINK": {
        busySink = Math.max(0, busySink - 1);
        const tExit = ev.t + p.delays.walkToExitSec;

        // Track wait times for convergence (before filtering by warmup)
        const joinFixtureAt = person.tArrive + p.delays.walkToFixtureSec;
        const waitFix = person.tEnterFixture 
          ? Math.max(0, person.tEnterFixture - joinFixtureAt)
          : 0;
        const leaveFixtureAt = person.tLeaveFixture ?? ev.t;
        const joinSinkAt = leaveFixtureAt + p.delays.walkToSinkSec;
        const waitSink = person.tEnterSink
          ? Math.max(0, person.tEnterSink - joinSinkAt)
          : 0;
        const totalWait = waitFix + waitSink;

        // Accumulate for convergence detection
        if (Math.floor(ev.t / windowSize) > Math.floor(lastWindowTime / windowSize)) {
          // New window - save previous
          if (currentWindowCount > 0) {
            convergenceWindows.push({
              t: Math.floor(lastWindowTime / windowSize) * windowSize,
              avgWait: currentWindowWaitSum / currentWindowCount,
              count: currentWindowCount,
            });
          }
          currentWindowWaitSum = 0;
          currentWindowCount = 0;
          lastWindowTime = ev.t;
        }
        currentWindowWaitSum += totalWait;
        currentWindowCount++;

        // Collect all customers (will filter by warmup later)
        const tis = tExit - person.tArrive;
        allCustomers.push({
          gender: person.gender,
          fixtureKind: person.fixture,
          waitFixtureSec: waitFix,
          waitSinkSec: waitSink,
          timeInSystemSec: tis,
          tExit,
        });
        totalCompleted++;

        if (qSink.length) evq.push({ t: ev.t, kind: "TRY_START_SINK", id: qSink[0] });
        break;
      }
    }
  }

  // Finalize busy time accounting up to horizon
  accumulateBusy(horizonSec);

  // Auto-detect warmup if not specified
  if (p.warmupMin === 0) {
    if (convergenceWindows.length >= 3) {
      const detected = detectConvergence(convergenceWindows.map(w => ({ t: w.t, avgWait: w.avgWait })), horizonSec);
      warmupSec = Math.max(detected, 60); // At least 1 minute
    } else {
      // Fallback: use 10% of horizon or 2 minutes minimum
      warmupSec = Math.max(horizonSec * 0.1, 120);
    }
  }

  // Filter customers by warmup period
  const out: PerCustomer = { gender: [], fixtureKind: [], waitFixtureSec: [], waitSinkSec: [], timeInSystemSec: [] };
  let completedPostWarmup = 0;
  for (const cust of allCustomers) {
    if (cust.tExit > warmupSec) {
      out.gender.push(cust.gender);
      out.fixtureKind.push(cust.fixtureKind);
      out.waitFixtureSec.push(cust.waitFixtureSec);
      out.waitSinkSec.push(cust.waitSinkSec);
      out.timeInSystemSec.push(cust.timeInSystemSec);
      completedPostWarmup++;
    }
  }

  // Final utilization (post warm-up) — divide busy server-seconds by available server-seconds
  const windowSec = Math.max(0, horizonSec - Math.max(warmupSec, 0));
  const denomStall  = Math.max(1, windowSec * Math.max(1, p.caps.cStall));
  const denomUrinal = Math.max(1, windowSec * Math.max(1, p.caps.cUrinal));
  const denomSink   = Math.max(1, windowSec * Math.max(1, p.caps.cSink));

  const utilStall  = p.caps.cStall  ? clamp01(busySecStall  / denomStall)  : 0;
  const utilUrinal = p.caps.cUrinal ? clamp01(busySecUrinal / denomUrinal) : 0;
  const utilSink   = p.caps.cSink   ? clamp01(busySecSink   / denomSink)   : 0;

  const throughputPerHour = windowSec > 0 ? (completedPostWarmup / windowSec) * 3600 : 0;

  // Debug: log if no customers completed (this would cause NaN)
  if (totalCompleted === 0 && totalArrivals > 0) {
    console.warn(`[bathroom_sim] No customers completed after warmup! Arrivals: ${totalArrivals}, Warmup: ${warmupSec}s, Horizon: ${horizonSec}s`);
  }

  return {
    perCustomer: out,
    utilStall, utilUrinal, utilSink,
    throughputPerHour,
    detectedWarmupSec: warmupSec
  };
}

/***** Batch runner *****/

export function runBatch(params: BatchParams): BatchResult {
  const perCustomer: PerCustomer = {
    gender: [], fixtureKind: [], waitFixtureSec: [], waitSinkSec: [], timeInSystemSec: []
  };

  const perReplication: PerReplication = {
    avgWaitTotalSec: [], p95WaitTotalSec: [],
    utilStall: [], utilUrinal: [], utilSink: [],
    throughputPerHour: []
  };

  // Detect warmup once before running batch
  let detectedWarmupMin = params.warmupMin;
  if (params.warmupMin === 0) {
    const testSeed = Math.floor(mulberry32(params.seed >>> 0)() * 1e9);
    const testRep = runOneReplication(params, testSeed);
    detectedWarmupMin = testRep.detectedWarmupSec / 60;
    // Use detected warmup for all replications
    params = { ...params, warmupMin: detectedWarmupMin };
  }

  const seedStream = mulberry32(params.seed >>> 0);

  for (let r = 0; r < params.replications; r++) {
    const repSeed = Math.floor(seedStream() * 1e9);
    const rep = runOneReplication(params, repSeed);

    // Pool per-customer
    perCustomer.gender.push(...rep.perCustomer.gender);
    perCustomer.fixtureKind.push(...rep.perCustomer.fixtureKind);
    perCustomer.waitFixtureSec.push(...rep.perCustomer.waitFixtureSec);
    perCustomer.waitSinkSec.push(...rep.perCustomer.waitSinkSec);
    perCustomer.timeInSystemSec.push(...rep.perCustomer.timeInSystemSec);

    // Per-rep summary stats
    const totalWait = rep.perCustomer.waitFixtureSec.map((w, i) => w + rep.perCustomer.waitSinkSec[i]);
    const sorted = [...totalWait].sort((a, b) => a - b);
    const mean = totalWait.length
      ? totalWait.reduce((a, b) => a + b, 0) / totalWait.length
      : 0;

    perReplication.avgWaitTotalSec.push(mean);
    perReplication.p95WaitTotalSec.push(percentile(sorted, 0.95));
    perReplication.utilStall.push(rep.utilStall);
    perReplication.utilUrinal.push(rep.utilUrinal);
    perReplication.utilSink.push(rep.utilSink);
    perReplication.throughputPerHour.push(rep.throughputPerHour);
  }

  return {
    perCustomer,
    perReplication,
    meta: { 
      warmupMin: params.warmupMin, 
      horizonMin: params.horizonMin, 
      replications: params.replications,
      detectedWarmupMin
    }
  };
}

