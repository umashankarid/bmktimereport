import React, { useState, useEffect } from 'react';
import '../styles/ActivityCalendar.css';

function ActivityCalendar({ trainerName, currentMonth }) {
  const [calendar, setCalendar] = useState([]);
  const [datesWithActivities, setDatesWithActivities] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(currentMonth || new Date());

  useEffect(() => {
    fetchActivitiesForMonth();
  }, [month, trainerName]);

  const fetchActivitiesForMonth = async () => {
    try {
      setLoading(true);
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      
      console.log(`📅 Fetching activities for ${trainerName} in ${year}-${monthNum}`);
      
      // Get all activities for the trainer in this month
      // Since we don't have a month-based endpoint, we'll fetch the activity summary
      const response = await fetch(
        `/api/activities/summary?trainer=${encodeURIComponent(trainerName)}&month=${year}-${String(monthNum).padStart(2, '0')}`
      );
      const result = await response.json();
      
      if (result.success && result.data) {
        // Extract unique dates that have activities
        const datesSet = new Set();
        result.data.forEach(activity => {
          if (activity.Date) {
            datesSet.add(activity.Date);
          }
        });
        setDatesWithActivities(datesSet);
        console.log(`✅ Found activities on ${datesSet.size} dates`);
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

  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(month);
    const firstDay = getFirstDayOfMonth(month);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const hasActivity = (day) => {
    if (!day) return false;
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return datesWithActivities.has(dateStr);
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      month.getMonth() === today.getMonth() &&
      month.getFullYear() === today.getFullYear()
    );
  };

  const previousMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1));
  };

  const nextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1));
  };

  const goToToday = () => {
    setMonth(new Date());
  };

  const monthYear = month.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = generateCalendar();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="activity-calendar">
      <div className="calendar-header">
        <button className="btn-nav" onClick={previousMonth}>← Prev</button>
        <div className="calendar-month-year">
          <h3>{monthYear}</h3>
          <button className="btn-today" onClick={goToToday}>Today</button>
        </div>
        <button className="btn-nav" onClick={nextMonth}>Next →</button>
      </div>

      {loading && <div className="calendar-loading">Loading activities...</div>}

      <div className="calendar-grid">
        <div className="calendar-day-names">
          {dayNames.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>

        <div className="calendar-days">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="calendar-week">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`calendar-day ${day ? 'active' : 'empty'} ${
                    hasActivity(day) ? 'has-activity' : ''
                  } ${isToday(day) ? 'today' : ''}`}
                >
                  {day && (
                    <>
                      <div className="day-number">{day}</div>
                      {hasActivity(day) && <div className="activity-indicator">●</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color today"></div>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <div className="legend-color has-activity"></div>
          <span>Has Activities</span>
        </div>
      </div>
    </div>
  );
}

export default ActivityCalendar;
