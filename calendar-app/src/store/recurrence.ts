import type { CalendarEvent } from '../types/event';
import { isAfter, isBefore, parseISO } from '../utils/dateHelpers';

/**
 * Expands recurring events into virtual occurrences for a given date range.
 * Phase 1 stub: returns only non-recurring events visible in the range.
 * Full implementation in Phase 3 (FR-18-FR-20).
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  return events.filter((event) => {
    if (event.recurrence !== 'none') {
      return false;
    }

    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);

    return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
  });
}
