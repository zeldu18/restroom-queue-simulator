export type Group = 'women' | 'men';
export type Zone = 'arrive' | 'womenQueue' | 'menQueue' | 'finished';

export interface Person { id: number; group: Group }

export interface Position { x: number; y: number; zone: Zone }

export interface SnapshotMetrics {
  womenAvgWait: number;
  menAvgWait: number;
  gap: number;
  servedByMinute5?: number;
}

export interface Snapshot {
  t: number;
  positions: Record<number, Position>;
  metrics: SnapshotMetrics;
  longWaitIds: number[];
}

export interface Assumptions {
  womenServiceAvg: number;
  menServiceAvg: number;
  demandMix: string;
}

export interface LayoutDataset {
  layoutId: string;
  label: string;
  assumptions: Assumptions;
  people: Person[];
  snapshots: Snapshot[];
}

export const SVG_W = 320;
export const SVG_H = 380;

function pos(zone: Zone, idx: number): Position {
  switch (zone) {
    case 'arrive':
      return { x: 28 + (idx % 10) * 28, y: 18 + Math.floor(idx / 10) * 22, zone };
    case 'womenQueue':
      return { x: 36 + (idx % 3) * 24, y: 105 + Math.floor(idx / 3) * 24, zone };
    case 'menQueue':
      return { x: SVG_W - 100 + (idx % 3) * 24, y: 105 + Math.floor(idx / 3) * 24, zone };
    case 'finished':
      return { x: 22 + (idx % 10) * 29, y: 308 + Math.floor(idx / 10) * 22, zone };
  }
}

const people: Person[] = [];
for (let i = 0; i < 50; i++) people.push({ id: i, group: 'women' });
for (let i = 50; i < 100; i++) people.push({ id: i, group: 'men' });

export { people };

interface ZoneDist { arrive: number; queue: number; finished: number }
interface FrameDist { women: ZoneDist; men: ZoneDist; metrics: SnapshotMetrics; longWaitCount: number }

function buildSnapshot(t: number, dist: FrameDist): Snapshot {
  const positions: Record<number, Position> = {};
  const wIdx = { arrive: 0, queue: 0, finished: 0 };
  const mIdx = { arrive: 0, queue: 0, finished: 0 };
  const longWaitIds: number[] = [];

  for (let i = 0; i < 50; i++) {
    if (wIdx.arrive < dist.women.arrive) { positions[i] = pos('arrive', wIdx.arrive++); }
    else if (wIdx.queue < dist.women.queue) {
      positions[i] = pos('womenQueue', wIdx.queue);
      if (wIdx.queue < dist.longWaitCount) longWaitIds.push(i);
      wIdx.queue++;
    }
    else { positions[i] = pos('finished', wIdx.finished++); }
  }

  for (let i = 50; i < 100; i++) {
    if (mIdx.arrive < dist.men.arrive) { positions[i] = pos('arrive', mIdx.arrive++); }
    else if (mIdx.queue < dist.men.queue) { positions[i] = pos('menQueue', mIdx.queue++); }
    else { positions[i] = pos('finished', 10 + mIdx.finished++); }
  }

  return { t, positions, metrics: dist.metrics, longWaitIds };
}

const ASSUMPTIONS: Assumptions = { womenServiceAvg: 90, menServiceAvg: 42, demandMix: '50 / 50' };

const layout1Frames: FrameDist[] = [
  { women: { arrive: 50, queue: 0, finished: 0 }, men: { arrive: 50, queue: 0, finished: 0 }, metrics: { womenAvgWait: 0, menAvgWait: 0, gap: 0 }, longWaitCount: 0 },
  { women: { arrive: 22, queue: 16, finished: 12 }, men: { arrive: 16, queue: 8, finished: 26 }, metrics: { womenAvgWait: 38, menAvgWait: 18, gap: 20 }, longWaitCount: 3 },
  { women: { arrive: 8, queue: 22, finished: 20 }, men: { arrive: 5, queue: 6, finished: 39 }, metrics: { womenAvgWait: 62, menAvgWait: 24, gap: 38 }, longWaitCount: 8 },
  { women: { arrive: 2, queue: 26, finished: 22 }, men: { arrive: 2, queue: 3, finished: 45 }, metrics: { womenAvgWait: 85, menAvgWait: 30, gap: 55, servedByMinute5: 67 }, longWaitCount: 14 },
  { women: { arrive: 0, queue: 22, finished: 28 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 88, menAvgWait: 32, gap: 56, servedByMinute5: 76 }, longWaitCount: 12 },
];

const layout3Frames: FrameDist[] = [
  layout1Frames[0],
  { women: { arrive: 20, queue: 12, finished: 18 }, men: { arrive: 18, queue: 9, finished: 23 }, metrics: { womenAvgWait: 30, menAvgWait: 20, gap: 10 }, longWaitCount: 2 },
  { women: { arrive: 6, queue: 14, finished: 30 }, men: { arrive: 6, queue: 7, finished: 37 }, metrics: { womenAvgWait: 48, menAvgWait: 28, gap: 20 }, longWaitCount: 4 },
  { women: { arrive: 2, queue: 16, finished: 32 }, men: { arrive: 2, queue: 5, finished: 43 }, metrics: { womenAvgWait: 58, menAvgWait: 32, gap: 26, servedByMinute5: 75 }, longWaitCount: 5 },
  { women: { arrive: 0, queue: 12, finished: 38 }, men: { arrive: 0, queue: 3, finished: 47 }, metrics: { womenAvgWait: 55, menAvgWait: 34, gap: 21, servedByMinute5: 85 }, longWaitCount: 3 },
];

