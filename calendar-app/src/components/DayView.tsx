import { memo } from 'react';

import type { CalendarOccurrence } from '../store/recurrence';
import { formatDate, getDayHours, parseISO } from '../utils/dateHelpers';
import { EventChip } from './EventChip';
import styles from '../styles/DayView.module.css';

interface DayViewProps {
  activeDate: Date;
  occurrences: CalendarOccurrence[];
  onTimeSlotClick: (date: Date) => void;
  onEventClick: (occurrence: CalendarOccurrence) => void;
}

function getHourOccurrences(occurrences: CalendarOccurrence[], hour: number): CalendarOccurrence[] {
  return occurrences
    .filter((occurrence) => parseISO(occurrence.occurrenceStartTime).getHours() === hour)
    .sort((left, right) => left.occurrenceStartTime.localeCompare(right.occurrenceStartTime));
}

export const DayView = memo(function DayView({ activeDate, occurrences, onTimeSlotClick, onEventClick }: DayViewProps) {
  const hours = getDayHours(activeDate);
  const hasVisibleEvents = occurrences.length > 0;

  return (
    <section className={styles.wrapper} aria-label="Day calendar view">
      <div className={styles.dayHeader}>
        <h2>{formatDate(activeDate, 'EEEE, MMM d')}</h2>
        <span>{occurrences.length} visible event{occurrences.length === 1 ? '' : 's'}</span>
      </div>

      {!hasVisibleEvents ? (
        <div className={styles.emptyState} role="status">
          No events are scheduled for this day yet. Select a time slot to add one.
        </div>
      ) : null}

      <div className={styles.timeline}>
        {hours.map((hour) => {
          const slotDate = new Date(hour);
          const hourOccurrences = getHourOccurrences(occurrences, hour.getHours());

          return (
            <div key={hour.toISOString()} className={styles.slotRow}>
              <span className={styles.timeLabel}>{formatDate(hour, 'HH:mm')}</span>
              <div className={styles.slotContent}>
                <button
                  type="button"
                  className={styles.slotAction}
                  onClick={() => onTimeSlotClick(slotDate)}
                  aria-label={`Create event at ${formatDate(slotDate, 'HH:mm')}`}
                >
                  <span className={styles.visuallyHidden}>Create event</span>
                </button>

                {hourOccurrences.length === 0 ? (
                  <span className={styles.slotHint} aria-hidden="true">
                    Tap to add an event
                  </span>
                ) : (
                  <div className={styles.slotEvents}>
                    {hourOccurrences.map((occurrence) => (
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
