import type { CalendarEvent } from '../types/event';
import { formatDate, getMonthDays, isSameDay } from '../utils/dateHelpers';
import styles from '../styles/MonthView.module.css';

interface MonthViewProps {
  activeDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthView({ activeDate, events, onDayClick }: MonthViewProps) {
  const monthDays = getMonthDays(activeDate.getFullYear(), activeDate.getMonth());
  const today = new Date();

  return (
    <section className={styles.wrapper} aria-label="Month calendar view">
      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekdayCell}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {monthDays.map((day) => {
          const isToday = isSameDay(day, today);

          return (
            <button
              type="button"
              key={day.toISOString()}
              className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
              onClick={() => onDayClick(day)}
              aria-label={`Open day ${formatDate(day, 'EEEE, MMMM d, yyyy')}`}
            >
              <span className={styles.dayNumber}>{formatDate(day, 'd')}</span>
              <span className={styles.placeholder}>
                {events.length === 0 ? 'No events yet' : 'Event chips arrive in Phase 2'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