const layout6Frames: FrameDist[] = [
  layout1Frames[0],
  { women: { arrive: 20, queue: 10, finished: 20 }, men: { arrive: 18, queue: 7, finished: 25 }, metrics: { womenAvgWait: 22, menAvgWait: 18, gap: 4 }, longWaitCount: 1 },
  { women: { arrive: 6, queue: 8, finished: 36 }, men: { arrive: 6, queue: 5, finished: 39 }, metrics: { womenAvgWait: 35, menAvgWait: 28, gap: 7 }, longWaitCount: 1 },
  { women: { arrive: 2, queue: 9, finished: 39 }, men: { arrive: 2, queue: 4, finished: 44 }, metrics: { womenAvgWait: 42, menAvgWait: 36, gap: 6, servedByMinute5: 83 }, longWaitCount: 1 },
  { women: { arrive: 0, queue: 6, finished: 44 }, men: { arrive: 0, queue: 3, finished: 47 }, metrics: { womenAvgWait: 44, menAvgWait: 38, gap: 6, servedByMinute5: 91 }, longWaitCount: 0 },
];

/** Story-only frames for layouts 2, 4, 5 (same viz structure as layout1; not live sim output). */
const layout2Frames: FrameDist[] = [
  layout1Frames[0],
  { women: { arrive: 20, queue: 10, finished: 20 }, men: { arrive: 18, queue: 9, finished: 23 }, metrics: { womenAvgWait: 28, menAvgWait: 22, gap: 6 }, longWaitCount: 1 },
  { women: { arrive: 8, queue: 14, finished: 28 }, men: { arrive: 6, queue: 7, finished: 37 }, metrics: { womenAvgWait: 42, menAvgWait: 36, gap: 6 }, longWaitCount: 2 },
  { women: { arrive: 2, queue: 14, finished: 34 }, men: { arrive: 2, queue: 3, finished: 45 }, metrics: { womenAvgWait: 50, menAvgWait: 40, gap: 10 }, longWaitCount: 3 },
  { women: { arrive: 0, queue: 12, finished: 38 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 46, menAvgWait: 42, gap: 4, servedByMinute5: 84 }, longWaitCount: 2 },
];

const layout4Frames: FrameDist[] = [
  layout1Frames[0],
  { women: { arrive: 20, queue: 12, finished: 18 }, men: { arrive: 18, queue: 4, finished: 28 }, metrics: { womenAvgWait: 32, menAvgWait: 14, gap: 18 }, longWaitCount: 2 },
  { women: { arrive: 8, queue: 22, finished: 20 }, men: { arrive: 5, queue: 3, finished: 42 }, metrics: { womenAvgWait: 58, menAvgWait: 16, gap: 42 }, longWaitCount: 6 },
  { women: { arrive: 0, queue: 22, finished: 28 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 88, menAvgWait: 18, gap: 70, servedByMinute5: 72 }, longWaitCount: 14 },
  { women: { arrive: 0, queue: 22, finished: 28 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 88, menAvgWait: 22, gap: 66, servedByMinute5: 76 }, longWaitCount: 12 },
];

const layout5Frames: FrameDist[] = [
  layout1Frames[0],
  { women: { arrive: 20, queue: 8, finished: 22 }, men: { arrive: 18, queue: 8, finished: 24 }, metrics: { womenAvgWait: 24, menAvgWait: 24, gap: 0 }, longWaitCount: 0 },
  { women: { arrive: 8, queue: 10, finished: 32 }, men: { arrive: 6, queue: 7, finished: 37 }, metrics: { womenAvgWait: 36, menAvgWait: 34, gap: 2 }, longWaitCount: 1 },
  { women: { arrive: 0, queue: 10, finished: 40 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 42, menAvgWait: 40, gap: 2, servedByMinute5: 88 }, longWaitCount: 0 },
  { women: { arrive: 0, queue: 8, finished: 42 }, men: { arrive: 0, queue: 2, finished: 48 }, metrics: { womenAvgWait: 40, menAvgWait: 38, gap: 2, servedByMinute5: 90 }, longWaitCount: 0 },
];

function buildDataset(layoutId: string, label: string, frames: FrameDist[]): LayoutDataset {
  return {
    layoutId,
    label,
    assumptions: ASSUMPTIONS,
    people,
    snapshots: frames.map((f, i) => buildSnapshot(i, f)),
  };
}

export const DATASETS: LayoutDataset[] = [
  buildDataset('layout1', 'Equal Space', layout1Frames),
  buildDataset('layout2', 'More for Women', layout2Frames),
  buildDataset('layout3', 'Minimal Waits', layout3Frames),
  buildDataset('layout4', 'High Throughput', layout4Frames),
  buildDataset('layout5', 'Fully Shared', layout5Frames),
  buildDataset('layout6', 'Mixed Access', layout6Frames),
];

export function getDataset(id: string): LayoutDataset {
  return DATASETS.find((d) => d.layoutId === id) ?? DATASETS[0];
}
