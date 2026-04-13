export type EventCategory = 'work' | 'personal' | 'health' | 'social' | 'other';

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

/** Per-occurrence field overrides for "edit this occurrence" (FR-21). */
export interface RecurrenceException {
  /** ISO date string (yyyy-MM-dd) identifying the occurrence to override. */
  date: string;
  override: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    category?: EventCategory;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  recurrence: RecurrenceRule;
  color: string;
  /**
   * ISO date string (yyyy-MM-dd). Expansion stops before (not including) this
   * date. Set by deleteEventOccurrence with scope 'all-future' (FR-22).
   */
  recurrenceEndDate?: string;
  /**
   * ISO date strings (yyyy-MM-dd) of individual occurrences to skip.
   * Set by deleteEventOccurrence with scope 'this' (FR-22).
   */
  excludedDates?: string[];
  /**
   * Per-occurrence field overrides applied during expansion.
   * Set by updateEventOccurrence with scope 'this' (FR-21).
   */
  exceptions?: RecurrenceException[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CalendarEvent, string>>;
}
