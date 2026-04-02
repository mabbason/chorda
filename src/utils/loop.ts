import type { Measure } from "../models/song";

export interface LoopRange {
  startMeasure: number;
  endMeasure: number;
  startSec: number;
  endSec: number;
}

export function snapToMeasure(
  timeSec: number,
  measures: Measure[]
): number {
  if (measures.length === 0) return 0;

  for (let i = 0; i < measures.length; i++) {
    if (timeSec < measures[i].endSec) return i;
  }
  return measures.length - 1;
}

export function buildLoopRange(
  startMeasure: number,
  endMeasure: number,
  measures: Measure[]
): LoopRange | null {
  if (
    measures.length === 0 ||
    startMeasure < 0 ||
    endMeasure >= measures.length ||
    startMeasure > endMeasure
  ) {
    return null;
  }

  return {
    startMeasure,
    endMeasure,
    startSec: measures[startMeasure].startSec,
    endSec: measures[endMeasure].endSec,
  };
}
