import type { ArrivalSpec, ServiceSpec, LayoutCapacities, Delays, Gender } from "./types/shared";
import { mulberry32, sampleLognormal, sampleGamma } from "./rng";
import { generateNHPP, interleaveByGender } from "./nhpp";

type EvKind = "ARRIVE" | "TRY_START_FIXTURE" | "END_FIXTURE" | "TRY_START_SINK" | "END_SINK";

interface Event {
  t: number;
  kind: EvKind;
  id: number;
}

interface Person {
  id: number;
  gender: Gender;
  tArrive: number;
  tEnterFixture?: number;
  tLeaveFixture?: number;
  tEnterSink?: number;
  tLeaveSink?: number;
  totalWaitFixture: number;
  totalWaitSink: number;
}

class PQ {
  private a: Event[] = [];
  
  push(e: Event) {
    this.a.push(e);
    this.a.sort((x, y) => x.t - y.t);
  }
  
  pop(): Event | undefined {
    return this.a.shift();
  }
  
  get length() {
    return this.a.length;
  }
}

export interface SimOutputs {
  perCustomer: {
    gender: Gender[];
    waitFixtureSec: number[];
    waitSinkSec: number[];
    timeInSystemSec: number[];
  };
  util: { stall: number; urinal: number; sink: number }; // fraction of horizon time
}

export interface SimParams {
  arrivals: ArrivalSpec;
  services: ServiceSpec;
  caps: LayoutCapacities;
  delays: Delays;
  warmupMin: number;
  horizonMin: number;
  seed: number;
}

