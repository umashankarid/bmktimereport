import React, { useState, useEffect } from 'react';
import '../styles/DatePickerCalendar.css';

function DatePickerCalendar({ selectedDate, onChange, trainerName }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate || new Date());
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  
  const [daysWithActivities, setDaysWithActivities] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch activities for the current month to show which days have entries
  useEffect(() => {
    if (trainerName) {
      fetchActivitiesForMonth();
    }
  }, [currentMonth, trainerName]);

  const fetchActivitiesForMonth = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      
      // Fetch all activities and filter client-side
      const response = await fetch('/api/activities');
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Filter activities by trainer name and current month
        const dates = new Set();
        result.data.forEach(activity => {
          if (activity.Trainer === trainerName && activity.Date) {
            // Check if activity date is in the current month
            const activityDate = new Date(activity.Date);
            if (activityDate.getFullYear() === year && activityDate.getMonth() === currentMonth.getMonth()) {
              dates.add(activity.Date);
            }
          }
        });
        setDaysWithActivities(dates);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    // Don't allow future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate > today) {
      return;
    }
    
    const dateStr = newDate.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
  const formattedDate = selectedDateObj ? selectedDateObj.toLocaleDateString('default', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date';

  return (
    <div className="date-picker-calendar">
      <div className="date-display-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="date-text">{formattedDate}</span>
        <span className="calendar-icon">📅</span>
      </div>

      {isOpen && (
        <div className="calendar-popup">
          <div className="calendar-header">
            <button className="nav-btn" onClick={previousMonth}>←</button>
            <h3>{monthName}</h3>
            <button className="nav-btn" onClick={nextMonth}>→</button>
          </div>

          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="day empty"></div>;
              }

              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              dateObj.setHours(0, 0, 0, 0);
              const dateStr = dateObj.toISOString().split('T')[0];
              const hasActivity = daysWithActivities.has(dateStr);
              const isFuture = dateObj > today;
              const isToday = dateObj.getTime() === today.getTime();
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  className={`day ${hasActivity ? 'has-activity' : ''} ${isFuture ? 'future' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDateClick(day)}
                  disabled={isFuture}
                  title={hasActivity ? 'Has activity' : 'No activity'}
                >
                  <span className="day-number">{day}</span>
                  {hasActivity && <span className="activity-indicator">●</span>}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot has-activity">●</span>
              <span>Has Activity</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot no-activity">○</span>
              <span>No Activity</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePickerCalendar;
