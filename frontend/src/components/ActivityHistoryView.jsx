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
  const [selectedMonth, setSelectedMonth] = useState(null); // null = all months
  const [availableActivities, setAvailableActivities] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error
  
  // Edit state
  const [editingActivity, setEditingActivity] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startTime: '',
    endTime: '',
    note: ''
  });

  // Frozen dates
  const [frozenDates, setFrozenDates] = useState([]);
  
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
    
    // Load frozen dates
    fetchFrozenDates();
  }, [currentTrainer, isAdminView]);

  useEffect(() => {
    fetchActivityHistory();
  }, [selectedTrainer, selectedActivity, selectedMonth]);

  const fetchFrozenDates = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('trainerToken');
      if (!token) return;

      const response = await fetch('/api/freeze/dates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setFrozenDates(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching frozen dates:', err);
    }
  };

  const isFrozen = (date) => {
    return frozenDates.some(freeze => {
      const freezeValue = freeze['Date/Month'];
      const freezeType = freeze['Freeze Type'];
      
      if (freezeType === 'Date Range') {
        // Parse range format: "2024-01-01 to 2024-01-31"
        try {
          const parts = freezeValue.split(' to ');
          if (parts.length === 2) {
            const startDate = parts[0].trim();
            const endDate = parts[1].trim();
            // Check if date falls within range
            if (date >= startDate && date <= endDate) {
              return true;
            }
          }
        } catch (e) {
          // If parsing fails, skip this freeze
        }
      }
      
      if (freezeType === 'Month') {
        const monthPart = date.substring(0, 7); // YYYY-MM
        return freezeValue === monthPart;
      }
      
      return false;
    });
  };

  const fetchTrainers = async () => {
    try {
      // Use /api/trainers/staff to get only Assistant Trainers and Juniors (no volunteers)
      const response = await fetch('/api/trainers/staff');
      const result = await response.json();
      if (result.success && result.data) {
        setTrainers(result.data);
        if (result.data.length > 0) {
          // Set only the trainer name, not the entire object
          setSelectedTrainer(result.data[0].name);
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
    // Reset month to all months
    setSelectedMonth(null);
    setCurrentPage(1);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setEditFormData({
      startTime: activity['Start Time'],
      endTime: activity['End Time'],
      note: activity['Note'] || ''
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.startTime || !editFormData.endTime) {
      setMessage('Start Time and End Time are required');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch(
        `/api/activities/${editingActivity['Trainer Name']}/${editingActivity['Date']}/${editingActivity['Activity']}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            start_time: editFormData.startTime,
            end_time: editFormData.endTime,
            note: editFormData.note,
            old_start_time: editingActivity['Start Time'],
            old_end_time: editingActivity['End Time']
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Activity updated successfully`);
        setMessageType('success');
        setEditingActivity(null);
        fetchActivityHistory();
      } else {
        setMessage(`❌ ${result.message || 'Failed to update activity'}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      setMessage('Failed to update activity: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditFormData({ startTime: '', endTime: '', note: '' });
  };

  const handleDeleteActivity = async (activity) => {
    if (!window.confirm(`Are you sure you want to delete this activity?\n${activity.Date} | ${activity['Trainer Name']} | ${activity.Activity}`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/activities/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          trainer_name: activity['Trainer Name'],
          date: activity['Date'],
          activity: activity['Activity'],
          start_time: activity['Start Time'],
          end_time: activity['End Time']
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Activity deleted successfully`);
        setMessageType('success');
        fetchActivityHistory();
      } else {
        setMessage(`❌ ${result.message || 'Failed to delete activity'}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      setMessage('Failed to delete activity');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`⚠️ WARNING: This will delete ALL ${activities.length} activities matching the current filters!\n\nTrainer: ${selectedTrainer || 'All'}\nActivity: ${selectedActivity || 'All'}\nMonth: ${selectedMonth}\n\nThis action cannot be undone. Are you sure?`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/activities/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          trainer: selectedTrainer || null,
          activity_type: selectedActivity || null,
          month: selectedMonth
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${result.deleted_count || activities.length} activities deleted successfully`);
        setMessageType('success');
        fetchActivityHistory();
      } else {
        setMessage(`❌ ${result.message || 'Failed to delete activities'}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error deleting activities:', err);
      setMessage('Failed to delete activities');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
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
                  <option key={trainer.name} value={trainer.name}>
                    {trainer.name}
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
            <select
              value={selectedMonth || 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedMonth(null);
                } else {
                  setSelectedMonth(e.target.value);
                }
              }}
            >
              <option value="all">-- All Months --</option>
              {/* Generate last 12 months */}
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              }).map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
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
        <div className="summary-actions">
          {isAdminView && activities.length > 0 && (
            <button className="btn-delete-all" onClick={handleDeleteAll}>
              🗑️ Delete All Filtered
            </button>
          )}
          <button className="btn-export" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Error/Loading */}
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className={`alert alert-${messageType}`}>{message}</div>}
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
                  {isAdminView && <th>Actions</th>}
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
                      {isAdminView && (
                        <td className={`actions-cell ${isFrozen(activity['Date']) ? 'frozen' : ''}`}>
                          {isFrozen(activity['Date']) ? (
                            <>
                              <span className="frozen-indicator" title="This date is frozen">
                                🔒
                              </span>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-edit-small"
                                onClick={() => handleEditActivity(activity)}
                                title="Edit activity"
                                disabled={editingActivity !== null}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-delete-small"
                                onClick={() => handleDeleteActivity(activity)}
                                title="Delete activity"
                                disabled={editingActivity !== null}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </td>
                      )}
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

      {/* Edit Modal */}
      {editingActivity && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Activity</h3>
              <button className="modal-close" onClick={handleCancelEdit}>×</button>
            </div>

            <div className="modal-body">
              <div className="activity-info">
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">{editingActivity['Date']}</span>
                </div>
                <div className="info-row">
                  <span className="label">Trainer:</span>
                  <span className="value">{editingActivity['Trainer Name']}</span>
                </div>
                <div className="info-row">
                  <span className="label">Activity:</span>
                  <span className="value">{editingActivity['Activity']}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Start Time:</label>
                <input
                  type="time"
                  value={editFormData.startTime}
                  onChange={(e) => handleEditFormChange('startTime', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>End Time:</label>
                <input
                  type="time"
                  value={editFormData.endTime}
                  onChange={(e) => handleEditFormChange('endTime', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Note:</label>
                <textarea
                  value={editFormData.note}
                  onChange={(e) => handleEditFormChange('note', e.target.value)}
                  className="form-textarea"
                  placeholder="Optional note"
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-cancel"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-save"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityHistoryView;
