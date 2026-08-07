import React, { useState, useEffect } from 'react';
import '../styles/TimeReportStatus.css';

function TimeReportStatus({ trainerType = 'Assistant Trainer' }) {
  const [reportData, setReportData] = useState({});
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchReportStatus();
    fetchTrainers();
  }, [selectedMonth, trainerType]);

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
            </>
          )}
        </>
      )}
    </div>
  );
}

export default TimeReportStatus;
