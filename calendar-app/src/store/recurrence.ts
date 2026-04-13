import { format } from 'date-fns';

import type { CalendarEvent, RecurrenceException } from '../types/event';
import {
  addDays,
  addMonths,
  addWeeks,
  isAfter,
  isBefore,
  parseISO,
} from '../utils/dateHelpers';

export type RecurrenceMutationScope = 'this-occurrence' | 'all-future';

export interface CalendarOccurrence extends CalendarEvent {
  occurrenceId: string;
  sourceEventId: string;
  occurrenceStartTime: string;
  occurrenceEndTime: string;
  isRecurringOccurrence: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format a Date as 'yyyy-MM-dd' for comparison with excludedDates / exceptions. */
function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Find an exception record whose date matches the given occurrence date.
 * Uses the yyyy-MM-dd key so time-of-day differences are ignored.
 */
function findException(
  exceptions: RecurrenceException[] | undefined,
  occurrenceStart: Date
): RecurrenceException | undefined {
  if (!exceptions || exceptions.length === 0) return undefined;
  const key = toDateKey(occurrenceStart);
  return exceptions.find((ex) => ex.date === key);
}

/**
 * Build a CalendarOccurrence for a single occurrence of the given event,
 * starting at occurrenceStart. Applies any matching exception override.
 */
function buildOccurrence(
  event: CalendarEvent,
  occurrenceStart: Date,
  durationMs: number
): CalendarOccurrence {
  const exception = findException(event.exceptions, occurrenceStart);
  const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);

  // Apply field-level overrides from the exception (if any).
  const overriddenStart = exception?.override.startTime
    ? parseISO(exception.override.startTime)
    : occurrenceStart;
  const overriddenEnd = exception?.override.endTime
    ? parseISO(exception.override.endTime)
    : exception?.override.startTime
      ? new Date(parseISO(exception.override.startTime).getTime() + durationMs)
      : occurrenceEnd;

  return {
    ...event,
    title: exception?.override.title ?? event.title,
    description: exception?.override.description ?? event.description,
    category: exception?.override.category ?? event.category,
    // occurrenceStartTime / occurrenceEndTime reflect the shifted (or overridden) times
    occurrenceStartTime: overriddenStart.toISOString(),
    occurrenceEndTime: overriddenEnd.toISOString(),
    occurrenceId: `${event.id}::${toDateKey(occurrenceStart)}`,
    sourceEventId: event.id,
    isRecurringOccurrence: event.recurrence !== 'none',
  };
}

/**
 * Expand a single recurring event into occurrences within the window
 * [rangeStart, effectiveEnd], then filter down to [rangeStart, rangeEnd].
 *
 * effectiveEnd = max(rangeEnd, rangeStart + 90 days) so the engine always
 * materialises at least 90 days of future occurrences as required by FR-18.
 */
function expandEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  effectiveEnd: Date
): CalendarOccurrence[] {
  const originalStart = parseISO(event.startTime);
  const originalEnd = parseISO(event.endTime);
  const durationMs = originalEnd.getTime() - originalStart.getTime();

  const occurrences: CalendarOccurrence[] = [];

  if (event.recurrence === 'none') {
    // Single occurrence: keep if the event overlaps [rangeStart, rangeEnd].
    if (!isAfter(originalStart, rangeEnd) && !isBefore(originalEnd, rangeStart)) {
      occurrences.push(buildOccurrence(event, originalStart, durationMs));
    }
    return occurrences;
  }

  // Determine the hard stop imposed by recurrenceEndDate.
  const recurrenceStop = event.recurrenceEndDate
    ? parseISO(event.recurrenceEndDate)
    : null;

  // Build a Set of excluded date keys for O(1) lookup.
  const excludedKeys = new Set<string>(
    (event.excludedDates ?? []).map((d) => {
      // d may be a full ISO string or a yyyy-MM-dd key — normalise to key form.
      return d.length === 10 ? d : toDateKey(parseISO(d));
    })
  );

  let current = originalStart;

  // Iterate occurrences until we exceed effectiveEnd.
  while (!isAfter(current, effectiveEnd)) {
    // Stop before recurrenceEndDate.
    if (recurrenceStop && !isBefore(current, recurrenceStop)) break;

    const dateKey = toDateKey(current);

    // Skip excluded occurrences but keep iterating.
    if (!excludedKeys.has(dateKey)) {
      const occEnd = new Date(current.getTime() + durationMs);

      // Only include in results if the occurrence overlaps [rangeStart, rangeEnd].
      if (!isAfter(current, rangeEnd) && !isBefore(occEnd, rangeStart)) {
        occurrences.push(buildOccurrence(event, current, durationMs));
      }
    }

    // Advance to the next occurrence.
    switch (event.recurrence) {
      case 'daily':
        current = addDays(current, 1);
        break;
      case 'weekly':
        current = addWeeks(current, 1);
        break;
      case 'monthly':
        current = addMonths(current, 1);
        break;
    }
  }

  return occurrences;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Expands recurring events into virtual occurrences for a given date range.
 *
 * The expansion window is at least 90 days ahead of rangeStart (FR-18) so
 * that views can always pre-load the required lookahead. Results are filtered
 * to occurrences whose occurrence window overlaps [rangeStart, rangeEnd].
 *
 * Recurrence rules supported (FR-18–FR-20):
 *   'none'    → single occurrence at the event's startTime
 *   'daily'   → one occurrence per calendar day
 *   'weekly'  → one occurrence per week on the same day-of-week
 *   'monthly' → one occurrence per month on the same day-of-month
 *
 * Recurrence-aware mutations (FR-21, FR-22) are reflected via:
 *   event.recurrenceEndDate  → expansion stops before this date
 *   event.excludedDates      → individual occurrences skipped
 *   event.exceptions         → per-occurrence field overrides applied inline
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  // Enforce the 90-day minimum expansion ceiling.
  const ninetyDaysOut = addDays(rangeStart, 90);
  const effectiveEnd = isAfter(ninetyDaysOut, rangeEnd) ? ninetyDaysOut : rangeEnd;

  const results: CalendarOccurrence[] = [];

  for (const event of events) {
    const expanded = expandEvent(event, rangeStart, rangeEnd, effectiveEnd);
    results.push(...expanded);
  }

  return results;
}
