/**
 * Unit tests for src/utils/dateHelpers.ts
 * PRD §15 (Testing Strategy) — utility-level coverage
 */

import { describe, test, expect } from 'vitest';

import {
  addDays,
  addHoursToDate,
  addMonths,
  addWeeks,
  endOfDay,
  formatDate,
  getDayHours,
  getMonthDays,
  getWeekDays,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
  subWeeks,
} from '../../utils/dateHelpers';

// ---------------------------------------------------------------------------
// getMonthDays
// ---------------------------------------------------------------------------

describe('getMonthDays', () => {
  test('returns 31 days for January', () => {
    const days = getMonthDays(2024, 0); // month index 0 = January
    expect(days).toHaveLength(31);
  });

  test('returns 28 days for February in a non-leap year', () => {
    const days = getMonthDays(2023, 1);
    expect(days).toHaveLength(28);
  });

  test('returns 29 days for February in a leap year', () => {
    const days = getMonthDays(2024, 1);
    expect(days).toHaveLength(29);
  });

  test('returns 30 days for April', () => {
    const days = getMonthDays(2024, 3); // month index 3 = April
    expect(days).toHaveLength(30);
  });

  test('first day of the month is correct', () => {
    const days = getMonthDays(2024, 0);
    const first = days[0];
    expect(first.getFullYear()).toBe(2024);
    expect(first.getMonth()).toBe(0);
    expect(first.getDate()).toBe(1);
  });

  test('last day of the month is correct for December', () => {
    const days = getMonthDays(2024, 11);
    const last = days[days.length - 1];
    expect(last.getDate()).toBe(31);
    expect(last.getMonth()).toBe(11);
  });

  test('month rollover: month 12 wraps to January of next year', () => {
    // Date(2024, 12, 1) is equivalent to 2025-01-01
    const days = getMonthDays(2024, 12);
    expect(days[0].getFullYear()).toBe(2025);
    expect(days[0].getMonth()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getWeekDays
// ---------------------------------------------------------------------------

describe('getWeekDays', () => {
  test('returns 7 days', () => {
    const days = getWeekDays(new Date('2024-01-15')); // Monday
    expect(days).toHaveLength(7);
  });

  test('week starts on Monday (weekStartsOn: 1)', () => {
    const monday = new Date('2024-01-15'); // this is a Monday
    const days = getWeekDays(monday);
    expect(days[0].getDay()).toBe(1); // 1 = Monday
  });

  test('week ends on Sunday', () => {
    const monday = new Date('2024-01-15');
    const days = getWeekDays(monday);
    expect(days[6].getDay()).toBe(0); // 0 = Sunday
  });

  test('mid-week date still yields the Monday-anchored week', () => {
    const wednesday = new Date('2024-01-17'); // Wednesday
    const days = getWeekDays(wednesday);
    expect(days[0].getDate()).toBe(15); // Monday Jan 15
    expect(days[6].getDate()).toBe(21); // Sunday Jan 21
  });

  test('consecutive days are exactly 24 hours apart', () => {
    const days = getWeekDays(new Date('2024-03-10'));
    for (let i = 0; i < 6; i++) {
      const diffMs = days[i + 1].getTime() - days[i].getTime();
      // 23 or 24 or 25 hours covers DST transitions
      expect(diffMs).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    }
  });
});

// ---------------------------------------------------------------------------
// getDayHours
// ---------------------------------------------------------------------------

describe('getDayHours', () => {
  test('returns 24 entries', () => {
    const hours = getDayHours(new Date('2024-01-15'));
    expect(hours).toHaveLength(24);
  });

  test('first entry is at midnight (start of day)', () => {
    const hours = getDayHours(new Date('2024-01-15T14:30:00'));
    expect(hours[0].getHours()).toBe(0);
    expect(hours[0].getMinutes()).toBe(0);
    expect(hours[0].getSeconds()).toBe(0);
  });

  test('each entry increments by one hour', () => {
    const hours = getDayHours(new Date('2024-01-15'));
    for (let i = 0; i < 24; i++) {
      expect(hours[i].getHours()).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// startOfDay / endOfDay
// ---------------------------------------------------------------------------

describe('startOfDay', () => {
  test('returns date at 00:00:00.000', () => {
    const result = startOfDay(new Date('2024-01-15T14:30:00'));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('date part is preserved', () => {
    const result = startOfDay(new Date('2024-06-20T22:59:00'));
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June = 5
    expect(result.getDate()).toBe(20);
  });
});

describe('endOfDay', () => {
  test('returns date at 23:59:59.999', () => {
    const result = endOfDay(new Date('2024-01-15T08:00:00'));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  test('date part is preserved', () => {
    const result = endOfDay(new Date('2024-06-20T00:00:00'));
    expect(result.getDate()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// isSameDay
// ---------------------------------------------------------------------------

describe('isSameDay', () => {
  test('same date at different times returns true', () => {
    const a = new Date('2024-01-15T09:00:00');
    const b = new Date('2024-01-15T23:59:00');
    expect(isSameDay(a, b)).toBe(true);
  });

  test('different dates return false', () => {
    const a = new Date('2024-01-15T09:00:00');
    const b = new Date('2024-01-16T09:00:00');
    expect(isSameDay(a, b)).toBe(false);
  });

  test('same instant returns true', () => {
    const a = new Date('2024-01-15T09:00:00');
    expect(isSameDay(a, a)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  test('formats date as yyyy-MM-dd', () => {
    const result = formatDate(new Date('2024-01-15T00:00:00'), 'yyyy-MM-dd');
    expect(result).toBe('2024-01-15');
  });

  test('formats with month name', () => {
    const result = formatDate(new Date('2024-01-15T00:00:00'), 'MMMM yyyy');
    expect(result).toBe('January 2024');
  });
});

// ---------------------------------------------------------------------------
// addDays / subDays
// ---------------------------------------------------------------------------

describe('addDays', () => {
  test('adds positive days', () => {
    const result = addDays(new Date('2024-01-15'), 5);
    expect(result.getDate()).toBe(20);
    expect(result.getMonth()).toBe(0);
  });

  test('adding 0 days returns same date', () => {
    const date = new Date('2024-01-15');
    const result = addDays(date, 0);
    expect(result.getTime()).toBe(date.getTime());
  });

  test('crosses month boundary', () => {
    const result = addDays(new Date('2024-01-30'), 3);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });
});

describe('subDays', () => {
  test('subtracts days', () => {
    const result = subDays(new Date('2024-01-15'), 5);
    expect(result.getDate()).toBe(10);
  });

  test('crosses month boundary backward', () => {
    const result = subDays(new Date('2024-02-01'), 1);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// addWeeks / subWeeks
// ---------------------------------------------------------------------------

describe('addWeeks', () => {
  test('adds one week (7 days)', () => {
    const date = new Date('2024-01-15');
    const result = addWeeks(date, 1);
    const diffMs = result.getTime() - date.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test('adds multiple weeks', () => {
    const result = addWeeks(new Date('2024-01-01'), 4);
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(0);
  });
});

describe('subWeeks', () => {
  test('subtracts one week', () => {
    const date = new Date('2024-01-22');
    const result = subWeeks(date, 1);
    expect(result.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// addMonths / subMonths
// ---------------------------------------------------------------------------

describe('addMonths', () => {
  test('adds one month', () => {
    const result = addMonths(new Date('2024-01-15'), 1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(15);
  });

  test('crosses year boundary', () => {
    const result = addMonths(new Date('2024-12-15'), 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
  });
});

describe('subMonths', () => {
  test('subtracts one month', () => {
    const result = subMonths(new Date('2024-03-15'), 1);
    expect(result.getMonth()).toBe(1); // February
  });
});

// ---------------------------------------------------------------------------
// addHoursToDate
// ---------------------------------------------------------------------------

describe('addHoursToDate', () => {
  test('adds hours', () => {
    const date = new Date('2024-01-15T09:00:00');
    const result = addHoursToDate(date, 3);
    expect(result.getHours()).toBe(12);
  });

  test('crosses day boundary', () => {
    const date = new Date('2024-01-15T22:00:00');
    const result = addHoursToDate(date, 3);
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseISO
// ---------------------------------------------------------------------------

describe('parseISO', () => {
  test('parses ISO 8601 string to Date', () => {
    const result = parseISO('2024-01-15T09:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2024-01-15T09:00:00.000Z');
  });

  test('parses date-only string', () => {
    const result = parseISO('2024-01-15');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// isAfter / isBefore
// ---------------------------------------------------------------------------

describe('isAfter', () => {
  test('later date is after earlier date', () => {
    const later = new Date('2024-01-16');
    const earlier = new Date('2024-01-15');
    expect(isAfter(later, earlier)).toBe(true);
  });

  test('earlier date is not after later date', () => {
    const later = new Date('2024-01-16');
    const earlier = new Date('2024-01-15');
    expect(isAfter(earlier, later)).toBe(false);
  });

  test('same instant is not after itself', () => {
    const date = new Date('2024-01-15');
    expect(isAfter(date, date)).toBe(false);
  });
});

describe('isBefore', () => {
  test('earlier date is before later date', () => {
    const earlier = new Date('2024-01-15');
    const later = new Date('2024-01-16');
    expect(isBefore(earlier, later)).toBe(true);
  });

  test('later date is not before earlier date', () => {
    const earlier = new Date('2024-01-15');
    const later = new Date('2024-01-16');
    expect(isBefore(later, earlier)).toBe(false);
  });

  test('same instant is not before itself', () => {
    const date = new Date('2024-01-15');
    expect(isBefore(date, date)).toBe(false);
  });
});
