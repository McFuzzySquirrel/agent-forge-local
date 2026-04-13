/**
 * Unit tests for src/store/recurrence.ts — expandRecurringEvents()
 * PRD §15 (Testing Strategy), FR-18–FR-20 (recurrence expansion),
 * FR-21 (exceptions), FR-22 (excludedDates / recurrenceEndDate), §18 (recurrence risk)
 */

import { describe, expect, test } from 'vitest';

import type { CalendarEvent } from '../../types/event';
import { expandRecurringEvents } from '../../store/recurrence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Base Event',
    description: '',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T10:00:00.000Z',
    category: 'work',
    recurrence: 'none',
    color: '#4A90E2',
    ...overrides,
  };
}

/** ISO date string for a date N days from the anchor. */
function daysFromAnchor(base: string, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

const RANGE_START = new Date('2024-01-01T00:00:00.000Z');
const RANGE_END = new Date('2024-04-01T00:00:00.000Z');

// ---------------------------------------------------------------------------
// Non-recurring events
// ---------------------------------------------------------------------------

describe('non-recurring events (recurrence: "none")', () => {
  test('produces exactly one occurrence at the event startTime', () => {
    const event = makeEvent({ recurrence: 'none' });
    const result = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceStartTime).toBe('2024-01-15T09:00:00.000Z');
  });

  test('the single occurrence has isRecurringOccurrence = false', () => {
    const event = makeEvent({ recurrence: 'none' });
    const [occ] = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(occ.isRecurringOccurrence).toBe(false);
  });

  test('event before rangeStart is not returned', () => {
    const event = makeEvent({
      startTime: '2023-12-20T09:00:00.000Z',
      endTime: '2023-12-20T10:00:00.000Z',
    });
    const result = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(result).toHaveLength(0);
  });

  test('event after rangeEnd is not returned', () => {
    const event = makeEvent({
      startTime: '2024-05-01T09:00:00.000Z',
      endTime: '2024-05-01T10:00:00.000Z',
    });
    const result = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(result).toHaveLength(0);
  });

  test('event exactly on rangeEnd boundary is returned (overlap check)', () => {
    const event = makeEvent({
      startTime: '2024-04-01T00:00:00.000Z',
      endTime: '2024-04-01T01:00:00.000Z',
    });
    const result = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(result).toHaveLength(1);
  });

  test('occurrenceId contains the source event id', () => {
    const event = makeEvent({ id: 'src-abc' });
    const [occ] = expandRecurringEvents([event], RANGE_START, RANGE_END);
    expect(occ.occurrenceId).toContain('src-abc');
    expect(occ.sourceEventId).toBe('src-abc');
  });
});

// ---------------------------------------------------------------------------
// Daily recurrence
// ---------------------------------------------------------------------------

