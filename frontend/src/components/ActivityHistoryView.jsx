import React, { useState, useEffect } from 'react';
import '../styles/ActivityHistoryView.css';

function ActivityHistoryView({ currentTrainer = null, isAdminView = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trainers, setTrainers] = useState([]);
  
  // Filter states
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month (YYYY-MM)
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableActivities, setAvailableActivities] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Load trainers if admin view
    if (isAdminView) {
      fetchTrainers();
    } else if (currentTrainer?.name) {
      setSelectedTrainer(currentTrainer.name);
    }
    
    // Load activity types
    fetchActivityTypes();
  }, [currentTrainer, isAdminView]);

  useEffect(() => {
    fetchActivityHistory();
  }, [selectedTrainer, selectedActivity, selectedMonth]);

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/trainers');
      const result = await response.json();
      if (result.success && result.data) {
        setTrainers(result.data);
        if (result.data.length > 0) {
          setSelectedTrainer(result.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch('/api/activity-list');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailableActivities(result.data);
      }
    } catch (err) {
      console.error('Error fetching activity types:', err);
    }
  };

  const fetchActivityHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      
      if (selectedTrainer) {
        params.append('trainer', selectedTrainer);
      }
      
      if (selectedActivity) {
        params.append('activity', selectedActivity);
      }
      
      if (selectedMonth) {
        // Convert YYYY-MM to date range for backend
        const [year, month] = selectedMonth.split('-');
        const monthNum = parseInt(month);
        const startOfMonth = `${year}-${String(monthNum).padStart(2, '0')}-01`;
        
        // Calculate end of month
        const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
        const endOfMonth = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        params.append('start_date', startOfMonth);
        params.append('end_date', endOfMonth);
      }
      
      params.append('limit', 500);
      
      const response = await fetch(`/api/activity-history?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data || []);
        setCurrentPage(1);
      } else {
        setError(result.message || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error fetching activity history:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedActivity('');
    // Reset month to current month
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = activities.slice(startIdx, startIdx + itemsPerPage);

  const handleExportCSV = () => {
    if (activities.length === 0) {
      setError('No activities to export');
      return;
    }

    // Create CSV content
    const headers = ['Trainer Name', 'Date', 'Activity', 'Start Time', 'End Time', 'Duration', 'Note'];
    const rows = activities.map(act => {
      // Calculate duration
      let duration = '';
      if (act['Start Time'] && act['End Time']) {
        try {
          const [startH, startM] = act['Start Time'].split(':').map(Number);
          const [endH, endM] = act['End Time'].split(':').map(Number);
          const durationMins = (endH - startH) * 60 + (endM - startM);
          const hours = Math.floor(durationMins / 60);
          const mins = durationMins % 60;
          duration = `${hours}:${String(mins).padStart(2, '0')}`;
        } catch (e) {
          duration = '';
        }
      }

      return [
        act['Trainer Name'] || '',
        act['Date'] || '',
        act['Activity'] || '',
        act['Start Time'] || '',
        act['End Time'] || '',
        duration,
        act['Note'] || ''
      ];
    });

    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="activity-history-view">
      <h2>📝 Activity History</h2>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        
        <div className="filter-row">
          {isAdminView && trainers.length > 0 && (
            <div className="filter-group">
              <label>Trainer:</label>
              <select
                value={selectedTrainer || ''}
                onChange={(e) => setSelectedTrainer(e.target.value || null)}
              >
                <option value="">-- All Trainers --</option>
                {trainers.map(trainer => (
                  <option key={trainer} value={trainer}>
                    {trainer}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Activity Type:</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
            >
              <option value="">-- All Activities --</option>
              {availableActivities.map(activity => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <button className="btn-clear" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-bar">
        <span className="summary-text">
          Total Activities: <strong>{activities.length}</strong>
          {selectedTrainer && ` | Trainer: ${selectedTrainer}`}
          {selectedActivity && ` | Activity: ${selectedActivity}`}
        </span>
        <button className="btn-export" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </div>

      {/* Error/Loading */}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loading">Loading activities...</div>}

      {/* Activities Table */}
      {!loading && activities.length > 0 && (
        <>
          <div className="table-container">
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trainer</th>
                  <th>Activity</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {paginatedActivities.map((activity, idx) => {
                  let duration = '';
                  if (activity['Start Time'] && activity['End Time']) {
                    try {
                      const [startH, startM] = activity['Start Time'].split(':').map(Number);
                      const [endH, endM] = activity['End Time'].split(':').map(Number);
                      const durationMins = (endH - startH) * 60 + (endM - startM);
                      const hours = Math.floor(durationMins / 60);
                      const mins = durationMins % 60;
                      duration = `${hours}:${String(mins).padStart(2, '0')}`;
                    } catch (e) {
                      duration = '-';
                    }
                  }

                  return (
                    <tr key={idx}>
                      <td className="date-cell">{activity['Date']}</td>
                      <td className="trainer-cell">{activity['Trainer Name']}</td>
                      <td className="activity-cell">{activity['Activity']}</td>
                      <td className="time-cell">{activity['Start Time']}</td>
                      <td className="time-cell">{activity['End Time']}</td>
                      <td className="duration-cell">{duration}</td>
                      <td className="note-cell">{activity['Note'] || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <div className="page-info">
                Page {currentPage} of {totalPages}
              </div>

              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No Activities Found</h3>
          <p>Try adjusting your filters or logging new activities</p>
        </div>
      )}
    </div>
  );
}

export default ActivityHistoryView;
