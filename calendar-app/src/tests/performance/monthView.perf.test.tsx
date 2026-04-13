/**
 * Performance smoke test for MonthView rendering with 150 events.
 * PRD §15 (Performance spot-checks), NF-01 (render performance)
 *
 * Verifies that MonthView renders 150 events (mixed recurring/non-recurring)
 * in under 500 ms — this is a smoke test for catastrophic slowdowns, not a
 * precise benchmark.
 */

import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';

import { MonthView } from '../../components/MonthView';
import type { CalendarOccurrence } from '../../store/recurrence';
import type { CalendarEvent } from '../../types/event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOccurrence(index: number, isRecurring = false): CalendarOccurrence {
  const day = (index % 28) + 1; // keep within Jan 1–28
  const isoDate = `2024-01-${String(day).padStart(2, '0')}`;
  const startISO = `${isoDate}T${String(8 + (index % 8)).padStart(2, '0')}:00:00.000Z`;
  const endISO = `${isoDate}T${String(9 + (index % 8)).padStart(2, '0')}:00:00.000Z`;
  const id = `event-${index}`;

  const base: CalendarEvent = {
    id,
    title: `Event ${index}`,
    description: `Description for event ${index}`,
    startTime: startISO,
    endTime: endISO,
    category: (['work', 'personal', 'health', 'social', 'other'] as const)[index % 5],
    recurrence: isRecurring ? 'daily' : 'none',
    color: '#4A90E2',
  };

  return {
    ...base,
    occurrenceId: `${id}::${isoDate}`,
    sourceEventId: id,
    occurrenceStartTime: startISO,
    occurrenceEndTime: endISO,
    isRecurringOccurrence: isRecurring,
  };
}

function make150Occurrences(): CalendarOccurrence[] {
  return Array.from({ length: 150 }, (_, i) => makeOccurrence(i, i % 3 === 0));
}

// ---------------------------------------------------------------------------
// Performance smoke test
// ---------------------------------------------------------------------------

describe('MonthView performance', () => {
  test('renders 150 mixed events in under 500 ms', () => {
    const activeDate = new Date('2024-01-15T00:00:00.000Z');
    const occurrences = make150Occurrences();

    const start = performance.now();

    render(
      <MonthView
        activeDate={activeDate}
        occurrences={occurrences}
        onDayClick={(_date) => {}}
        onEventClick={(_occ) => {}}
      />
    );

    const elapsed = performance.now() - start;

    // Smoke-test threshold: < 500 ms — flags catastrophic regressions only
    expect(elapsed).toBeLessThan(500);
  });

  test('renders empty MonthView quickly (< 100 ms)', () => {
    const activeDate = new Date('2024-01-15T00:00:00.000Z');

    const start = performance.now();

    render(
      <MonthView
        activeDate={activeDate}
        occurrences={[]}
        onDayClick={(_date) => {}}
        onEventClick={(_occ) => {}}
      />
    );

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  test('renders MonthView with 150 events and produces correct DOM output', () => {
    const activeDate = new Date('2024-01-15T00:00:00.000Z');
    const occurrences = make150Occurrences();

    const { container } = render(
      <MonthView
        activeDate={activeDate}
        occurrences={occurrences}
        onDayClick={(_date) => {}}
        onEventClick={(_occ) => {}}
      />
    );

    // The grid should be rendered (non-empty)
    expect(container.firstChild).not.toBeNull();

    // The calendar grid should contain day cells
    const dayCells = container.querySelectorAll('button[aria-label^="Create event on"]');
    expect(dayCells.length).toBeGreaterThan(0); // at least one day cell
  });
});
