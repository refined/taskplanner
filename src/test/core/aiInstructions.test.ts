import { describe, it, expect } from 'vitest';
import {
  MARKER_START,
  contentHasTaskPlannerMarkers,
} from '../../core/ai/aiInstructions.js';

describe('contentHasTaskPlannerMarkers', () => {
  it('returns false for empty or unrelated content', () => {
    expect(contentHasTaskPlannerMarkers('')).toBe(false);
    expect(contentHasTaskPlannerMarkers('# Hello')).toBe(false);
  });

  it('returns true when marker start is present', () => {
    expect(contentHasTaskPlannerMarkers(`x\n${MARKER_START}\ny`)).toBe(true);
  });
});
