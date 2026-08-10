import React, { useState, useEffect } from 'react';
import '../styles/TimeReportStatus.css';

function TimeReportStatus({ trainerType = 'Assistant Trainer' }) {
  const [reportData, setReportData] = useState({});
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchReportStatus();
    fetchTrainers();
    fetchActivities();
  }, [selectedMonth, trainerType]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      params.append('month', selectedMonth);
      params.append('trainer_type', trainerType);

      const response = await fetch(`/api/activities?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Group activities by trainer and date
        const grouped = {};
        result.data.forEach(activity => {
          const trainer = activity['Trainer Name'];
          const date = activity['Date'];
          
          if (!trainer || !date) return;
          
          if (!grouped[trainer]) {
            grouped[trainer] = {};
          }
          
          if (!grouped[trainer][date]) {
            grouped[trainer][date] = [];
          }
          
          grouped[trainer][date].push(activity);
        });
        
        // Sort activities within each date by start time
        for (const trainer in grouped) {
          for (const date in grouped[trainer]) {
            grouped[trainer][date].sort((a, b) => {
              const timeA = a['Start Time'] || '00:00';
              const timeB = b['Start Time'] || '00:00';
              return timeA.localeCompare(timeB); // Ascending order (earliest first)
            });
          }
        }
        
        setActivities(grouped);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/trainers/details/all');
      const result = await response.json();
      if (result.success && result.data) {
        // Filter trainers based on trainer type
        const filteredTrainers = result.data.filter(t => t.trainer_type === trainerType);
        setTrainers(filteredTrainers);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const fetchReportStatus = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/reports/time-status?month=${selectedMonth}&trainer_type=${trainerType}`);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data || {});
      } else {
        setError(result.error || 'Failed to load report status');
      }
    } catch (err) {
      console.error('Error fetching report status:', err);
      setError('Failed to load report status');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month) => {
    const [year, monthNum] = month.split('-');
    return new Date(year, monthNum, 0).getDate();
  };

  const hasActivityOnDate = (trainer, dateStr) => {
    if (!reportData[trainer]) return false;
    return reportData[trainer].activities && reportData[trainer].activities.includes(dateStr);
  };

  const getLastActivityDate = (trainer) => {
    if (!reportData[trainer] || !reportData[trainer].activities) return null;
    const dates = reportData[trainer].activities.sort().reverse();
    return dates.length > 0 ? dates[0] : null;
  };

  const getDaysSinceLastReport = (trainer) => {
    const lastDate = getLastActivityDate(trainer);
    if (!lastDate) return 999; // No reports at all

    // Calculate days since last activity to today (for current month context)
    const last = new Date(lastDate);
    const today = new Date();
    
    // Set both times to midnight for accurate day count
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - last;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isHighlighted = (trainer) => {
    return getDaysSinceLastReport(trainer) >= 3;
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
      const hours = minutes / 60;
      
      // Return just the number: 11 if no decimal, 11.5 if has decimal
      if (hours % 1 === 0) {
        return hours.toString();
      } else {
        return hours.toFixed(1);
      }
    } catch {
      return '-';
    }
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  const [year, month] = selectedMonth.split('-');
  const monthName = new Date(`${selectedMonth}-01`).toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="time-report-status-container">
      <h2>Time Report Status</h2>
      <p className="section-description">
        Track daily activity reports for each trainer. Highlighted trainers haven't reported for 3+ days.
      </p>

      {trainerType !== 'Assistant Trainer' ? (
        <div className="access-denied">
          <div className="denied-icon">🔒</div>
          <h3>Access Restricted</h3>
          <p>Time Report Status is only available for Assistant Trainers.</p>
          <p className="current-role">Your role: <strong>{trainerType}</strong></p>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          <div className="status-filters">
            <div className="filter-group">
              <label htmlFor="month-filter">Month & Year:</label>
              <input
                type="month"
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading report status...</div>
          ) : (
            <>
          <div className="calendar-view-container">
            <div className="calendar-header">
              <h3>{monthName}</h3>
            </div>

            <div className="status-table-wrapper">
              <table className="status-table">
                <thead>
                  <tr>
                    <th className="trainer-col">Trainer</th>
                    {days.map(day => {
                      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dayDate = new Date(dateStr);
                      dayDate.setHours(0, 0, 0, 0);
                      const isToday = dayDate.getTime() === today.getTime();
                      const isFuture = dayDate > today;
                      
                      return (
                        <th key={day} className={`day-col ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}>
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {trainers.length > 0 ? (
                    trainers.map(trainerObj => {
                      const trainerName = typeof trainerObj === 'string' ? trainerObj : trainerObj.name;

                      return (
                        <tr key={trainerName} className="trainer-row">
                          <td className="trainer-col">
                            <span className="trainer-name">
                              {trainerName}
                            </span>
                          </td>
                          {days.map(day => {
                            const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
                            const hasActivity = hasActivityOnDate(trainerName, dateStr);
                            
                            // Only show ✗ for dates up to today, not future dates
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dayDate = new Date(dateStr);
                            dayDate.setHours(0, 0, 0, 0);
                            const isFuture = dayDate > today;
                            
                            const cellContent = hasActivity ? '✓' : (isFuture ? '' : '✗');

                            return (
                              <td
                                key={`${trainerName}-${day}`}
                                className={`day-cell ${hasActivity ? 'reported' : isFuture ? 'future' : 'not-reported'}`}
                                title={hasActivity ? 'Reported' : isFuture ? 'Future date' : 'Not reported'}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="no-data">
                        No trainers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="legend">
              <div className="legend-item">
                <span className="legend-symbol reported">✓</span>
                <span>Activity Reported</span>
              </div>
              <div className="legend-item">
                <span className="legend-symbol not-reported">✗</span>
                <span>Not Reported (Past Date)</span>
              </div>
              <div className="legend-item">
                <span className="legend-symbol" style={{background: '#f5f5f5', color: '#999'}}>-</span>
                <span>Future Date</span>
              </div>
            </div>
          </div>

          {/* Detailed Activity Tables by Trainer */}
          <div className="detailed-activities-container">
            <h3>Detailed Activities by Trainer</h3>
            {trainers.map(trainerObj => {
              const trainerName = typeof trainerObj === 'string' ? trainerObj : trainerObj.name;
              const trainerActivities = activities[trainerName] || {};
              
              // Sort dates and get activities
              const sortedDates = Object.keys(trainerActivities).sort();
              
              if (sortedDates.length === 0) {
                return null; // Skip trainers with no activities
              }
              
              // Calculate total hours for this trainer
              let totalHours = 0;
              sortedDates.forEach(date => {
                trainerActivities[date].forEach(activity => {
                  const duration = calculateDuration(activity['Start Time'], activity['End Time']);
                  if (duration !== '-') {
                    totalHours += parseFloat(duration);
                  }
                });
              });
              
              return (
                <div key={trainerName} className="trainer-activities-section">
                  <h4 className="trainer-section-title">👤 {trainerName}</h4>
                  <table className="detailed-activities-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Duration (Hours)</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDates.map((date, dateIdx) => (
                        <React.Fragment key={date}>
                          <tr className="day-header-row">
                            <td colSpan="7" className="day-header-cell">
                              📅 {getDayName(date)} - {date}
                            </td>
                          </tr>
                          {trainerActivities[date].map((activity, actIdx) => (
                            <tr key={`${date}-${actIdx}`} className={`activity-row ${dateIdx % 2 === 0 ? 'even-date' : 'odd-date'}`}>
                              <td className="day-column">-</td>
                              <td className="date-column">-</td>
                              <td className="activity-column">{activity['Activity'] || '-'}</td>
                              <td className="time-column">{activity['Start Time'] || '-'}</td>
                              <td className="time-column">{activity['End Time'] || '-'}</td>
                              <td className="duration-column">{calculateDuration(activity['Start Time'], activity['End Time'])}</td>
                              <td className="note-column">{activity['Note'] || '-'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      <tr className="total-row">
                        <td colSpan="5" className="total-label">Total Hours:</td>
                        <td className="total-hours">{totalHours % 1 === 0 ? totalHours.toString() : totalHours.toFixed(1)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default TimeReportStatus;
