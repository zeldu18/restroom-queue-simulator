import type {
  WorkerIn,
  WorkerOut_Batch,
} from "./types/shared";
import { runBatch, type BatchParams, type BatchResult } from "./bathroom_sim";

declare const self: Worker & { onmessage: any };

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.cmd === "runBatch") {
    // Convert shared types to bathroom_sim types
    const sharedParams = msg.params;
    const simParams: BatchParams = {
      arrivals: sharedParams.arrivals,
      usageTimes: {
        female: (sharedParams.services as any).female || { dist: "lognormal" as const, mu: Math.log(75), sigma: 0.6 },
        male: (sharedParams.services as any).male || { dist: "lognormal" as const, mu: Math.log(75), sigma: 0.6 },
        urinal: (sharedParams.services as any).urinal || { dist: "lognormal" as const, mu: Math.log(28), sigma: 0.4 },
        sink: sharedParams.services.sink as any,
      },
      caps: { cStall: sharedParams.caps.cStall, cUrinal: sharedParams.caps.cUrinal, cSink: sharedParams.caps.cSink },
      delays: sharedParams.delays,
      warmupMin: sharedParams.warmupMin,
      horizonMin: sharedParams.horizonMin,
      replications: sharedParams.replications,
      seed: sharedParams.seed,
    };
    const res = runBatch(simParams);
    // Convert to shared type format
    const out: WorkerOut_Batch = {
      kind: "batchResult",
      perCustomer: {
        gender: res.perCustomer.gender,
        waitFixtureSec: res.perCustomer.waitFixtureSec,
        waitSinkSec: res.perCustomer.waitSinkSec,
        timeInSystemSec: res.perCustomer.timeInSystemSec,
      },
      perReplication: {
        avgWaitTotalSec: res.perReplication.avgWaitTotalSec,
        p95WaitTotalSec: res.perReplication.p95WaitTotalSec,
        utilStall: res.perReplication.utilStall,
        utilUrinal: res.perReplication.utilUrinal,
        utilSink: res.perReplication.utilSink,
        throughputPerHour: res.perReplication.throughputPerHour,
      },
      meta: {
        ignoredWarmupMin: res.meta.detectedWarmupMin || res.meta.warmupMin,
        horizonMin: res.meta.horizonMin,
        replications: res.meta.replications,
      },
    };
    (self as any).postMessage(out);
  }
};
