import React, { useState, useEffect } from 'react';
import '../styles/ActivityByDateTable.css';

function ActivityByDateTable({ trainerFilter, selectedMonth, trainerType = 'Assistant Trainer', useDateFilter, dateFilterMode, selectedDate, dateRangeStart, dateRangeEnd }) {
  const [activities, setActivities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [trainerFilter, selectedMonth, trainerType, useDateFilter, dateFilterMode, selectedDate, dateRangeStart, dateRangeEnd]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams();
      if (trainerFilter) {
        params.append('trainer', trainerFilter);
      }
      
      // Use date filter if enabled, otherwise use month filter
      if (useDateFilter) {
        if (dateFilterMode === 'single') {
          params.append('date', selectedDate);
        } else if (dateFilterMode === 'range') {
          params.append('dateFrom', dateRangeStart);
          params.append('dateTo', dateRangeEnd);
        }
      } else if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      
      // Pass trainer_type to filter by trainer type
      if (trainerType) {
        params.append('trainer_type', trainerType);
      }

      const query = params.toString();
      const endpoint = query ? `/api/activities/summary?${query}` : '/api/activities/summary';

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success && result.data) {
        // Group activities by trainer and date
        const groupedActivities = {};
        
        Object.entries(result.data).forEach(([trainer, trainerData]) => {
          if (!groupedActivities[trainer]) {
            groupedActivities[trainer] = {};
          }
          
          // Get all activities for this trainer
          const allActivities = result.raw_activities?.filter(a => a['Trainer Name'] === trainer) || [];
          
          allActivities.forEach(activity => {
            const date = activity['Date'];
            if (!date) return;
            
            if (!groupedActivities[trainer][date]) {
              groupedActivities[trainer][date] = [];
            }
            
            groupedActivities[trainer][date].push(activity);
          });
        });
        
        setActivities(groupedActivities);
      } else {
        setError(result.error || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-';
    
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const minutes = (endH - startH) * 60 + (endM - startM);
      const hours = (minutes / 60).toFixed(1);
      return `${hours}h`;
    } catch {
      return '-';
    }
  };

  if (loading) {
    return <div className="loading">Loading activities...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (Object.keys(activities).length === 0) {
    return <div className="no-data">No activities found for the selected filters.</div>;
  }

  return (
    <div className="activity-by-date-container">
      {Object.entries(activities).map(([trainer, dates]) => (
        <div key={trainer} className="trainer-activities-section">
          <h3 className="trainer-name">👤 {trainer}</h3>
          
          {Object.entries(dates)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, dayActivities]) => (
              <table key={`${trainer}-${date}`} className="activities-by-date-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {dayActivities.map((activity, idx) => (
                    <tr key={idx}>
                      <td className="day-column">{getDayName(date)}</td>
                      <td className="date-column">{date}</td>
                      <td className="activity-column">{activity['Activity'] || '-'}</td>
                      <td className="time-column">{activity['Start Time'] || '-'}</td>
                      <td className="time-column">{activity['End Time'] || '-'}</td>
                      <td className="duration-column">{calculateDuration(activity['Start Time'], activity['End Time'])}</td>
                      <td className="note-column">{activity['Note'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </div>
      ))}
    </div>
  );
}

export default ActivityByDateTable;
