import type { CalendarOccurrence } from '../store/recurrence';
import {
  endOfDay,
  formatDate,
  getMonthDays,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from '../utils/dateHelpers';
import { EventChip } from './EventChip';
import styles from '../styles/MonthView.module.css';

interface MonthViewProps {
  activeDate: Date;
  occurrences: CalendarOccurrence[];
  onDayClick: (date: Date) => void;
  onEventClick: (occurrence: CalendarOccurrence) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildMonthCells(activeDate: Date): Array<Date | null> {
  const monthDays = getMonthDays(activeDate.getFullYear(), activeDate.getMonth());
  const leadingEmptyDays = (monthDays[0].getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingEmptyDays + monthDays.length) / 7) * 7;
  const trailingEmptyDays = totalCells - leadingEmptyDays - monthDays.length;

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...monthDays,
    ...Array.from({ length: trailingEmptyDays }, () => null),
  ];
}

function getDayOccurrences(occurrences: CalendarOccurrence[], day: Date): CalendarOccurrence[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return occurrences
    .filter((occurrence) => {
      const occurrenceStart = parseISO(occurrence.occurrenceStartTime);
      const occurrenceEnd = parseISO(occurrence.occurrenceEndTime);

      return !isBefore(dayEnd, occurrenceStart) && !isBefore(occurrenceEnd, dayStart);
    })
    .sort((left, right) => left.occurrenceStartTime.localeCompare(right.occurrenceStartTime));
}

export function MonthView({ activeDate, occurrences, onDayClick, onEventClick }: MonthViewProps) {
  const monthCells = buildMonthCells(activeDate);
  const today = new Date();
  const hasVisibleEvents = occurrences.length > 0;

  return (
    <section className={styles.wrapper} aria-label="Month calendar view">
      {!hasVisibleEvents ? (
        <div className={styles.emptyState} role="status">
          No events are scheduled in this month yet. Select a day to add one.
        </div>
      ) : null}

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekdayCell}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {monthCells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className={styles.emptyCell} aria-hidden="true" />;
          }

          const isToday = isSameDay(day, today);
          const dayOccurrences = getDayOccurrences(occurrences, day);

          return (
            <div key={day.toISOString()} className={`${styles.dayCell} ${isToday ? styles.today : ''}`}>
              <button
                type="button"
                className={styles.dayButton}
                onClick={() => onDayClick(day)}
                aria-label={`Create event on ${formatDate(day, 'EEEE, MMMM d, yyyy')}`}
              >
                <span className={styles.dayNumber}>{formatDate(day, 'd')}</span>
                <span className={styles.dayMeta}>
                  {dayOccurrences.length === 0
                    ? 'Open day'
                    : `${dayOccurrences.length} event${dayOccurrences.length === 1 ? '' : 's'}`}
                </span>
              </button>

              <div className={styles.eventList}>
                {dayOccurrences.length === 0 ? (
                  <span className={styles.placeholder}>No events</span>
                ) : (
                  <>
                    {dayOccurrences.slice(0, 3).map((occurrence) => (
                      <div key={occurrence.occurrenceId} className={styles.eventItem}>
                        <span className={styles.eventTime}>
                          {formatDate(parseISO(occurrence.occurrenceStartTime), 'HH:mm')}
                        </span>
                        <EventChip
                          event={occurrence}
                          className={styles.eventChip}
                          onClick={() => onEventClick(occurrence)}
                        />
                      </div>
                    ))}
                    {dayOccurrences.length > 3 ? (
                      <span className={styles.moreEvents}>+{dayOccurrences.length - 3} more</span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
