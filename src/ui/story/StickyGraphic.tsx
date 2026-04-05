import React from 'react';
import CrowdViz from './CrowdViz';
import StepChain from './StepChain';
import LayoutSpotlight from './LayoutSpotlight';
import RightRail from './RightRail';
import type { LayoutDataset, Snapshot } from './resultsStoryData';

export type StickyMode =
  | 'intro'
  | 'default'
  | 'queueGrow'
  | 'queueCompound'
  | 'stepChain'
  | 'spotlight';

interface Props {
  dataset: LayoutDataset;
  snapshot: Snapshot;
  reducedMotion: boolean;
  stickyMode: StickyMode;
}

const StickyGraphic: React.FC<Props> = ({ dataset, snapshot, reducedMotion, stickyMode }) => {
  const isIntro = stickyMode === 'intro';
  const showStepChain = stickyMode === 'stepChain';
  const showSpotlight = stickyMode === 'spotlight';
  const crowdDimmed = showStepChain;
  const highlightAssumptions = showStepChain;
  const showRightRail = !isIntro;
  const hasOverlay = showStepChain || showSpotlight;

  const queueLabel =
    stickyMode === 'queueGrow' ? '\u2191 queue grows' :
    stickyMode === 'queueCompound' ? 'compounding' : undefined;

  const crowdHeight =
    showSpotlight ? 'calc(32vh - 2rem)' :
    hasOverlay ? 'calc(55vh - 3rem)' :
    'calc(100vh - 8rem)';

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Main graphic column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Crowd viz with explicit viewport-based height */}
        <div style={{ height: crowdHeight, flexShrink: 0, transition: 'height 0.4s ease' }}>
          <CrowdViz
            people={dataset.people}
            positions={snapshot.positions}
            longWaitIds={snapshot.longWaitIds}
            dimmed={crowdDimmed}
            introMode={isIntro}
            queueLabel={queueLabel}
            reducedMotion={reducedMotion}
          />
        </div>

        {showStepChain && (
          <div style={{ marginTop: 10 }}>
            <StepChain
              visible
              womenTime={dataset.assumptions.womenServiceAvg}
              menTime={dataset.assumptions.menServiceAvg}
              reducedMotion={reducedMotion}
            />
          </div>
        )}
        {showSpotlight && (
          <div style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
            <LayoutSpotlight visible reducedMotion={reducedMotion} />
          </div>
        )}
      </div>

      {/* Right rail */}
      {showRightRail && (
        <div style={{ flexShrink: 0, width: 170 }}>
          <RightRail
            visible
            activeLayout={dataset.layoutId}
            metrics={snapshot.metrics}
            assumptions={dataset.assumptions}
            highlightAssumptions={highlightAssumptions}
            reducedMotion={reducedMotion}
          />
        </div>
      )}
    </div>
  );
};

export default StickyGraphic;
