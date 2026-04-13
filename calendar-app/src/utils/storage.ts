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

  // ── Optional recurrence fields ──────────────────────────────────────────
  const recurrenceEndDate =
    typeof value.recurrenceEndDate === 'string' ? value.recurrenceEndDate : undefined;

  const excludedDates =
    Array.isArray(value.excludedDates) &&
    value.excludedDates.every((d: unknown) => typeof d === 'string')
      ? (value.excludedDates as string[])
      : undefined;

  const exceptions =
    Array.isArray(value.exceptions)
      ? value.exceptions.filter(
          (ex: unknown): ex is { date: string; override: Record<string, unknown> } =>
            isRecord(ex) &&
            typeof (ex as Record<string, unknown>).date === 'string' &&
            isRecord((ex as Record<string, unknown>).override)
        )
      : undefined;

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
    ...(recurrenceEndDate !== undefined && { recurrenceEndDate }),
    ...(excludedDates !== undefined && { excludedDates }),
    ...(exceptions !== undefined && exceptions.length > 0 && { exceptions }),
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
      return [];
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn(
        'calendar-app: Failed to parse stored events (JSON invalid). Clearing corrupt storage and using empty state.'
      );
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.warn(
        'calendar-app: Stored events payload is not an array. Clearing corrupt storage and using empty state.'
      );
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    const sanitized = parsed
      .map((eventLike) => toSanitizedEvent(eventLike))
      .filter((eventLike): eventLike is CalendarEvent => eventLike !== null);

    if (sanitized.length !== parsed.length) {
      console.warn('calendar-app: Dropped invalid calendar events from localStorage payload.');
    }

    return sanitized;
  } catch (error) {
    console.warn(
      'calendar-app: Failed to load calendar events from localStorage. Using empty state.',
      error
    );
    return [];
  }
}
