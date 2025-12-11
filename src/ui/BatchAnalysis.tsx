import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import type {
  BatchParams,
  WorkerIn,
  WorkerOut_Batch,
} from "../engine/types/shared";
import { ARTICLE_LAYOUTS, DEFAULT_SERVICE_TIMES } from "../engine/ca-types";

function percentile(arr: number[], p: number) {
  if (arr.length === 0) return NaN;
  const a = [...arr].sort((x, y) => x - y);
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

function confidenceInterval(arr: number[]) {
  if (arr.length === 0) return { mean: 0, ciLower: 0, ciUpper: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  if (arr.length === 1) return { mean, ciLower: mean, ciUpper: mean };
  const std = Math.sqrt(
    arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (arr.length - 1)
  );
  const se = std / Math.sqrt(arr.length);
  const z = 1.96; // 95% confidence
  return {
    mean,
    ciLower: Math.max(0, mean - z * se),
    ciUpper: mean + z * se,
  };
}

function createHistogram(data: number[], bins = 20, minOverride?: number, maxOverride?: number) {
  if (data.length === 0) return [];
  
  const min = minOverride ?? Math.min(...data);
  const max = maxOverride ?? Math.max(...data);
  
  if (min === max) {
    return [{
      range: `${min.toFixed(1)}`,
      count: data.length,
    }];
  }
  
  const binWidth = (max - min) / bins;
  const histogram: Array<{ range: string; count: number }> = [];

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const count = i === bins - 1
      ? data.filter((v) => v >= binStart && v <= binEnd).length
      : data.filter((v) => v >= binStart && v < binEnd).length;
    histogram.push({
      range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
      count,
    });
  }

  return histogram;
}

// Convert article layout to batch params
function layoutToParams(layoutId: string): { stalls: number; urinals: number; sinks: number } {
  const layout = ARTICLE_LAYOUTS.find(l => l.id === layoutId);
  if (!layout) return { stalls: 3, urinals: 2, sinks: 2 };
  
  // Total stalls (women + men + shared)
  const stalls = layout.womenStalls + layout.menStalls + layout.sharedStalls;
  const urinals = layout.menUrinals + layout.sharedUrinals;
  const sinks = layout.womenSinks + layout.menSinks + layout.sharedSinks;
  
  return { stalls, urinals, sinks };
}

export default function BatchAnalysis() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkerOut_Batch | null>(null);
  const [selectedLayout, setSelectedLayout] = useState('layout1');
  
  // Get initial capacities from selected layout
  const initialCaps = layoutToParams('layout1');
  
  const [params, setParams] = useState<BatchParams>({
    arrivals: {
      female: [{ tStartMin: 0, tEndMin: 60, lambdaPerMin: 0.6 }],
      male: [{ tStartMin: 0, tEndMin: 60, lambdaPerMin: 0.6 }],
      pMaleUrinal: 0.85,
    },
    services: {
      // Based on research data - using median of ranges
      female: { 
        dist: "lognormal", 
        mu: Math.log((DEFAULT_SERVICE_TIMES.female.stallMin + DEFAULT_SERVICE_TIMES.female.stallMax) / 2), 
        sigma: 0.6 
      },
      male: { 
        dist: "lognormal", 
        mu: Math.log((DEFAULT_SERVICE_TIMES.male.stallMin + DEFAULT_SERVICE_TIMES.male.stallMax) / 2), 
        sigma: 0.5 
      },
      urinal: { 
        dist: "lognormal", 
        mu: Math.log((DEFAULT_SERVICE_TIMES.male.urinalMin + DEFAULT_SERVICE_TIMES.male.urinalMax) / 2), 
        sigma: 0.4 
      },
      sink: { dist: "gamma", k: 2.2, theta: 3.2 },
    },
    caps: { cStall: initialCaps.stalls, cUrinal: initialCaps.urinals, cSink: initialCaps.sinks },
    delays: { walkToFixtureSec: 5, walkToSinkSec: 4, walkToExitSec: 4 },
    warmupMin: 0,
    horizonMin: 60,
    replications: 200,
    seed: 12345,
  });

  // String states for inputs
  const [replicationsStr, setReplicationsStr] = useState("200");
  const [horizonStr, setHorizonStr] = useState("60");
  const [femaleArrivalStr, setFemaleArrivalStr] = useState("0.6");
  const [maleArrivalStr, setMaleArrivalStr] = useState("0.6");
  const [stallsStr, setStallsStr] = useState(String(initialCaps.stalls));
  const [urinalsStr, setUrinalsStr] = useState(String(initialCaps.urinals));
  const [sinksStr, setSinksStr] = useState(String(initialCaps.sinks));

  const COLOR_WOMEN = '#e91e63';
  const COLOR_MEN = '#3f51b5';

  // Apply layout preset
  const applyLayout = useCallback((layoutId: string) => {
    setSelectedLayout(layoutId);
    const caps = layoutToParams(layoutId);
    setStallsStr(String(caps.stalls));
    setUrinalsStr(String(caps.urinals));
    setSinksStr(String(caps.sinks));
    setParams(prev => ({
      ...prev,
      caps: { cStall: caps.stalls, cUrinal: caps.urinals, cSink: caps.sinks }
    }));
  }, []);

  const runBatch = useCallback(async () => {
    setRunning(true);
    setResult(null);

    const worker = new Worker(
      new URL("../engine/batchWorker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      setResult(e.data);
      setRunning(false);
      worker.terminate();
    };

    worker.onerror = (e) => {
      console.error("Worker error:", e);
      setRunning(false);
      worker.terminate();
    };

    const msg: WorkerIn = { cmd: "runBatch", params };
    worker.postMessage(msg);
  }, [params]);

  const avgWaitCI = result
    ? confidenceInterval(result.perReplication.avgWaitTotalSec)
    : null;
  const utilCI = result
    ? {
        stall: confidenceInterval(result.perReplication.utilStall),
        urinal: confidenceInterval(result.perReplication.utilUrinal),
        sink: confidenceInterval(result.perReplication.utilSink),
      }
    : null;

  const femaleTIS =
    result?.perCustomer.timeInSystemSec.filter((_, i) => result.perCustomer.gender[i] === "F") ??
    [];
  const maleTIS =
    result?.perCustomer.timeInSystemSec.filter((_, i) => result.perCustomer.gender[i] === "M") ??
    [];

  const allTIS = result?.perCustomer.timeInSystemSec ?? [];
  const combinedMin = allTIS.length > 0 ? Math.min(...allTIS) : 0;
  const combinedMax = allTIS.length > 0 ? Math.max(...allTIS) : 0;
  
  const histDataAll = result && allTIS.length > 0
    ? createHistogram(allTIS, 30, combinedMin, combinedMax)
    : [];
  const histDataFemale = result && femaleTIS.length > 0
    ? createHistogram(femaleTIS, 30, combinedMin, combinedMax)
    : [];
  const histDataMale = result && maleTIS.length > 0
    ? createHistogram(maleTIS, 30, combinedMin, combinedMax)
    : [];

  const combinedHistData = result && histDataAll.length > 0 ? histDataAll.map((bin, idx) => ({
    range: bin.range,
    count: bin.count,
    female: histDataFemale[idx]?.count ?? 0,
    male: histDataMale[idx]?.count ?? 0,
  })) : [];

  const formatSecondsLabel = (value: unknown): ReactNode => {
    if (typeof value === "number") return value.toFixed(1);
    if (value == null) return "";
    return String(value);
  };
  const formatPercentLabel = (value: unknown): ReactNode => {
    if (typeof value === "number") return `${(value * 100).toFixed(0)}%`;
    if (value == null) return "";
    return String(value);
  };

  const currentLayout = ARTICLE_LAYOUTS.find(l => l.id === selectedLayout);

  return (
    <div
      style={{
        padding: "2rem",
        color: "#ffffff",
        height: "100%",
        overflow: "auto",
        background: "linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "1.5rem", color: "#ffffff", fontWeight: 800 }}>
        📊 Batch Simulation Analysis
      </h2>
      
      <p style={{ marginBottom: "1.5rem", color: "#a0aec0", fontSize: "0.95rem" }}>
        Run Monte Carlo simulations to analyze queue behavior across different layout configurations.
        Results are based on the DES (Discrete Event Simulation) engine with statistical distributions.
      </p>

      <div style={{ 
        marginBottom: "2rem", 
        padding: "1.5rem", 
        backgroundColor: "rgba(255,255,255,0.05)", 
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <h3 style={{ marginTop: 0, color: "#ffffff" }}>Simulation Parameters</h3>

        {/* Layout Presets from Article */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#e2e8f0" }}>
            📐 Layout Preset (from Research):
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {ARTICLE_LAYOUTS.map(layout => (
            <button
                key={layout.id}
                onClick={() => applyLayout(layout.id)}
              disabled={running}
              style={{
                  padding: "10px",
                  border: selectedLayout === layout.id ? "2px solid #8b5cf6" : "1px solid #4a5568",
                  borderRadius: "8px",
                  background: selectedLayout === layout.id ? "rgba(139,92,246,0.2)" : "rgba(0,0,0,0.2)",
                  color: "#e2e8f0",
                  cursor: running ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontSize: "0.8rem"
                }}
              >
                <div style={{ fontWeight: 600 }}>{layout.name.replace("Layout ", "L")}</div>
                <div style={{ opacity: 0.7, fontSize: "0.7rem" }}>{layout.areaRatio}</div>
              </button>
            ))}
          </div>
          {currentLayout && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#a0aec0" }}>
              <strong>{currentLayout.name}:</strong> {currentLayout.description}
            </div>
          )}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Facilities */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#e2e8f0" }}>Facilities</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🚽 Total Stalls:</span>
                <input
                  type="number"
                  min="1"
                  value={stallsStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStallsStr(val);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, caps: { ...params.caps, cStall: num } });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🚻 Urinals:</span>
                <input
                  type="number"
                  min="0"
                  value={urinalsStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUrinalsStr(val);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 0) {
                      setParams({ ...params, caps: { ...params.caps, cUrinal: num } });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🚰 Sinks:</span>
                <input
                  type="number"
                  min="1"
                  value={sinksStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSinksStr(val);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, caps: { ...params.caps, cSink: num } });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
            </div>
          </div>

          {/* Arrival Rates */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#e2e8f0" }}>Arrival Rates (λ per min)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>♀ Women:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={femaleArrivalStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFemaleArrivalStr(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0) {
                      setParams({ 
                        ...params, 
                        arrivals: { 
                          ...params.arrivals, 
                          female: [{ tStartMin: 0, tEndMin: params.horizonMin, lambdaPerMin: num }]
                        } 
                      });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>♂ Men:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={maleArrivalStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaleArrivalStr(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0) {
                      setParams({ 
                        ...params, 
                        arrivals: { 
                          ...params.arrivals, 
                          male: [{ tStartMin: 0, tEndMin: params.horizonMin, lambdaPerMin: num }]
                        } 
                      });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <div style={{ fontSize: "0.8rem", color: "#a0aec0", marginTop: "0.25rem" }}>
                Equal rates = 50/50 gender mix
              </div>
            </div>
          </div>

          {/* Service Times (read-only display) */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#e2e8f0" }}>Service Times (from research)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem", color: "#a0aec0" }}>
              <div>♀ Stall: ~{Math.exp(params.services.female.mu).toFixed(0)}s (lognormal)</div>
              <div>♂ Stall: ~{Math.exp(params.services.male.mu).toFixed(0)}s (lognormal)</div>
              <div>🚻 Urinal: ~{Math.exp(params.services.urinal.mu).toFixed(0)}s (lognormal)</div>
              <div>🚰 Sink: ~{((params.services.sink.k ?? 2.2) * (params.services.sink.theta ?? 3.2)).toFixed(0)}s (gamma)</div>
            </div>
          </div>

          {/* Simulation Settings */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#e2e8f0" }}>Simulation Settings</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Replications:</span>
                <input
                  type="number"
                  value={replicationsStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReplicationsStr(val);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, replications: num });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Duration (min):</span>
                <input
                  type="number"
                  value={horizonStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHorizonStr(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, horizonMin: num });
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #4a5568", borderRadius: "4px", color: "#e2e8f0" }}
                />
              </label>
              <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>
                Warmup: Auto-detected (convergence-based)
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={runBatch}
          disabled={running}
          style={{
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: running ? "not-allowed" : "pointer",
            background: running ? "#4a5568" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            opacity: running ? 0.6 : 1,
            boxShadow: running ? "none" : "0 4px 15px rgba(16,185,129,0.4)",
          }}
        >
          {running ? "⏳ Running Simulation..." : "▶ Run Batch Simulation"}
        </button>
      </div>

      {result && (
        <>
          {/* Results Summary */}
          <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>📈 Results Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>Total Customers</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>{result.perCustomer.timeInSystemSec.length}</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>Replications</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6" }}>{result.meta.replications}</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>Warmup Period</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>{result.meta.ignoredWarmupMin.toFixed(1)} min</div>
              </div>
            </div>
          </div>

          {/* Confidence Intervals */}
          <div style={{ 
            marginBottom: "2rem", 
            padding: "1.5rem", 
            backgroundColor: "rgba(255,255,255,0.05)", 
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>📊 Statistical Analysis (95% CI)</h3>
            
            {/* Wait times by gender */}
            {result && (() => {
              const femaleWaits = result.perCustomer.waitFixtureSec
                .map((w, i) => w + result.perCustomer.waitSinkSec[i])
                .filter((_, i) => result.perCustomer.gender[i] === "F");
              const maleWaits = result.perCustomer.waitFixtureSec
                .map((w, i) => w + result.perCustomer.waitSinkSec[i])
                .filter((_, i) => result.perCustomer.gender[i] === "M");
              const femaleCI = confidenceInterval(femaleWaits);
              const maleCI = confidenceInterval(maleWaits);
              
              const genderGap = femaleCI.mean - maleCI.mean;
              const genderGapPercent = maleCI.mean > 0 ? (genderGap / maleCI.mean) * 100 : 0;
              
              return (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>♀ Women Avg Wait</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: COLOR_WOMEN }}>{femaleCI.mean.toFixed(1)}s</div>
                      <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>CI: [{femaleCI.ciLower.toFixed(1)}, {femaleCI.ciUpper.toFixed(1)}]</div>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>♂ Men Avg Wait</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: COLOR_MEN }}>{maleCI.mean.toFixed(1)}s</div>
                      <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>CI: [{maleCI.ciLower.toFixed(1)}, {maleCI.ciUpper.toFixed(1)}]</div>
                    </div>
                    <div style={{ 
                      background: genderGap > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", 
                      padding: "1rem", 
                      borderRadius: "8px",
                      border: genderGap > 0 ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(16,185,129,0.5)"
                    }}>
                      <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>⚖️ Gender Gap</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: genderGap > 0 ? "#ef4444" : "#10b981" }}>
                        {genderGap > 0 ? "+" : ""}{genderGap.toFixed(1)}s
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>
                        Women wait {Math.abs(genderGapPercent).toFixed(0)}% {genderGap > 0 ? "longer" : "less"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {utilCI && (
              <div>
                <h4 style={{ color: "#e2e8f0", marginBottom: "0.5rem" }}>Resource Utilization</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>🚽 Stalls</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{(utilCI.stall.mean * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>🚻 Urinals</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{(utilCI.urinal.mean * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#a0aec0" }}>🚰 Sinks</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{(utilCI.sink.mean * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Histogram */}
          <div style={{ 
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>📊 Time in System Distribution</h3>
            {combinedHistData.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}>
                No data available
              </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                <BarChart data={combinedHistData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis 
                    dataKey="range" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke="#a0aec0"
                    tick={{ fill: "#a0aec0", fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#a0aec0"
                    tick={{ fill: "#a0aec0" }}
                    label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#a0aec0" }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a202c", border: "1px solid #4a5568", color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="female" fill={COLOR_WOMEN} name="Women" isAnimationActive={false} />
                  <Bar dataKey="male" fill={COLOR_MEN} name="Men" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
            )}
          </div>

        {/* ECDF Chart */}
        <div style={{ 
          marginBottom: "2rem",
          padding: "1.5rem",
            backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>📈 ECDF: Time in System</h3>
            <p style={{ fontSize: "0.85rem", color: "#a0aec0", marginBottom: "1rem" }}>
              For any time x, shows the fraction of people with time ≤ x. Steeper = faster service.
          </p>
            {femaleTIS.length > 0 || maleTIS.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                {(() => {
                  const femaleECDF = femaleTIS.length > 0
                    ? [...femaleTIS].sort((a,b)=>a-b).map((v,i,arr)=>({ time: v, female: (i+1)/arr.length }))
                    : [];
                  const maleECDF = maleTIS.length > 0
                    ? [...maleTIS].sort((a,b)=>a-b).map((v,i,arr)=>({ time: v, male: (i+1)/arr.length }))
                    : [];
                  
                  const allPoints = new Map<number, {time: number; female?: number; male?: number}>();
                  femaleECDF.forEach(pt => allPoints.set(pt.time, { time: pt.time, female: pt.female }));
                  maleECDF.forEach(pt => {
                    const existing = allPoints.get(pt.time);
                    if (existing) {
                      existing.male = pt.male;
                    } else {
                      allPoints.set(pt.time, { time: pt.time, male: pt.male });
                    }
                  });
                  
                  const combinedData = Array.from(allPoints.values()).sort((a,b) => a.time - b.time);
                  
                  return (
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                      <XAxis 
                        type="number" 
                        dataKey="time" 
                        stroke="#a0aec0" 
                        tick={{fill:'#a0aec0'}} 
                        label={{value:'Time (sec)', position:'insideBottom', offset: -5, fill:'#a0aec0'}} 
                      />
                      <YAxis 
                        type="number" 
                        domain={[0,1]} 
                        stroke="#a0aec0" 
                        tick={{fill:'#a0aec0'}} 
                        label={{value:'ECDF', angle:-90, position:'insideLeft', fill:'#a0aec0'}} 
                      />
                      <Tooltip contentStyle={{ backgroundColor:'#1a202c', border:'1px solid #4a5568', color:'#e2e8f0' }} />
                      <Legend />
                      <Line dataKey="female" name="Women" stroke={COLOR_WOMEN} strokeWidth={3} dot={false} type="stepAfter" isAnimationActive={false} connectNulls={false} />
                      <Line dataKey="male" name="Men" stroke={COLOR_MEN} strokeWidth={3} dot={false} type="stepAfter" isAnimationActive={false} connectNulls={false} />
                    </LineChart>
                  );
                })()}
              </ResponsiveContainer>
          ) : (
              <div style={{ padding:'1rem', opacity:0.7 }}>No ECDF data available</div>
          )}
        </div>

          {/* Percentiles Summary */}
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>📋 Wait Time Percentiles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <h4 style={{ color: COLOR_WOMEN, marginBottom: "0.5rem" }}>♀ Women</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem", fontSize: "0.9rem" }}>
                  <span>p50 (median):</span><span style={{ fontWeight: 600 }}>{percentile(femaleTIS, 0.5).toFixed(1)}s</span>
                  <span>p75:</span><span style={{ fontWeight: 600 }}>{percentile(femaleTIS, 0.75).toFixed(1)}s</span>
                  <span>p90:</span><span style={{ fontWeight: 600 }}>{percentile(femaleTIS, 0.9).toFixed(1)}s</span>
                  <span>p95:</span><span style={{ fontWeight: 600 }}>{percentile(femaleTIS, 0.95).toFixed(1)}s</span>
                  <span>p99:</span><span style={{ fontWeight: 600 }}>{percentile(femaleTIS, 0.99).toFixed(1)}s</span>
            </div>
          </div>
              <div>
                <h4 style={{ color: COLOR_MEN, marginBottom: "0.5rem" }}>♂ Men</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem", fontSize: "0.9rem" }}>
                  <span>p50 (median):</span><span style={{ fontWeight: 600 }}>{percentile(maleTIS, 0.5).toFixed(1)}s</span>
                  <span>p75:</span><span style={{ fontWeight: 600 }}>{percentile(maleTIS, 0.75).toFixed(1)}s</span>
                  <span>p90:</span><span style={{ fontWeight: 600 }}>{percentile(maleTIS, 0.9).toFixed(1)}s</span>
                  <span>p95:</span><span style={{ fontWeight: 600 }}>{percentile(maleTIS, 0.95).toFixed(1)}s</span>
                  <span>p99:</span><span style={{ fontWeight: 600 }}>{percentile(maleTIS, 0.99).toFixed(1)}s</span>
            </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
