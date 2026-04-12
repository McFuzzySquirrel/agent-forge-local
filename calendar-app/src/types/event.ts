export type EventCategory = 'work' | 'personal' | 'health' | 'social' | 'other';

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  recurrence: RecurrenceRule;
  color: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CalendarEvent, string>>;
}
