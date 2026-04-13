import type { CalendarEvent } from '../types/event';
import { isAfter, isBefore, parseISO } from '../utils/dateHelpers';

export type RecurrenceMutationScope = 'this-occurrence' | 'all-future';

export interface CalendarOccurrence extends CalendarEvent {
  occurrenceId: string;
  sourceEventId: string;
  occurrenceStartTime: string;
  occurrenceEndTime: string;
  isRecurringOccurrence: boolean;
}

function toSingleOccurrence(event: CalendarEvent): CalendarOccurrence {
  return {
    ...event,
    occurrenceId: event.id,
    sourceEventId: event.id,
    occurrenceStartTime: event.startTime,
    occurrenceEndTime: event.endTime,
    isRecurringOccurrence: false,
  };
}

/**
 * Expands recurring events into virtual occurrences for a given date range.
 * Phase 2 stub: exposes the occurrence contract but still returns only
 * non-recurring events visible in the range. Full implementation in Phase 3
 * (FR-18-FR-20).
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  return events
    .filter((event) => {
      if (event.recurrence !== 'none') {
        return false;
      }

      const eventStart = parseISO(event.startTime);
      const eventEnd = parseISO(event.endTime);

      return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
    })
    .map(toSingleOccurrence);
}
