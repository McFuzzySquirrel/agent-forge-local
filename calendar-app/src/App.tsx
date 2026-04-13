import { useMemo, useState } from 'react';

import { CalendarHeader } from './components/CalendarHeader';
import { DayView } from './components/DayView';
import { EventModal } from './components/EventModal';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import type { CalendarOccurrence } from './store/recurrence';
import { expandRecurringEvents } from './store/recurrence';
import { useEventStore } from './store/useEventStore';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  getMonthDays,
  getWeekDays,
  startOfDay,
  subDays,
  subMonths,
  subWeeks,
} from './utils/dateHelpers';
import styles from './styles/App.module.css';

export type CalendarView = 'month' | 'week' | 'day';

function getVisibleRange(activeDate: Date, activeView: CalendarView): { start: Date; end: Date } {
  if (activeView === 'month') {
    const monthDays = getMonthDays(activeDate.getFullYear(), activeDate.getMonth());

    return {
      start: startOfDay(monthDays[0]),
      end: endOfDay(monthDays[monthDays.length - 1]),
    };
  }

  if (activeView === 'week') {
    const weekDays = getWeekDays(activeDate);

    return {
      start: startOfDay(weekDays[0]),
      end: endOfDay(weekDays[weekDays.length - 1]),
    };
  }

  return {
    start: startOfDay(activeDate),
    end: endOfDay(activeDate),
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<CalendarView>('month');
  const [activeDate, setActiveDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  // occurrenceDate tracks which specific occurrence was clicked; Task 3.2
  // (event-workflow-engineer) will read this to drive the recurrence-scope prompt.
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<Date | undefined>();
  const {
    events,
    validationErrors,
    addEvent,
    updateEvent,
    updateEventOccurrence,
    deleteEvent,
    deleteEventOccurrence,
    clearValidationErrors,
    validateEvent,
  } = useEventStore();

  const visibleRange = useMemo(() => getVisibleRange(activeDate, activeView), [activeDate, activeView]);
  const visibleOccurrences = useMemo(
    () => expandRecurringEvents(events, visibleRange.start, visibleRange.end),
    [events, visibleRange]
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  const handlePrev = () => {
    setActiveDate((current) => {
      if (activeView === 'month') {
        return subMonths(current, 1);
      }

      if (activeView === 'week') {
        return subWeeks(current, 1);
      }

      return subDays(current, 1);
    });
  };

  const handleNext = () => {
    setActiveDate((current) => {
      if (activeView === 'month') {
        return addMonths(current, 1);
      }

      if (activeView === 'week') {
        return addWeeks(current, 1);
      }

      return addDays(current, 1);
    });
  };

  const handleToday = () => {
    setActiveDate(new Date());
  };

  const handleCreateFromDate = (date: Date) => {
    setActiveDate(date);
    setSelectedDate(new Date(date));
    setSelectedEventId(undefined);
    setModalMode('create');
    clearValidationErrors();
    setIsModalOpen(true);
  };

  const handleEditEvent = (occurrence: CalendarOccurrence) => {
    const occurrenceDate = new Date(occurrence.occurrenceStartTime);

    setActiveDate(occurrenceDate);
    setSelectedDate(occurrenceDate);
    // Thread the occurrence date so Task 3.2 can pass it to EventModal for the
    // recurrence-scope prompt (edit this occurrence vs. all future).
    setSelectedOccurrenceDate(occurrenceDate);
    setSelectedEventId(occurrence.sourceEventId);
    setModalMode('edit');
    clearValidationErrors();
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEventId(undefined);
    setSelectedDate(undefined);
    setSelectedOccurrenceDate(undefined);
    clearValidationErrors();
  };

  let activeViewContent;

  if (activeView === 'month') {
    activeViewContent = (
      <MonthView
        activeDate={activeDate}
        occurrences={visibleOccurrences}
        onDayClick={handleCreateFromDate}
        onEventClick={handleEditEvent}
      />
    );
  } else if (activeView === 'week') {
    activeViewContent = (
      <WeekView
        activeDate={activeDate}
        occurrences={visibleOccurrences}
        onTimeSlotClick={handleCreateFromDate}
        onEventClick={handleEditEvent}
      />
    );
  } else {
    activeViewContent = (
      <DayView
        activeDate={activeDate}
        occurrences={visibleOccurrences}
        onTimeSlotClick={handleCreateFromDate}
        onEventClick={handleEditEvent}
      />
    );
  }

  return (
    <div className={styles.app}>
      <CalendarHeader
        activeView={activeView}
        activeDate={activeDate}
        onViewChange={setActiveView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />
      <main className={styles.viewContainer}>{activeViewContent}</main>
      <EventModal
        isOpen={isModalOpen}
        mode={modalMode}
        event={modalMode === 'edit' ? selectedEvent : undefined}
        occurrenceDate={modalMode === 'edit' ? selectedOccurrenceDate : undefined}
        selectedDate={selectedDate}
        validationErrors={validationErrors}
        validateEvent={validateEvent}
        onSave={(draft) => {
          if (modalMode === 'edit' && selectedEvent) {
            return updateEvent(selectedEvent.id, draft);
          }

          return addEvent(draft);
        }}
        onSaveOccurrence={
          modalMode === 'edit' && selectedEvent && selectedOccurrenceDate
            ? (draft, scope) =>
                updateEventOccurrence(selectedEvent.id, selectedOccurrenceDate, draft, scope)
            : undefined
        }
        onDelete={modalMode === 'edit' ? deleteEvent : undefined}
        onDeleteOccurrence={
          modalMode === 'edit' && selectedEvent && selectedOccurrenceDate
            ? (scope) => deleteEventOccurrence(selectedEvent.id, selectedOccurrenceDate, scope)
            : undefined
        }
        onClose={handleModalClose}
        onClearValidationErrors={clearValidationErrors}
      />
    </div>
  );
}
