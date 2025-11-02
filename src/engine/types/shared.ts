export type Gender = "F" | "M";

export type PiecewiseRate = Array<{ tStartMin: number; tEndMin: number; lambdaPerMin: number }>;

export interface ArrivalSpec {
  female: PiecewiseRate;
  male: PiecewiseRate;
  pMaleUrinal: number;   // e.g., 0.85
}

export interface ServiceSpec {
  female: { dist: "lognormal"; mu: number; sigma: number };  // women's stall usage time
  male: { dist: "lognormal"; mu: number; sigma: number };    // men's stall usage time
  urinal: { dist: "lognormal"; mu: number; sigma: number };
  sink:  { dist: "gamma" | "lognormal"; k?: number; theta?: number; mu?: number; sigma?: number };
}

export interface LayoutCapacities {
  cStall: number;  // number of stall servers
  cUrinal: number; // number of urinal servers
  cSink: number;   // number of sink servers
}

export interface Delays {
  walkToFixtureSec: number; // entrance -> stall/urinal
  walkToSinkSec: number;    // fixture -> sink
  walkToExitSec: number;    // sink -> exit
}

export interface BatchParams {
  arrivals: ArrivalSpec;
  services: ServiceSpec;
  caps: LayoutCapacities;
  delays: Delays;
  warmupMin: number;   // discard
  horizonMin: number;  // total simulated time per replication
  replications: number;
  seed: number;        // master seed
}

export type WorkerIn =
  | { cmd: "runBatch"; params: BatchParams }
  | { cmd: "runLiveStep"; params: Omit<BatchParams,"replications"> & { seed: number; tickMs: number } }
  | { cmd: "reset" };

export interface PerCustomerArrays {
  gender: Gender[];
  waitFixtureSec: number[];   // waiting time before stall/urinal
  waitSinkSec: number[];
  timeInSystemSec: number[];
}

export interface PerReplicationArrays {
  avgWaitTotalSec: number[];
  p95WaitTotalSec: number[];
  utilStall: number[];
  utilUrinal: number[];
  utilSink: number[];
  throughputPerHour?: number[];  // optional for backward compatibility
}

export interface WorkerOut_Batch {
  kind: "batchResult";
  perCustomer: PerCustomerArrays;
  perReplication: PerReplicationArrays;
  meta: { ignoredWarmupMin: number; horizonMin: number; replications: number };
}

