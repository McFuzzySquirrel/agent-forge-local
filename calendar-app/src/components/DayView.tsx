import type { CalendarEvent } from '../types/event';
import { formatDate, getDayHours } from '../utils/dateHelpers';
import styles from '../styles/DayView.module.css';

interface DayViewProps {
  activeDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (date: Date) => void;
}

export function DayView({ activeDate, events, onTimeSlotClick }: DayViewProps) {
  const hours = getDayHours(activeDate);

  return (
    <section className={styles.wrapper} aria-label="Day calendar view">
      <div className={styles.dayHeader}>
        <h2>{formatDate(activeDate, 'EEEE, MMM d')}</h2>
        <span>Loaded events: {events.length}</span>
      </div>

      <div className={styles.timeline}>
        {hours.map((hour) => {
          const slotDate = new Date(hour);

          return (
            <button
              type="button"
              key={hour.toISOString()}
              className={styles.slotRow}
              onClick={() => onTimeSlotClick(slotDate)}
              aria-label={`Create event at ${formatDate(slotDate, 'HH:mm')}`}
            >
              <span className={styles.timeLabel}>{formatDate(hour, 'HH:mm')}</span>
              <span className={styles.slotContent} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