export function runOneReplication(p: SimParams): SimOutputs {
  const rand = mulberry32(p.seed >>> 0);

  // 1) Generate arrivals by gender
  const fTs = generateNHPP(p.arrivals.female, p.horizonMin, rand);
  const mTs = generateNHPP(p.arrivals.male, p.horizonMin, rand);
  const arrStream = interleaveByGender(fTs, mTs);

  // 2) State
  const pq = new PQ();
  const people = new Map<number, Person>();
  let nextId = 1;

  // server state
  let busyStall = 0,
    busyUrinal = 0,
    busySink = 0;
  let lastT = 0,
    busyTimeStall = 0,
    busyTimeUrinal = 0,
    busyTimeSink = 0;

  const qFixture: number[] = []; // person ids
  const qSink: number[] = [];

  // 3) Seed events
  for (const a of arrStream) {
    pq.push({ t: a * 60, kind: "ARRIVE", id: nextId++ }); // seconds
    people.set(nextId - 1, {
      id: nextId - 1,
      gender: a.g,
      tArrive: a * 60,
      totalWaitFixture: 0,
      totalWaitSink: 0,
    });
  }

  const horizonSec = p.horizonMin * 60;
  const warmupSec = p.warmupMin * 60;

  // local accumulator
  function initOut() {
    return {
      gender: [] as Gender[],
      waitFixtureSec: [] as number[],
      waitSinkSec: [] as number[],
      timeInSystemSec: [] as number[],
    };
  }

  const out = initOut();

  // helpers
  const sampleFixtureSec = (g: Gender): number => {
    if (g === "M" && Math.random() < p.arrivals.pMaleUrinal && p.caps.cUrinal > 0) {
      // urinal
      return sampleLognormal(p.services.urinal.mu, p.services.urinal.sigma, rand);
    } else {
      return sampleLognormal(p.services.stall.mu, p.services.stall.sigma, rand);
    }
  };

  const chooseFixtureType = (g: Gender): "stall" | "urinal" => {
    if (g === "M" && p.caps.cUrinal > 0) {
      const useU = rand() < p.arrivals.pMaleUrinal;
      return useU ? "urinal" : "stall";
    }
    return "stall";
  };

  // Main loop
  while (pq.length) {
    const ev = pq.pop()!;
    if (ev.t > horizonSec) break;

    // accumulate busy areas since lastT
    const dt = ev.t - lastT;
    if (dt > 0) {
      busyTimeStall += dt * (busyStall > 0 ? busyStall / Math.max(1, p.caps.cStall) : 0);
      busyTimeUrinal += dt * (busyUrinal > 0 ? busyUrinal / Math.max(1, p.caps.cUrinal) : 0);
      busyTimeSink += dt * (busySink > 0 ? busySink / Math.max(1, p.caps.cSink) : 0);
      lastT = ev.t;
    }

    const person = people.get(ev.id)!;
    if (!person) continue;

    switch (ev.kind) {
      case "ARRIVE": {
        // add fixed walk to fixture as waiting component before we try to start service
        person.totalWaitFixture += p.delays.walkToFixtureSec;

        // enqueue request for fixture
        qFixture.push(person.id);
        pq.push({ t: ev.t, kind: "TRY_START_FIXTURE", id: person.id });
        break;
      }

      case "TRY_START_FIXTURE": {
        const idx = qFixture.indexOf(person.id);
        if (idx !== 0) break; // not at head

        const which = chooseFixtureType(person.gender);
        const cap = which === "stall" ? p.caps.cStall : p.caps.cUrinal;
        const busy = which === "stall" ? busyStall : busyUrinal;

        if (busy < cap) {
          // start
          if (which === "stall") busyStall++;
          else busyUrinal++;

          qFixture.shift();
          person.tEnterFixture = ev.t;
          const svc = sampleFixtureSec(person.gender);
          person.tLeaveFixture = ev.t + svc;
          pq.push({ t: person.tLeaveFixture, kind: "END_FIXTURE", id: person.id });
        }
        break;
      }

      case "END_FIXTURE": {
        // release whichever fixture was used by checking gender decision again
        const which = chooseFixtureType(person.gender);
        if (which === "stall") busyStall = Math.max(0, busyStall - 1);
        else busyUrinal = Math.max(0, busyUrinal - 1);

        // book waiting time for fixture
        if (person.tEnterFixture) {
          const waited = person.tEnterFixture - person.tArrive;
          if (person.tEnterFixture > warmupSec) person.totalWaitFixture += Math.max(0, waited);
        }

        // move to sink: walking delay is counted as waiting before sink
        person.totalWaitSink += p.delays.walkToSinkSec;
        qSink.push(person.id);
        pq.push({ t: ev.t, kind: "TRY_START_SINK", id: person.id });

        // try to start next in fixture queue
        if (qFixture.length > 0)
          pq.push({ t: ev.t, kind: "TRY_START_FIXTURE", id: qFixture[0] });
        break;
      }

      case "TRY_START_SINK": {
        const idx = qSink.indexOf(person.id);
        if (idx !== 0) break;

        if (busySink < p.caps.cSink) {
          busySink++;
          qSink.shift();
          person.tEnterSink = ev.t;
          const svc =
            p.services.sink.dist === "gamma"
              ? sampleGamma(p.services.sink.k, p.services.sink.theta, rand)
              : sampleLognormal(Math.log(10), 0.5, rand); // fallback
          person.tLeaveSink = ev.t + svc;
          pq.push({ t: person.tLeaveSink, kind: "END_SINK", id: person.id });
        }
        break;
      }

      case "END_SINK": {
        busySink = Math.max(0, busySink - 1);

        // add walking to exit, but it does not affect resources
        const leaveT = ev.t + p.delays.walkToExitSec;

        // record outputs if past warmup
        if (leaveT > warmupSec) {
          const waitFix =
            Math.max(0, (person.tEnterFixture ?? ev.t) - person.tArrive) + person.totalWaitFixture;
          const waitSink =
            Math.max(0, (person.tEnterSink ?? ev.t) - (person.tLeaveFixture ?? ev.t)) +
            person.totalWaitSink;
          const tis = leaveT - person.tArrive;

          out.gender.push(person.gender);
          out.waitFixtureSec.push(waitFix);
          out.waitSinkSec.push(waitSink);
          out.timeInSystemSec.push(tis);
        }

        if (qSink.length > 0)
          pq.push({ t: ev.t, kind: "TRY_START_SINK", id: qSink[0] });
        break;
      }
    }
  }

  // utilization as fraction of horizon time times servers
  const denom = Math.max(1, horizonSec - warmupSec);
  const util = {
    stall: p.caps.cStall ? busyTimeStall / denom : 0,
    urinal: p.caps.cUrinal ? busyTimeUrinal / denom : 0,
    sink: p.caps.cSink ? busyTimeSink / denom : 0,
  };

  return { perCustomer: out, util };
}
