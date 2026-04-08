// Feature: html-to-react-migration, Property 22: StorageWidget arc offset is proportional to usage
// Validates: Requirements 15.5

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import StorageWidget, { CIRCUMFERENCE } from './StorageWidget';

describe('Property 22: StorageWidget arc offset is proportional to usage', () => {
  it('strokeDashoffset equals circumference * (1 - used/total) and colour matches thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),   // totalBytes
        fc.integer({ min: 0, max: 1_000_000 }),   // usedBytes (may exceed total — clamped)
        (total, rawUsed) => {
          const used = Math.min(rawUsed, total);
          const { container } = render(<StorageWidget usedBytes={used} totalBytes={total} />);
          const arc = container.querySelector('[data-testid="storage-arc"]');

          const expectedOffset = CIRCUMFERENCE * (1 - used / total);
          const actualOffset = parseFloat(arc.getAttribute('stroke-dashoffset'));
          expect(actualOffset).toBeCloseTo(expectedOffset, 2);

          const pct = (used / total) * 100;
          const stroke = arc.getAttribute('stroke');
          if (pct > 80) {
            expect(stroke).toBe('#ef4444');
          } else if (pct >= 60) {
            expect(stroke).toBe('#f59e0b');
          } else {
            expect(stroke).toBe('#667eea');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
