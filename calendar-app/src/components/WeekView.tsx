import type { CalendarOccurrence } from '../store/recurrence';
import { formatDate, getDayHours, getWeekDays, isSameDay, parseISO } from '../utils/dateHelpers';
import { EventChip } from './EventChip';
import styles from '../styles/WeekView.module.css';

interface WeekViewProps {
  activeDate: Date;
  occurrences: CalendarOccurrence[];
  onTimeSlotClick: (date: Date) => void;
  onEventClick: (occurrence: CalendarOccurrence) => void;
}

function getSlotDate(day: Date, hour: number): Date {
  const slotDate = new Date(day);
  slotDate.setHours(hour, 0, 0, 0);
  return slotDate;
}

function getSlotOccurrences(
  occurrences: CalendarOccurrence[],
  day: Date,
  hour: number
): CalendarOccurrence[] {
  return occurrences
    .filter((occurrence) => {
      const occurrenceStart = parseISO(occurrence.occurrenceStartTime);

      return isSameDay(occurrenceStart, day) && occurrenceStart.getHours() === hour;
    })
    .sort((left, right) => left.occurrenceStartTime.localeCompare(right.occurrenceStartTime));
}

function getDayOccurrences(occurrences: CalendarOccurrence[], day: Date): CalendarOccurrence[] {
  return occurrences
    .filter((occurrence) => isSameDay(parseISO(occurrence.occurrenceStartTime), day))
    .sort((left, right) => left.occurrenceStartTime.localeCompare(right.occurrenceStartTime));
}

export function WeekView({ activeDate, occurrences, onTimeSlotClick, onEventClick }: WeekViewProps) {
  const weekDays = getWeekDays(activeDate);
  const hours = getDayHours(activeDate);
  const hasVisibleEvents = occurrences.length > 0;

  return (
    <section className={styles.wrapper} aria-label="Week calendar view">
      <div className={styles.summaryRow}>
        <h2 className={styles.title}>Week schedule</h2>
        <div className={styles.summary} aria-live="polite">
          {occurrences.length} visible event{occurrences.length === 1 ? '' : 's'}
        </div>
      </div>

      {!hasVisibleEvents ? (
        <div className={styles.emptyState} role="status">
          No events are scheduled in this week yet. Select a slot to add one.
        </div>
      ) : null}

      <div className={styles.desktopGrid}>
        <div className={styles.grid}>
          <div className={styles.cornerCell} aria-hidden="true" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={styles.dayHeader}>
              <span>{formatDate(day, 'EEE')}</span>
              <span className={styles.dayHeaderDate}>{formatDate(day, 'M/d')}</span>
            </div>
          ))}

          {hours.map((hour) => (
            <div key={hour.toISOString()} className={styles.hourRow}>
              <div className={styles.timeLabel}>{formatDate(hour, 'HH:mm')}</div>
              {weekDays.map((day) => {
                const slotDate = getSlotDate(day, hour.getHours());
                const slotOccurrences = getSlotOccurrences(occurrences, day, hour.getHours());

                return (
                  <div key={`${day.toISOString()}-${hour.getHours()}`} className={styles.slot}>
                    <button
                      type="button"
                      className={styles.slotAction}
                      onClick={() => onTimeSlotClick(slotDate)}
                      aria-label={`Create event on ${formatDate(slotDate, 'EEEE MMM d')} at ${formatDate(slotDate, 'HH:mm')}`}
                    >
                      <span className={styles.visuallyHidden}>Create event</span>
                    </button>

                    {slotOccurrences.length === 0 ? (
                      <span className={styles.slotHint} aria-hidden="true">
                        Add
                      </span>
                    ) : (
                      <div className={styles.slotEvents}>
                        {slotOccurrences.slice(0, 2).map((occurrence) => (
                          <div key={occurrence.occurrenceId} className={styles.slotEventItem}>
                            <EventChip
                              event={occurrence}
                              className={styles.slotEventChip}
                              onClick={() => onEventClick(occurrence)}
                            />
                          </div>
                        ))}
                        {slotOccurrences.length > 2 ? (
                          <span className={styles.moreEvents}>+{slotOccurrences.length - 2}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mobileDays}>
        {weekDays.map((day) => {
          const dayOccurrences = getDayOccurrences(occurrences, day);

          return (
            <article key={day.toISOString()} className={styles.mobileDayCard}>
              <header className={styles.mobileDayHeader}>
                <div>
                  <h3>{formatDate(day, 'EEEE')}</h3>
                  <p>{formatDate(day, 'MMMM d')}</p>
                </div>
                <span className={styles.mobileDaySummary}>
                  {dayOccurrences.length} event{dayOccurrences.length === 1 ? '' : 's'}
                </span>
              </header>

              <div className={styles.mobileTimeline}>
                {hours.map((hour) => {
                  const slotDate = getSlotDate(day, hour.getHours());
                  const slotOccurrences = getSlotOccurrences(occurrences, day, hour.getHours());

                  return (
                    <div key={`${day.toISOString()}-mobile-${hour.getHours()}`} className={styles.mobileSlotRow}>
                      <span className={styles.mobileTimeLabel}>{formatDate(hour, 'HH:mm')}</span>
                      <div className={styles.mobileSlotContent}>
                        <button
                          type="button"
                          className={styles.mobileSlotAction}
                          onClick={() => onTimeSlotClick(slotDate)}
                          aria-label={`Create event on ${formatDate(slotDate, 'EEEE MMM d')} at ${formatDate(slotDate, 'HH:mm')}`}
                        >
                          <span className={styles.visuallyHidden}>Create event</span>
                        </button>

                        {slotOccurrences.length === 0 ? (
                          <span className={styles.mobileSlotHint} aria-hidden="true">
                            Add event
                          </span>
                        ) : (
                          <div className={styles.mobileSlotEvents}>
                            {slotOccurrences.map((occurrence) => (
                              <div key={occurrence.occurrenceId} className={styles.mobileEventItem}>
                                <span className={styles.mobileEventTime}>
                                  {formatDate(parseISO(occurrence.occurrenceStartTime), 'HH:mm')}
                                </span>
                                <EventChip
                                  event={occurrence}
                                  className={styles.mobileEventChip}
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
