import React, { useState, useEffect } from 'react';
import '../styles/PaymentManagement.css';

function PaymentManagement() {
  const [activeTab, setActiveTab] = useState('assistants'); // 'assistants' or 'juniors'
  
  // Assistant Trainer State
  const [frozenEntries, setFrozenEntries] = useState([]);
  const [freezeType, setFreezeType] = useState('Date Range');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [freezeMonth, setFreezeMonth] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  
  // Junior Trainer State
  const [unpaidActivities, setUnpaidActivities] = useState([]);
  const [selectedJunior, setSelectedJunior] = useState('');
  const [juniors, setJuniors] = useState([]);
  const [selectedDate, setSelectedDate] = useState(''); // No default date
  
  // General State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchFrozenDates();
    fetchJuniors();
  }, []);

  // Fetch unpaid activities when selected junior or date changes
  useEffect(() => {
    if (selectedJunior) {
      fetchUnpaidActivities(selectedJunior);
    }
  }, [selectedJunior, selectedDate]);

  // ==================== ASSISTANT TRAINER FUNCTIONS ====================
  
  const fetchFrozenDates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/freeze/dates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setFrozenEntries(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching frozen dates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFreeze = async () => {
    let freezeValue = '';
    
    if (freezeType === 'Date Range') {
      if (!startDate || !endDate) {
        setMessage('Please select both start and end dates');
        setMessageType('error');
        return;
      }
      
      if (new Date(startDate) > new Date(endDate)) {
        setMessage('End date must be after start date');
        setMessageType('error');
        return;
      }
      
      freezeValue = `${startDate} to ${endDate}`;
    } else if (freezeType === 'Month') {
      if (!freezeMonth) {
        setMessage('Please select a month');
        setMessageType('error');
        return;
      }
      freezeValue = freezeMonth;
    }

    try {
      setLoading(true);
      setMessage('');

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/freeze/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          freeze_type: freezeType,
          date_or_month: freezeValue,
          reason: freezeReason
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${freezeType} marked successfully`);
        setMessageType('success');
        setStartDate('');
        setEndDate('');
        setFreezeMonth('');
        setFreezeReason('');
        fetchFrozenDates();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error marking freeze: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFreeze = async (freezeType, dateOrMonth) => {
    if (!window.confirm(`Remove freeze for ${dateOrMonth}?`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/freeze/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          freeze_type: freezeType,
          date_or_month: dateOrMonth
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Freeze removed successfully`);
        setMessageType('success');
        fetchFrozenDates();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error removing freeze: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== JUNIOR TRAINER FUNCTIONS ====================

  const fetchJuniors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/trainers/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success && result.data) {
        // Filter only Junior trainers
        const juniorTrainers = result.data.filter(t => t.trainer_type === 'Junior Trainer' || t.trainer_type === 'Junior');
        setJuniors(juniorTrainers);
        if (juniorTrainers.length > 0) {
          setSelectedJunior(juniorTrainers[0].name);
          fetchUnpaidActivities(juniorTrainers[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching juniors:', err);
    }
  };

  const fetchUnpaidActivities = async (trainerName) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`/api/activities?trainer=${encodeURIComponent(trainerName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success && result.data) {
        // Filter only unpaid activities
        let unpaid = result.data.filter(a => !a.Paid || a.Paid === 'No' || a.Paid === '');
        
        // Filter by date if selected
        if (selectedDate) {
          unpaid = unpaid.filter(a => a.Date === selectedDate);
        }
        
        setUnpaidActivities(unpaid);
      }
    } catch (err) {
      console.error('Error fetching unpaid activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJuniorChange = (e) => {
    const trainerName = e.target.value;
    setSelectedJunior(trainerName);
    fetchUnpaidActivities(trainerName);
  };

  const handleMarkAsPaid = async (activity) => {
    if (!window.confirm(`Mark "${activity.Activity}" on ${activity.Date} as paid?`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const token = localStorage.getItem('adminToken');
      
      // Optimistically remove from UI immediately
      const activityKey = `${activity.Date}-${activity.Activity}`;
      setUnpaidActivities(prev => 
        prev.filter(a => `${a.Date}-${a.Activity}` !== activityKey)
      );

      const response = await fetch('/api/activities/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trainer_name: activity['Trainer Name'],
          date: activity.Date,
          activity: activity.Activity,
          paid: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Activity marked as paid and frozen`);
        setMessageType('success');
        // Optional: refresh to ensure consistency, but not required since we optimistically updated
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
        // On error, re-fetch to restore the activity to the list
        fetchUnpaidActivities(selectedJunior);
      }
    } catch (err) {
      setMessage('Error marking as paid: ' + err.message);
      setMessageType('error');
      // On error, re-fetch to restore the activity to the list
      fetchUnpaidActivities(selectedJunior);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-management-container">
      <h2>💳 Payment Management</h2>
      <p className="section-description">
        Manage payments differently for Assistant Trainers (fixed salary) and Juniors (per-activity)
      </p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="payment-tabs">
        <button
          className={`tab-btn ${activeTab === 'assistants' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistants')}
        >
          👔 Assistant Trainers
        </button>
        <button
          className={`tab-btn ${activeTab === 'juniors' ? 'active' : ''}`}
          onClick={() => setActiveTab('juniors')}
        >
          🎓 Junior Trainers (Per-Activity)
        </button>
      </div>

      {/* ASSISTANT TRAINERS TAB */}
      {activeTab === 'assistants' && (
        <div className="tab-content">
          <div className="add-freeze-section">
            <h3>📅 Freeze Period for Settlement</h3>
            <p className="tab-description">Lock date ranges after settlement approval</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Period Type:</label>
                <select
                  value={freezeType}
                  onChange={(e) => setFreezeType(e.target.value)}
                  disabled={loading}
                >
                  <option value="Date Range">📅 Date Range</option>
                  <option value="Month">📆 Entire Month</option>
                </select>
              </div>

              {freezeType === 'Date Range' ? (
                <>
                  <div className="form-group">
                    <label>Start Date:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Month:</label>
                  <input
                    type="month"
                    value={freezeMonth}
                    onChange={(e) => setFreezeMonth(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="e.g., Time report reviewed and approved"
                disabled={loading}
                rows="2"
              />
            </div>

            <button
              className="btn-add-freeze"
              onClick={handleAddFreeze}
              disabled={loading}
            >
              {loading ? 'Marking...' : '🔒 Lock Period'}
            </button>
          </div>

          <div className="frozen-entries-section">
            <h3>🔒 Locked Periods</h3>
            
            {frozenEntries.length === 0 ? (
              <div className="empty-state">
                <p>No locked periods yet</p>
              </div>
            ) : (
              <div className="frozen-table-container">
                <table className="frozen-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Locked On</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frozenEntries.map((entry, idx) => (
                      <tr key={idx}>
                        <td className="type-cell">
                          {entry['Freeze Type'] === 'Date Range' ? '📅 Range' : '📆 Month'}
                        </td>
                        <td className="date-cell">
                          <strong>{entry['Date/Month']}</strong>
                        </td>
                        <td className="timestamp-cell">
                          {entry['Freeze Date'] ? new Date(entry['Freeze Date']).toLocaleString() : '-'}
                        </td>
                        <td className="reason-cell">
                          {entry['Reason'] || '-'}
                        </td>
                        <td className="action-cell">
                          <button
                            className="btn-remove-freeze"
                            onClick={() => handleRemoveFreeze(entry['Freeze Type'], entry['Date/Month'])}
                            disabled={loading}
                          >
                            🔓
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JUNIOR TRAINERS TAB */}
      {activeTab === 'juniors' && (
        <div className="tab-content">
          <div className="junior-section">
            <div className="junior-selector-row">
              <div className="junior-selector">
                <label>Select Junior Trainer:</label>
                <select
                  value={selectedJunior}
                  onChange={handleJuniorChange}
                  disabled={loading || juniors.length === 0}
                >
                  <option value="">-- Select a junior trainer --</option>
                  {juniors.map((junior) => (
                    <option key={junior.name} value={junior.name}>
                      {junior.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="date-filter">
                <label>Filter by Date (optional):</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={loading || !selectedJunior}
                />
                {selectedDate && (
                  <button
                    className="btn-clear-date"
                    onClick={() => setSelectedDate('')}
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {juniors.length === 0 ? (
              <div className="empty-state">
                <p>No junior trainers found</p>
              </div>
            ) : unpaidActivities.length === 0 ? (
              <div className="empty-state">
                <p>✅ {selectedJunior ? `All activities for ${selectedJunior} have been paid!` : 'Select a junior trainer to view unpaid activities'}</p>
              </div>
            ) : (
              <div className="unpaid-activities">
                <h3>💰 Unpaid Activities {selectedDate && `on ${selectedDate}`}</h3>
                <p className="tab-description">{unpaidActivities.length} unpaid activities</p>
                
                <div className="activities-table-container">
                  <table className="activities-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Duration</th>
                        <th>Notes</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidActivities.map((activity, idx) => {
                        // Calculate duration
                        const startTime = activity['Start Time'];
                        const endTime = activity['End Time'];
                        let duration = '-';
                        if (startTime && endTime) {
                          try {
                            const start = new Date(`2000-01-01T${startTime}`);
                            const end = new Date(`2000-01-01T${endTime}`);
                            const diffMs = end - start;
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffMins = Math.floor((diffMs % 3600000) / 60000);
                            duration = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`;
                          } catch (e) {
                            // Fallback if time parsing fails
                          }
                        }
                        
                        return (
                          <tr key={idx}>
                            <td>{activity.Date}</td>
                            <td>{activity.Activity}</td>
                            <td>{startTime}</td>
                            <td>{endTime}</td>
                            <td className="duration-cell">{duration}</td>
                            <td>{activity.Note || '-'}</td>
                            <td className="action-cell">
                              <button
                                className="btn-mark-paid"
                                onClick={() => handleMarkAsPaid(activity)}
                                disabled={loading}
                                title="Mark as paid and freeze"
                              >
                                💳
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentManagement;
