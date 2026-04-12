import {
  addDays as dateFnsAddDays,
  addHours,
  addMonths as dateFnsAddMonths,
  addWeeks as dateFnsAddWeeks,
  endOfDay as dateFnsEndOfDay,
  format,
  getDaysInMonth,
  isAfter as dateFnsIsAfter,
  isBefore as dateFnsIsBefore,
  isSameDay as dateFnsIsSameDay,
  parseISO as dateFnsParseISO,
  startOfDay as dateFnsStartOfDay,
  startOfWeek,
  subDays as dateFnsSubDays,
  subMonths as dateFnsSubMonths,
  subWeeks as dateFnsSubWeeks,
} from 'date-fns';

export function getMonthDays(year: number, month: number): Date[] {
  const monthStart = new Date(year, month, 1);
  const totalDays = getDaysInMonth(monthStart);

  return Array.from({ length: totalDays }, (_, dayIndex) =>
    dateFnsAddDays(monthStart, dayIndex)
  );
}

export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });

  return Array.from({ length: 7 }, (_, dayIndex) =>
    dateFnsAddDays(weekStart, dayIndex)
  );
}

export function getDayHours(date: Date): Date[] {
  const dayStart = dateFnsStartOfDay(date);

  return Array.from({ length: 24 }, (_, hour) => addHours(dayStart, hour));
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateFnsIsSameDay(a, b);
}

export function formatDate(date: Date, fmt: string): string {
  return format(date, fmt);
}

export function startOfDay(date: Date): Date {
  return dateFnsStartOfDay(date);
}

export function endOfDay(date: Date): Date {
  return dateFnsEndOfDay(date);
}

export function addDays(date: Date, amount: number): Date {
  return dateFnsAddDays(date, amount);
}

export function addWeeks(date: Date, amount: number): Date {
  return dateFnsAddWeeks(date, amount);
}

export function addMonths(date: Date, amount: number): Date {
  return dateFnsAddMonths(date, amount);
}

export function subDays(date: Date, amount: number): Date {
  return dateFnsSubDays(date, amount);
}

export function subWeeks(date: Date, amount: number): Date {
  return dateFnsSubWeeks(date, amount);
}

export function subMonths(date: Date, amount: number): Date {
  return dateFnsSubMonths(date, amount);
}

export function parseISO(dateString: string): Date {
  return dateFnsParseISO(dateString);
}

export function isAfter(dateLeft: Date, dateRight: Date): boolean {
  return dateFnsIsAfter(dateLeft, dateRight);
}

export function isBefore(dateLeft: Date, dateRight: Date): boolean {
  return dateFnsIsBefore(dateLeft, dateRight);
}
