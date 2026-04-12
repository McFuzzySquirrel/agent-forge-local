import type { CalendarEvent } from '../types/event';
import { formatDate, getDayHours, getWeekDays } from '../utils/dateHelpers';
import styles from '../styles/WeekView.module.css';

interface WeekViewProps {
  activeDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (date: Date) => void;
}

export function WeekView({ activeDate, events, onTimeSlotClick }: WeekViewProps) {
  const weekDays = getWeekDays(activeDate);
  const hours = getDayHours(activeDate);

  return (
    <section className={styles.wrapper} aria-label="Week calendar view">
      <div className={styles.summary} aria-live="polite">
        Loaded events: {events.length}
      </div>
      <div className={styles.grid}>
        <div className={styles.cornerCell} aria-hidden="true" />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={styles.dayHeader}>
            {formatDate(day, 'EEE M/d')}
          </div>
        ))}

        {hours.map((hour) => (
          <div key={hour.toISOString()} className={styles.hourRow}>
            <div className={styles.timeLabel}>{formatDate(hour, 'HH:mm')}</div>
            {weekDays.map((day) => {
              const slotDate = new Date(day);
              slotDate.setHours(hour.getHours(), 0, 0, 0);

              return (
                <button
                  type="button"
                  key={`${day.toISOString()}-${hour.getHours()}`}
                  className={styles.slot}
                  onClick={() => onTimeSlotClick(slotDate)}
                  aria-label={`Create event on ${formatDate(slotDate, 'EEEE MMM d')} at ${formatDate(slotDate, 'HH:mm')}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
