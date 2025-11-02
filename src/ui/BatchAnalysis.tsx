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
    arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (arr.length - 1) // sample std
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
  
  // Handle edge case where all values are the same
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
    // Include the last value in the last bin
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

export default function BatchAnalysis() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkerOut_Batch | null>(null);
  const [preset, setPreset] = useState<'sports'|'airport'|'custom'>('sports')
  const [params, setParams] = useState<BatchParams>({
    arrivals: {
      female: [{ tStartMin: 0, tEndMin: 60, lambdaPerMin: 0.6 }],
      male: [{ tStartMin: 0, tEndMin: 60, lambdaPerMin: 0.6 }],
      pMaleUrinal: 0.85,
    },
    services: {
      female: { dist: "lognormal", mu: Math.log(75), sigma: 0.6 },
      male: { dist: "lognormal", mu: Math.log(60), sigma: 0.5 },
      urinal: { dist: "lognormal", mu: Math.log(28), sigma: 0.4 },
      sink: { dist: "gamma", k: 2.2, theta: 3.2 },
    },
    caps: { cStall: 3, cUrinal: 2, cSink: 1 },
    delays: { walkToFixtureSec: 5, walkToSinkSec: 4, walkToExitSec: 4 },
    warmupMin: 0, // Will be auto-detected
    horizonMin: 60,
    replications: 200,
    seed: 12345,
  });

  // String states for inputs to allow clearing
  const [replicationsStr, setReplicationsStr] = useState("200");
  const [horizonStr, setHorizonStr] = useState("60");
  const [femaleArrivalStr, setFemaleArrivalStr] = useState("0.6");
  const [maleArrivalStr, setMaleArrivalStr] = useState("0.6");
  // String states for facilities to allow clearing while typing
  const [stallsStr, setStallsStr] = useState(String(3));
  const [urinalsStr, setUrinalsStr] = useState(String(2));
  const [sinksStr, setSinksStr] = useState(String(1));

  const COLOR_WOMEN = '#ff6ba8'
  const COLOR_MEN = '#7c3aed'

  // Apply preset usage times (locked unless custom)
  const applyPreset = useCallback((p: 'sports'|'airport'|'custom')=>{
    setPreset(p)
    if(p==='custom') return
    const presets = {
      sports: { female: 152.5, male: 83.6 },
      airport:{ female: 165,   male: 112.5 },
    } as const
    const sel = p==='sports'?presets.sports: presets.airport
    setParams(prev=>({
      ...prev,
      services: {
        ...prev.services,
        female: { dist:'lognormal', mu: Math.log(sel.female), sigma: 0.6 },
        male:   { dist:'lognormal', mu: Math.log(sel.male),   sigma: 0.5 },
      }
    }))
  }, [])

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

  // Create histograms for both genders using the same bin ranges
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

  // Combine histograms for overlay (use same bin ranges)
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

  // Debug: log histogram data
  if (result && histDataAll.length > 0) {
    console.log('Histogram data:', histDataAll.slice(0, 5), '... total bins:', histDataAll.length);
    console.log('Total customers:', result.perCustomer.timeInSystemSec.length);
  }

  return (
    <div
      style={{
        padding: "2rem",
        color: "#ffffff",
        height: "100%",
        overflow: "auto",
        backgroundColor: "#b9d2ea",
        backgroundImage: [
          // horizontal lines every 32px
          "repeating-linear-gradient(0deg, rgba(140,170,200,0.35) 0, rgba(140,170,200,0.35) 31px, rgba(100,140,180,0.6) 31px, rgba(100,140,180,0.6) 32px)",
          // vertical lines every 32px
          "repeating-linear-gradient(90deg, rgba(140,170,200,0.35) 0, rgba(140,170,200,0.35) 31px, rgba(100,140,180,0.6) 31px, rgba(100,140,180,0.6) 32px)"
        ].join(',')
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "1.5rem", color: "#ffffff", fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>Batch Simulation Analysis</h2>

      <div style={{ 
        marginBottom: "2rem", 
        padding: "1.5rem", 
        backgroundColor: "rgba(14,39,64,0.92)", 
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#f5f9ff",
        boxShadow: "0 12px 25px rgba(10,20,40,0.2)"
      }}>
        <h3 style={{ marginTop: 0, color: "#f5f9ff", textShadow:'0 1px 2px rgba(0,0,0,0.4)' }}>Simulation Parameters</h3>

        {/* Presets */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'1rem', flexWrap:'wrap' }}>
          {(['sports','airport','custom'] as const).map(key=> (
            <button
              key={key}
              onClick={()=>applyPreset(key)}
              disabled={running}
              style={{
                padding:'6px 12px',
                border:'1px solid #333',
                borderRadius:'6px',
                background: preset===key? '#1b75bb': '#1f2a35',
                color: '#eee'
              }}
            >{key==='sports'?'Sports Arena': key==='airport'?'Airport':'Custom'}</button>
          ))}
          <div style={{opacity:0.7, fontSize:'0.9em', alignSelf:'center'}}>Usage times are locked unless Custom is selected.</div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Facilities */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#ffffff" }}>Facilities</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Stalls:</span>
                <input
                  type="number"
                  min="1"
                  value={stallsStr}
                  onChange={(e) => {
                    const val = e.target.value
                    setStallsStr(val)
                    const num = parseInt(val, 10)
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, caps: { ...params.caps, cStall: num } })
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Urinals:</span>
                <input
                  type="number"
                  min="0"
                  value={urinalsStr}
                  onChange={(e) => {
                    const val = e.target.value
                    setUrinalsStr(val)
                    const num = parseInt(val, 10)
                    if (!isNaN(num) && num >= 0) {
                      setParams({ ...params, caps: { ...params.caps, cUrinal: num } })
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Sinks:</span>
                <input
                  type="number"
                  min="1"
                  value={sinksStr}
                  onChange={(e) => {
                    const val = e.target.value
                    setSinksStr(val)
                    const num = parseInt(val, 10)
                    if (!isNaN(num) && num > 0) {
                      setParams({ ...params, caps: { ...params.caps, cSink: num } })
                    }
                  }}
                  disabled={running}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
            </div>
          </div>

          {/* Arrival Rates */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#ffffff" }}>Arrival Rates (Poisson, per min)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Women (λ):</span>
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
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Men (λ):</span>
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
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
            </div>
          </div>

          {/* Usage Times */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#ffffff" }}>Usage Times (avg sec)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9em" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Women (stall):</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={Math.exp(params.services.female.mu).toFixed(0)}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num > 0) {
                      setParams({ 
                        ...params, 
                        services: { 
                          ...params.services, 
                          female: { dist: "lognormal", mu: Math.log(num), sigma: params.services.female.sigma }
                        } 
                      });
                    }
                  }}
                  disabled={running || preset!=='custom'}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Men (stall):</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={Math.exp(params.services.male.mu).toFixed(0)}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num > 0) {
                      setParams({ 
                        ...params, 
                        services: { 
                          ...params.services, 
                          male: { dist: "lognormal", mu: Math.log(num), sigma: params.services.male.sigma }
                        } 
                      });
                    }
                  }}
                  disabled={running || preset!=='custom'}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Urinal:</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={Math.exp(params.services.urinal.mu).toFixed(0)}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num > 0) {
                      setParams({ 
                        ...params, 
                        services: { 
                          ...params.services, 
                          urinal: { dist: "lognormal", mu: Math.log(num), sigma: params.services.urinal.sigma }
                        } 
                      });
                    }
                  }}
                  disabled={running || preset!=='custom'}
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
            </div>
          </div>

          {/* Simulation Settings */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95em", color: "#ffffff" }}>Simulation Settings</h4>
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
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Simulation Duration (min):</span>
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
                  style={{ width: "80px", padding: "6px", backgroundColor: "#0e0e0e", border: "1px solid #333", borderRadius: "4px", color: "#eee" }}
                />
              </label>
              <div style={{ opacity: 0.7, fontStyle: "italic", fontSize: "0.9em", paddingTop: "0.5rem" }}>
                Warmup: <span style={{ color: "#f5f9ff" }}>Auto-detected</span> (convergence-based)
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={runBatch}
          disabled={running}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: running ? "not-allowed" : "pointer",
            backgroundColor: running ? "#333" : "#60a5fa",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            transition: "all 0.2s",
            opacity: running ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!running) {
              e.currentTarget.style.backgroundColor = "#4a9fff";
            }
          }}
          onMouseLeave={(e) => {
            if (!running) {
              e.currentTarget.style.backgroundColor = "#60a5fa";
            }
          }}
        >
          {running ? "Running Simulation..." : "▶ Run Batch Simulation"}
        </button>
      </div>

      {result && (
        <>
          {/* Simulation Results Summary */}
          <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#1a1a1a", borderRadius: "12px", border: "1px solid #2a2a2a" }}>
          <h3 style={{ marginTop: 0, color: "#ffffff" }}>Simulation Results Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div>
                <h4 style={{ marginTop: 0, color: "#f5f9ff" }}>Facilities</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Stalls: <strong>{params.caps.cStall}</strong></li>
                  <li>Urinals: <strong>{params.caps.cUrinal}</strong></li>
                  <li>Sinks: <strong>{params.caps.cSink}</strong></li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginTop: 0, color: "#f5f9ff" }}>Arrival Rates</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Women: <strong>{params.arrivals.female[0]?.lambdaPerMin ?? 0} per min</strong></li>
                  <li>Men: <strong>{params.arrivals.male[0]?.lambdaPerMin ?? 0} per min</strong></li>
                  <li>Male Urinal Preference: <strong>{(params.arrivals.pMaleUrinal * 100).toFixed(0)}%</strong></li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginTop: 0, color: "#f5f9ff" }}>Usage Times (avg)</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Women (stall): <strong>{Math.exp(params.services.female.mu).toFixed(1)}s</strong> (lognormal)</li>
                  <li>Men (stall): <strong>{Math.exp(params.services.male.mu).toFixed(1)}s</strong> (lognormal)</li>
                  <li>Urinal: <strong>{Math.exp(params.services.urinal.mu).toFixed(1)}s</strong> (lognormal)</li>
                  <li>Sink: <strong>{(params.services.sink.k && params.services.sink.theta ? (params.services.sink.k * params.services.sink.theta).toFixed(1) : 'N/A')}s</strong> (gamma)</li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginTop: 0, color: "#f5f9ff" }}>Walking Times</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>To Fixture: <strong>{params.delays.walkToFixtureSec}s</strong></li>
                  <li>To Sink: <strong>{params.delays.walkToSinkSec}s</strong></li>
                  <li>To Exit: <strong>{params.delays.walkToExitSec}s</strong></li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginTop: 0, color: "#f5f9ff" }}>Simulation Setup</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Replications: <strong>{result.meta.replications}</strong></li>
                  <li>Simulation Duration: <strong>{result.meta.horizonMin} min</strong></li>
                  <li>Warmup: <strong>{result.meta.ignoredWarmupMin > 0 ? `${result.meta.ignoredWarmupMin.toFixed(1)} min` : 'Auto-detecting...'}</strong> {result.meta.ignoredWarmupMin > 0 && '(convergence-based)'}</li>
                  <li>Total Customers: <strong>{result.perCustomer.timeInSystemSec.length}</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ 
            marginBottom: "2rem", 
            padding: "1.5rem", 
            backgroundColor: "rgba(14,39,64,0.92)", 
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            color: '#f5f9ff',
            boxShadow:'0 12px 25px rgba(10,20,40,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff" }}>Confidence Intervals</h3>
            <p style={{ marginTop: 6, marginBottom: 12, color: '#d3e3ff' }}>
              Average total wait time combines waiting before fixtures and sinks; 95% CI shows uncertainty across replications.
            </p>
            
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
              const overallCI = avgWaitCI;
              
              return (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Average Total Wait Time:</strong>
                  <div style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
                    <div><strong>Overall:</strong> {overallCI?.mean.toFixed(2) ?? 0}s (95% CI: [{overallCI?.ciLower.toFixed(2) ?? 0}, {overallCI?.ciUpper.toFixed(2) ?? 0}])</div>
                    <div style={{ marginTop: "0.25rem" }}>
                      <strong>Women:</strong> {femaleCI.mean.toFixed(2)}s (95% CI: [{femaleCI.ciLower.toFixed(2)}, {femaleCI.ciUpper.toFixed(2)}])
                    </div>
                    <div style={{ marginTop: "0.25rem" }}>
                      <strong>Men:</strong> {maleCI.mean.toFixed(2)}s (95% CI: [{maleCI.ciLower.toFixed(2)}, {maleCI.ciUpper.toFixed(2)}])
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {utilCI && (
              <div>
                <strong>Resource Utilization:</strong>
                <p style={{ fontSize: "0.9em", opacity: 0.8, margin: "0.25rem 0 0.5rem 0" }}>
                  Percentage of time that resources are busy (e.g., 10% means stalls are occupied 10% of the time)
                </p>
                <ul style={{ marginTop: "0.5rem" }}>
                  <li>
                    <strong>Stalls:</strong> {(utilCI.stall.mean * 100).toFixed(1)}% (95% CI: [
                    {(utilCI.stall.ciLower * 100).toFixed(1)},{" "}
                    {(utilCI.stall.ciUpper * 100).toFixed(1)}])
                  </li>
                  <li>
                    <strong>Urinals:</strong> {(utilCI.urinal.mean * 100).toFixed(1)}% (95% CI: [
                    {(utilCI.urinal.ciLower * 100).toFixed(1)},{" "}
                    {(utilCI.urinal.ciUpper * 100).toFixed(1)}])
                  </li>
                  <li>
                    <strong>Sinks:</strong> {(utilCI.sink.mean * 100).toFixed(1)}% (95% CI: [
                    {(utilCI.sink.ciLower * 100).toFixed(1)},{" "}
                    {(utilCI.sink.ciUpper * 100).toFixed(1)}])
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div style={{ 
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "rgba(14,39,64,0.92)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            color:'#f5f9ff',
            boxShadow:'0 12px 25px rgba(10,20,40,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff", textShadow:'0 1px 2px rgba(0,0,0,0.4)' }}>Histogram: Time in System by Gender</h3>
            <p style={{ fontSize: "0.9em", marginBottom: "1rem", color: "#d3e3ff" }}>
              Distribution of total time in system (from arrival to exit), comparing women vs men
            </p>
            {combinedHistData.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}>
                No data available for histogram
              </div>
            ) : (
              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={combinedHistData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="range" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke="#ccc"
                    tick={{ fill: "#ccc", fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#ccc"
                    tick={{ fill: "#ccc" }}
                    label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#ccc" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#2a2a2a", 
                      border: "1px solid #444",
                      color: "#eee"
                    }}
                    labelStyle={{ color: "#f5f9ff", fontWeight: "bold" }}
                  />
                  <Legend 
                    wrapperStyle={{ color: "#ccc", paddingTop: "10px" }}
                  />
                  <Bar 
                    dataKey="female" 
                    fill="#ff6ba8"
                    fillOpacity={0.8}
                    stroke="#ff6ba8" 
                    strokeWidth={1}
                    name="Women"
                    isAnimationActive={false}
                    minPointSize={1}
                  />
                  <Bar 
                    dataKey="male" 
                    fill="#7c3aed"
                    fillOpacity={0.8}
                    stroke="#7c3aed" 
                    strokeWidth={1}
                    name="Men"
                    isAnimationActive={false}
                    minPointSize={1}
                  />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        {/* ECDF Chart */}
        <div style={{ 
          marginBottom: "2rem",
          padding: "1.5rem",
          backgroundColor: "rgba(14,39,64,0.92)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          color:'#f5f9ff',
          boxShadow:'0 12px 25px rgba(10,20,40,0.2)'
        }}>
          <h3 style={{ marginTop: 0, color: "#ffffff", textShadow:'0 1px 2px rgba(0,0,0,0.4)' }}>ECDF: Time in System</h3>
          <p style={{ marginTop: 6, marginBottom: 12, color:'#d3e3ff' }}>
            ECDF shows, for any time x, the fraction of people whose time in system is ≤ x.
          </p>
          {result && (femaleTIS.length>0 || maleTIS.length>0) ? (
            <div style={{ backgroundColor: '#dce9f7', padding: '14px', borderRadius: '10px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={320}>
                {(() => {
                  // Create ECDF arrays
                  const femaleECDF = femaleTIS.length > 0
                    ? [...femaleTIS].sort((a,b)=>a-b).map((v,i,arr)=>({ time: v, female: (i+1)/arr.length }))
                    : [];
                  const maleECDF = maleTIS.length > 0
                    ? [...maleTIS].sort((a,b)=>a-b).map((v,i,arr)=>({ time: v, male: (i+1)/arr.length }))
                    : [];
                  
                  // Merge both ECDFs into a single array sorted by time
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#334960" />
                      <XAxis 
                        type="number" 
                        dataKey="time" 
                        stroke="#224066" 
                        tick={{fill:'#224066', fontWeight: 600}} 
                        label={{value:'Time in System (seconds)', position:'insideBottom', offset: -5, fill:'#224066', fontWeight: 600}} 
                      />
                      <YAxis 
                        type="number" 
                        domain={[0,1]} 
                        stroke="#224066" 
                        tick={{fill:'#224066', fontWeight: 600}} 
                        label={{value:'ECDF (fraction ≤ x)', angle:-90, position:'insideLeft', fill:'#224066', fontWeight: 600}} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor:'#1f2933', border:'1px solid #556', color:'#f5f9ff' }}
                        formatter={(value: number) => value.toFixed(3)}
                      />
                      <Legend wrapperStyle={{ color:'#f5f9ff' }} />
                      <Line 
                        dataKey="female" 
                        name="Women ECDF" 
                        stroke={COLOR_WOMEN} 
                        strokeWidth={4} 
                        dot={false} 
                        type="stepAfter"
                        isAnimationActive={false}
                        connectNulls={false}
                      />
                      <Line 
                        dataKey="male" 
                        name="Men ECDF" 
                        stroke={COLOR_MEN} 
                        strokeWidth={4} 
                        dot={false} 
                        type="stepAfter"
                        isAnimationActive={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding:'1rem', opacity:0.9, color:'#f5f9ff' }}>No ECDF data available</div>
          )}
        </div>

          {/* Time in System by Gender */}
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "rgba(14,39,64,0.92)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            color: '#f5f9ff',
            boxShadow:'0 12px 25px rgba(10,20,40,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff", textShadow:'0 1px 2px rgba(0,0,0,0.4)' }}>Time in System by Gender</h3>
            <p style={{ marginTop: 6, marginBottom: 12, color: '#d3e3ff' }}>
              Mean and 95th percentile times in system by gender.
            </p>
            <div style={{ backgroundColor: '#dce9f7', padding: '14px', borderRadius: '10px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  barCategoryGap={40}
                  barGap={20}
                  data={[
                    {
                      gender: "Female",
                      mean: femaleTIS.length > 0
                        ? femaleTIS.reduce((a, b) => a + b, 0) / femaleTIS.length
                        : 0,
                      p95: percentile(femaleTIS, 0.95),
                    },
                    {
                      gender: "Male",
                      mean: maleTIS.length > 0
                        ? maleTIS.reduce((a, b) => a + b, 0) / maleTIS.length
                        : 0,
                      p95: percentile(maleTIS, 0.95),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334960" />
                  <XAxis
                    dataKey="gender"
                    stroke="#224066"
                    tick={{ fill: "#224066", fontWeight: 600 }}
                  />
                  <YAxis
                    stroke="#224066"
                    tick={{ fill: "#224066", fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2933",
                      border: "1px solid #556",
                      color: "#f5f9ff"
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#f5f9ff" }}
                  />
                  <Bar
                    dataKey="mean"
                    fill={COLOR_WOMEN}
                    fillOpacity={0.9}
                    name="Mean"
                    stroke={COLOR_WOMEN}
                    strokeWidth={2}
                    isAnimationActive={false}
                    minPointSize={6}
                    barSize={48}
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList dataKey="mean" position="top" fill="#224066" formatter={formatSecondsLabel} />
                  </Bar>
                  <Bar
                    dataKey="p95"
                    fill={COLOR_MEN}
                    fillOpacity={0.9}
                    name="95th Percentile"
                    stroke={COLOR_MEN}
                    strokeWidth={2}
                    isAnimationActive={false}
                    minPointSize={6}
                    barSize={48}
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList dataKey="p95" position="top" fill="#224066" formatter={formatSecondsLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {(!femaleTIS.length && !maleTIS.length) && (
              <div style={{ padding:'0.5rem 0', color:'#d3e3ff' }}>No time-in-system data available to summarize.</div>
            )}
          </div>

          {/* Utilization Across Replications */}
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "rgba(14,39,64,0.92)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            color:'#f5f9ff',
            boxShadow:'0 12px 25px rgba(10,20,40,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: "#ffffff", textShadow:'0 1px 2px rgba(0,0,0,0.4)' }}>Utilization Across Replications</h3>
            <p style={{ marginTop: 6, marginBottom: 12, color:'#d3e3ff' }}>
              Utilization shows how busy each resource is across the simulation duration.
            </p>
            <div style={{ backgroundColor: '#dce9f7', padding: '14px', borderRadius: '10px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  barCategoryGap={40}
                  barGap={20}
                  data={[
                    {
                      resource: "Stall",
                      mean: utilCI?.stall.mean ?? 0,
                    },
                    {
                      resource: "Urinal",
                      mean: utilCI?.urinal.mean ?? 0,
                    },
                    {
                      resource: "Sink",
                      mean: utilCI?.sink.mean ?? 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334960" />
                  <XAxis
                    dataKey="resource"
                    stroke="#224066"
                    tick={{ fill: "#224066", fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    stroke="#224066"
                    tick={{ fill: "#224066", fontWeight: 600 }}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2933",
                      border: "1px solid #556",
                      color: "#f5f9ff"
                    }}
                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  />
                  <Legend
                    wrapperStyle={{ color: "#f5f9ff" }}
                  />
                  <Bar
                    dataKey="mean"
                    fill={COLOR_MEN}
                    fillOpacity={0.9}
                    name="Mean Utilization"
                    stroke={COLOR_MEN}
                    strokeWidth={2}
                    isAnimationActive={false}
                    minPointSize={6}
                    barSize={48}
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList dataKey="mean" position="top" fill="#224066" formatter={formatPercentLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!utilCI && (
              <div style={{ padding:'0.5rem 0', color:'#d3e3ff' }}>No utilization could be computed for this run.</div>
            )}
            <p style={{ marginTop:'0.75rem', color:'#d3e3ff', fontSize:'0.9em' }}>
              Utilization is the fraction of time each resource is busy over the simulation duration. For example, 25% means the resource is occupied one quarter of the time across all replications.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