describe('daily recurrence', () => {
  const dailyEvent = makeEvent({
    recurrence: 'daily',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T10:00:00.000Z',
  });

  test('produces one occurrence per day within the range', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-20T23:59:59.000Z');
    const result = expandRecurringEvents([dailyEvent], start, end);
    // Jan 15 through Jan 20 = 6 occurrences
    expect(result).toHaveLength(6);
  });

  test('all occurrences are on successive days', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([dailyEvent], start, end);
    expect(result).toHaveLength(3);
    const dates = result.map((o) => new Date(o.occurrenceStartTime).toISOString().slice(0, 10));
    expect(dates).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  test('isRecurringOccurrence is true for all daily occurrences', () => {
    const result = expandRecurringEvents([dailyEvent], RANGE_START, RANGE_END);
    expect(result.every((o) => o.isRecurringOccurrence)).toBe(true);
  });

  test('occurrences before event startTime are never generated', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-20T23:59:59.000Z');
    const result = expandRecurringEvents([dailyEvent], start, end);
    // Event starts Jan 15, so no occurrences before that
    const tooEarly = result.filter(
      (o) => new Date(o.occurrenceStartTime) < new Date('2024-01-15T09:00:00.000Z')
    );
    expect(tooEarly).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Weekly recurrence
// ---------------------------------------------------------------------------

describe('weekly recurrence', () => {
  // 2024-01-15 is a Monday
  const weeklyEvent = makeEvent({
    recurrence: 'weekly',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T10:00:00.000Z',
  });

  test('produces one occurrence per week', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-02-15T23:59:59.000Z');
    const result = expandRecurringEvents([weeklyEvent], start, end);
    // Jan 15, 22, 29, Feb 5, 12 = 5 occurrences
    expect(result).toHaveLength(5);
  });

  test('each occurrence falls on the same day of week (Monday)', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-02-15T23:59:59.000Z');
    const result = expandRecurringEvents([weeklyEvent], start, end);
    for (const occ of result) {
      expect(new Date(occ.occurrenceStartTime).getUTCDay()).toBe(1); // 1 = Monday
    }
  });

  test('occurrences are exactly 7 days apart', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-29T23:59:59.000Z');
    const result = expandRecurringEvents([weeklyEvent], start, end);
    expect(result).toHaveLength(3);
    const diffA = new Date(result[1].occurrenceStartTime).getTime() - new Date(result[0].occurrenceStartTime).getTime();
    const diffB = new Date(result[2].occurrenceStartTime).getTime() - new Date(result[1].occurrenceStartTime).getTime();
    expect(diffA).toBe(7 * 24 * 60 * 60 * 1000);
    expect(diffB).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// Monthly recurrence
// ---------------------------------------------------------------------------

describe('monthly recurrence', () => {
  // 2024-01-15 → monthly on the 15th
  const monthlyEvent = makeEvent({
    recurrence: 'monthly',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T10:00:00.000Z',
  });

  test('produces one occurrence per month on the same day', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-04-01T00:00:00.000Z');
    const result = expandRecurringEvents([monthlyEvent], start, end);
    // Jan 15, Feb 15, Mar 15 = 3 occurrences (Apr 1 boundary is inclusive edge)
    expect(result.length).toBeGreaterThanOrEqual(3);
    const dates = result.map((o) => new Date(o.occurrenceStartTime).getUTCDate());
    expect(dates.every((d) => d === 15)).toBe(true);
  });

  test('occurrences fall on successive months', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-04-30T23:59:59.000Z');
    const result = expandRecurringEvents([monthlyEvent], start, end);
    const months = result.map((o) => new Date(o.occurrenceStartTime).getUTCMonth());
    // Months should include 0 (Jan), 1 (Feb), 2 (Mar), 3 (Apr)
    expect(months).toContain(0);
    expect(months).toContain(1);
    expect(months).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// recurrenceEndDate — stops expansion
// ---------------------------------------------------------------------------

describe('recurrenceEndDate', () => {
  test('stops expansion before the recurrenceEndDate', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      recurrenceEndDate: '2024-01-18', // exclusive
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-25T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    // Jan 15, 16, 17 — stops before Jan 18
    expect(result).toHaveLength(3);
    const dates = result.map((o) => o.occurrenceStartTime.slice(0, 10));
    expect(dates).not.toContain('2024-01-18');
  });

  test('no occurrences returned when recurrenceEndDate is before event startTime', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      recurrenceEndDate: '2024-01-10',
    });
    const result = expandRecurringEvents(
      [event],
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-31T23:59:59.000Z')
    );
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// excludedDates — skips specific occurrences
// ---------------------------------------------------------------------------

describe('excludedDates', () => {
  test('single excluded date is skipped', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      excludedDates: ['2024-01-16'],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-18T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    const dates = result.map((o) => o.occurrenceStartTime.slice(0, 10));
    expect(dates).not.toContain('2024-01-16');
    // Jan 15, 17, 18 still present
    expect(dates).toContain('2024-01-15');
    expect(dates).toContain('2024-01-17');
  });

  test('multiple excluded dates are all skipped', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      excludedDates: ['2024-01-16', '2024-01-17', '2024-01-18'],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-20T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    const dates = result.map((o) => o.occurrenceStartTime.slice(0, 10));
    expect(dates).not.toContain('2024-01-16');
    expect(dates).not.toContain('2024-01-17');
    expect(dates).not.toContain('2024-01-18');
  });

  test('non-excluded occurrences are still returned', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      excludedDates: ['2024-01-16'],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    // Jan 15 and Jan 17 (Jan 16 excluded)
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// exceptions — per-occurrence field overrides
// ---------------------------------------------------------------------------

describe('exceptions', () => {
  test('overrides title for the specified occurrence', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      exceptions: [{ date: '2024-01-16', override: { title: 'Override Title' } }],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    const jan16 = result.find((o) => o.occurrenceStartTime.startsWith('2024-01-16'));
    expect(jan16?.title).toBe('Override Title');
  });

  test('non-overridden occurrences keep original title', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      exceptions: [{ date: '2024-01-16', override: { title: 'Override Title' } }],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    const jan15 = result.find((o) => o.occurrenceStartTime.startsWith('2024-01-15'));
    expect(jan15?.title).toBe('Base Event');
  });

  test('overrides description for the specified occurrence', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      exceptions: [{ date: '2024-01-15', override: { description: 'Special desc' } }],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-15T23:59:59.000Z');
    const [occ] = expandRecurringEvents([event], start, end);
    expect(occ.description).toBe('Special desc');
  });

  test('multiple exceptions can coexist', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
      exceptions: [
        { date: '2024-01-15', override: { title: 'First Override' } },
        { date: '2024-01-17', override: { title: 'Third Override' } },
      ],
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    const jan15 = result.find((o) => o.occurrenceStartTime.startsWith('2024-01-15'));
    const jan16 = result.find((o) => o.occurrenceStartTime.startsWith('2024-01-16'));
    const jan17 = result.find((o) => o.occurrenceStartTime.startsWith('2024-01-17'));
    expect(jan15?.title).toBe('First Override');
    expect(jan16?.title).toBe('Base Event');
    expect(jan17?.title).toBe('Third Override');
  });
});

// ---------------------------------------------------------------------------
// Range filtering — occurrences outside [rangeStart, rangeEnd] not returned
// ---------------------------------------------------------------------------

describe('range filtering', () => {
  test('occurrences outside [rangeStart, rangeEnd] are not returned', () => {
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-10T09:00:00.000Z',
      endTime: '2024-01-10T10:00:00.000Z',
    });
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-17T23:59:59.000Z');
    const result = expandRecurringEvents([event], start, end);
    // Only Jan 15, 16, 17 should appear
    expect(result).toHaveLength(3);
    for (const occ of result) {
      const d = new Date(occ.occurrenceStartTime);
      expect(d >= start).toBe(true);
    }
  });

  test('returns empty array when no events provided', () => {
    const result = expandRecurringEvents([], RANGE_START, RANGE_END);
    expect(result).toEqual([]);
  });

  test('multiple events are all expanded and concatenated', () => {
    const events = [
      makeEvent({ id: 'a', title: 'Event A', recurrence: 'none' }),
      makeEvent({
        id: 'b',
        title: 'Event B',
        recurrence: 'none',
        startTime: '2024-01-20T09:00:00.000Z',
        endTime: '2024-01-20T10:00:00.000Z',
      }),
    ];
    const result = expandRecurringEvents(events, RANGE_START, RANGE_END);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.sourceEventId)).toContain('a');
    expect(result.map((o) => o.sourceEventId)).toContain('b');
  });
});

// ---------------------------------------------------------------------------
// 90-day lookahead (FR-18)
// ---------------------------------------------------------------------------

describe('90-day minimum expansion window', () => {
  test('with small rangeEnd, daily event returns only occurrences within [rangeStart, rangeEnd]', () => {
    const today = new Date('2024-01-15T00:00:00.000Z');
    const tomorrow = new Date('2024-01-16T23:59:59.000Z');
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
    });
    const result = expandRecurringEvents([event], today, tomorrow);
    // Only Jan 15 and Jan 16 should be returned (range boundary)
    expect(result).toHaveLength(2);
  });

  test('effectiveEnd does not cause occurrences beyond rangeEnd to appear in results', () => {
    const start = new Date('2024-01-15T00:00:00.000Z');
    const end = new Date('2024-01-16T23:59:59.000Z');
    const event = makeEvent({
      recurrence: 'daily',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
    });
    const result = expandRecurringEvents([event], start, end);
    for (const occ of result) {
      expect(new Date(occ.occurrenceStartTime) <= end).toBe(true);
    }
  });
});
