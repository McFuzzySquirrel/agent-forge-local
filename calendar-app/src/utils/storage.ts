import type { CalendarEvent, EventCategory, RecurrenceRule } from '../types/event';
import { getCategoryColor } from './categoryColors';

const STORAGE_KEY = 'calendar-app-events';

const VALID_CATEGORIES: EventCategory[] = [
  'work',
  'personal',
  'health',
  'social',
  'other',
];

const VALID_RECURRENCE_RULES: RecurrenceRule[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSanitizedEvent(value: unknown): CalendarEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, title, startTime, endTime, category, recurrence } = value;

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof startTime !== 'string' ||
    typeof endTime !== 'string' ||
    typeof category !== 'string' ||
    typeof recurrence !== 'string' ||
    !VALID_CATEGORIES.includes(category as EventCategory) ||
    !VALID_RECURRENCE_RULES.includes(recurrence as RecurrenceRule)
  ) {
    return null;
  }

  const description = typeof value.description === 'string' ? value.description : '';

  return {
    id,
    title,
    description,
    startTime,
    endTime,
    category: category as EventCategory,
    recurrence: recurrence as RecurrenceRule,
    color:
      typeof value.color === 'string' && value.color.length > 0
        ? value.color
        : getCategoryColor(category as EventCategory),
  };
}

export function saveEventsToStorage(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to save calendar events to localStorage.', error);
  }
}

export function loadEventsFromStorage(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      console.warn('No stored calendar events found. Using empty state.');
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.warn('Stored calendar events are malformed. Using empty state.');
      return [];
    }

    const sanitized = parsed
      .map((eventLike) => toSanitizedEvent(eventLike))
      .filter((eventLike): eventLike is CalendarEvent => eventLike !== null);

    if (sanitized.length !== parsed.length) {
      console.warn('Dropped invalid calendar events from localStorage payload.');
    }

    return sanitized;
  } catch (error) {
    console.warn('Failed to load calendar events from localStorage. Using empty state.', error);
    return [];
  }
}
