// Feature: html-to-react-migration
// Unit tests for StorageWidget — Requirement 15.5

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StorageWidget, { CIRCUMFERENCE } from './StorageWidget';

function getArc(container) {
  return container.querySelector('[data-testid="storage-arc"]');
}

describe('StorageWidget', () => {
  it('shows 0% offset (full arc) when usedBytes is 0', () => {
    const { container } = render(<StorageWidget usedBytes={0} totalBytes={100} />);
    const arc = getArc(container);
    const offset = parseFloat(arc.getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(CIRCUMFERENCE * 1, 2);
    expect(arc.getAttribute('stroke')).toBe('#667eea');
  });

  it('shows correct offset and amber colour at 60% usage', () => {
    const { container } = render(<StorageWidget usedBytes={60} totalBytes={100} />);
    const arc = getArc(container);
    const offset = parseFloat(arc.getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(CIRCUMFERENCE * (1 - 0.6), 2);
    expect(arc.getAttribute('stroke')).toBe('#f59e0b');
  });

  it('shows correct offset and amber colour at 80% usage', () => {
    const { container } = render(<StorageWidget usedBytes={80} totalBytes={100} />);
    const arc = getArc(container);
    const offset = parseFloat(arc.getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(CIRCUMFERENCE * (1 - 0.8), 2);
    // 80% is the boundary — still amber (> 80 triggers red)
    expect(arc.getAttribute('stroke')).toBe('#f59e0b');
  });

  it('shows correct offset and red colour at 100% usage', () => {
    const { container } = render(<StorageWidget usedBytes={100} totalBytes={100} />);
    const arc = getArc(container);
    const offset = parseFloat(arc.getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(CIRCUMFERENCE * (1 - 1), 2);
    expect(arc.getAttribute('stroke')).toBe('#ef4444');
  });
});
