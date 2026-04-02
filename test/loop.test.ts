import { describe, it, expect } from "vitest";
import { snapToMeasure, buildLoopRange } from "../src/utils/loop";
import type { Measure } from "../src/models/song";

function makeMeasures(count: number, measureDuration: number = 2): Measure[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    startSec: i * measureDuration,
    endSec: (i + 1) * measureDuration,
  }));
}

describe("snapToMeasure", () => {
  const measures = makeMeasures(8); // 0-16 seconds, 2s each

  it("snaps time at start of measure to that measure", () => {
    expect(snapToMeasure(0, measures)).toBe(0);
    expect(snapToMeasure(4, measures)).toBe(2);
  });

  it("snaps time within a measure to that measure", () => {
    expect(snapToMeasure(0.5, measures)).toBe(0);
    expect(snapToMeasure(3.5, measures)).toBe(1);
    expect(snapToMeasure(5.9, measures)).toBe(2);
  });

  it("snaps time past end to last measure", () => {
    expect(snapToMeasure(100, measures)).toBe(7);
  });

  it("returns 0 for empty measures", () => {
    expect(snapToMeasure(5, [])).toBe(0);
  });

  it("handles time at exact measure boundary", () => {
    // Time 2.0 is the start of measure 1 (and end of measure 0)
    // Should return measure 1 since 2.0 < measures[1].endSec (4.0)
    expect(snapToMeasure(2.0, measures)).toBe(1);
  });
});

describe("buildLoopRange", () => {
  const measures = makeMeasures(8, 2);

  it("builds a valid loop range", () => {
    const range = buildLoopRange(1, 3, measures);
    expect(range).toEqual({
      startMeasure: 1,
      endMeasure: 3,
      startSec: 2,
      endSec: 8,
    });
  });

  it("builds single-measure loop", () => {
    const range = buildLoopRange(2, 2, measures);
    expect(range).toEqual({
      startMeasure: 2,
      endMeasure: 2,
      startSec: 4,
      endSec: 6,
    });
  });

  it("returns null for start > end", () => {
    expect(buildLoopRange(5, 2, measures)).toBeNull();
  });

  it("returns null for out-of-bounds measures", () => {
    expect(buildLoopRange(-1, 3, measures)).toBeNull();
    expect(buildLoopRange(0, 10, measures)).toBeNull();
  });

  it("returns null for empty measures", () => {
    expect(buildLoopRange(0, 0, [])).toBeNull();
  });

  it("builds loop at first measures", () => {
    const range = buildLoopRange(0, 0, measures);
    expect(range).toEqual({
      startMeasure: 0,
      endMeasure: 0,
      startSec: 0,
      endSec: 2,
    });
  });

  it("builds loop at last measures", () => {
    const range = buildLoopRange(7, 7, measures);
    expect(range).toEqual({
      startMeasure: 7,
      endMeasure: 7,
      startSec: 14,
      endSec: 16,
    });
  });
});
