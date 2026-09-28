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
  const [assistantTrainers, setAssistantTrainers] = useState([]);
  const [selectedAssistantTrainer, setSelectedAssistantTrainer] = useState('All');
  
  // Junior Trainer State
  const [juniorActivities, setJuniorActivities] = useState([]);
  const [selectedJunior, setSelectedJunior] = useState('');
  const [juniors, setJuniors] = useState([]);
  const [juniorMonth, setJuniorMonth] = useState(''); // Month filter (YYYY-MM)
  const [selectedEntries, setSelectedEntries] = useState({}); // key -> bool
  
  // General State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchFrozenDates();
    fetchJuniors();
    fetchAssistantTrainers();
  }, []);

  // Fetch activities when selected junior or month changes
  useEffect(() => {
    if (selectedJunior) {
      fetchJuniorActivities(selectedJunior);
    }
  }, [selectedJunior, juniorMonth]);

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

  const fetchAssistantTrainers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/trainers/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success && result.data) {
        // Filter only Assistant Trainers
        const assistants = result.data.filter(t => t.trainer_type === 'Assistant Trainer');
        setAssistantTrainers(assistants);
      }
    } catch (err) {
      console.error('Error fetching assistant trainers:', err);
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

    if (selectedAssistantTrainer === 'All') {
      setMessage('Please select a specific assistant trainer');
      setMessageType('error');
      return;
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
          reason: freezeReason || `Frozen for ${selectedAssistantTrainer}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Period locked for ${selectedAssistantTrainer}`);
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
          fetchJuniorActivities(juniorTrainers[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching juniors:', err);
    }
  };

  const fetchJuniorActivities = async (trainerName) => {
    try {
      setLoading(true);
      setSelectedEntries({}); // clear selection on reload
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`/api/activities?trainer=${encodeURIComponent(trainerName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success && result.data) {
        let activities = result.data;

        // Filter by month if selected (Date is YYYY-MM-DD)
        if (juniorMonth) {
          activities = activities.filter(a => (a.Date || '').startsWith(juniorMonth));
        }

        // Sort by date descending
        activities.sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));

        setJuniorActivities(activities);
      }
    } catch (err) {
      console.error('Error fetching junior activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJuniorChange = (e) => {
    const trainerName = e.target.value;
    setSelectedJunior(trainerName);
    fetchJuniorActivities(trainerName);
  };

  const isPaid = (activity) => {
    const p = activity.Paid;
    return p === true || p === 'Yes' || p === 'yes' || p === 'TRUE' || p === 'True' || p === '1' || p === 1;
  };

  const entryKey = (a) => `${a.Date}|${a.Activity}|${a['Start Time']}|${a['End Time']}`;

  const toggleEntry = (a) => {
    const key = entryKey(a);
    setSelectedEntries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectAll = (activities) => {
    // Select all unpaid entries; if all already selected, clear
    const unpaid = activities.filter(a => !isPaid(a));
    const allSelected = unpaid.length > 0 && unpaid.every(a => selectedEntries[entryKey(a)]);
    if (allSelected) {
      setSelectedEntries({});
    } else {
      const next = {};
      unpaid.forEach(a => { next[entryKey(a)] = true; });
      setSelectedEntries(next);
    }
  };

  const handleMarkSelectedPaid = async () => {
    const toPay = juniorActivities.filter(a => selectedEntries[entryKey(a)] && !isPaid(a));
    if (toPay.length === 0) {
      setMessage('Please select at least one unpaid entry');
      setMessageType('error');
      return;
    }
    if (!window.confirm(`Mark ${toPay.length} selected entr${toPay.length > 1 ? 'ies' : 'y'} as paid? This will freeze them.`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const token = localStorage.getItem('adminToken');
      let ok = 0;
      let failed = 0;

      for (const activity of toPay) {
        try {
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
          if (result.success) ok++; else failed++;
        } catch (e) {
          failed++;
        }
      }

      if (failed === 0) {
        setMessage(`✅ ${ok} entr${ok > 1 ? 'ies' : 'y'} marked as paid and frozen`);
        setMessageType('success');
      } else {
        setMessage(`⚠️ ${ok} paid, ${failed} failed`);
        setMessageType('error');
      }
      setSelectedEntries({});
      fetchJuniorActivities(selectedJunior);
      fetchFrozenDates();
    } catch (err) {
      setMessage('Error marking as paid: ' + err.message);
      setMessageType('error');
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
                <label>Assistant Trainer:</label>
                <select
                  value={selectedAssistantTrainer}
                  onChange={(e) => setSelectedAssistantTrainer(e.target.value)}
                  disabled={loading}
                >
                  <option value="All">-- Select a trainer --</option>
                  {assistantTrainers.map((trainer) => (
                    <option key={trainer.name} value={trainer.name}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </div>

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
                <label>Filter by Month (optional):</label>
                <input
                  type="month"
                  value={juniorMonth}
                  onChange={(e) => setJuniorMonth(e.target.value)}
                  disabled={loading || !selectedJunior}
                />
                {juniorMonth && (
                  <button
                    className="btn-clear-date"
                    onClick={() => setJuniorMonth('')}
                    title="Clear month filter (show all)"
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
            ) : !selectedJunior ? (
              <div className="empty-state">
                <p>Select a junior trainer to view activities</p>
              </div>
            ) : juniorActivities.length === 0 ? (
              <div className="empty-state">
                <p>No activities found for {selectedJunior}{juniorMonth ? ` in ${juniorMonth}` : ''}</p>
              </div>
            ) : (
              <div className="unpaid-activities">
                <h3>💰 Activities for {selectedJunior} {juniorMonth && `(${juniorMonth})`}</h3>
                <p className="tab-description">
                  {juniorActivities.length} total ·
                  {' '}{juniorActivities.filter(a => !isPaid(a)).length} unpaid ·
                  {' '}{juniorActivities.filter(a => isPaid(a)).length} paid
                </p>

                <div className="activities-table-container">
                  <table className="activities-table">
                    <thead>
                      <tr>
                        <th style={{width: '40px'}}>
                          <input
                            type="checkbox"
                            onChange={() => toggleSelectAll(juniorActivities)}
                            checked={
                              juniorActivities.filter(a => !isPaid(a)).length > 0 &&
                              juniorActivities.filter(a => !isPaid(a)).every(a => selectedEntries[entryKey(a)])
                            }
                            title="Select all unpaid"
                          />
                        </th>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Duration</th>
                        <th>Notes</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {juniorActivities.map((activity, idx) => {
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
                          } catch (e) { /* ignore */ }
                        }

                        const paid = isPaid(activity);
                        const key = entryKey(activity);

                        return (
                          <tr key={idx} className={paid ? 'paid-row' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!!selectedEntries[key]}
                                onChange={() => toggleEntry(activity)}
                                disabled={paid}
                                title={paid ? 'Already paid (frozen)' : 'Select to mark as paid'}
                              />
                            </td>
                            <td>{activity.Date}</td>
                            <td>{activity.Activity}</td>
                            <td>{startTime}</td>
                            <td>{endTime}</td>
                            <td className="duration-cell">{duration}</td>
                            <td>{activity.Note || '-'}</td>
                            <td>
                              {paid ? (
                                <span className="badge-paid">🔒 Paid</span>
                              ) : (
                                <span className="badge-unpaid">Unpaid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bulk-pay-bar">
                  <span className="bulk-pay-count">
                    {Object.values(selectedEntries).filter(Boolean).length} selected
                  </span>
                  <button
                    className="btn-mark-paid-bulk"
                    onClick={handleMarkSelectedPaid}
                    disabled={loading || Object.values(selectedEntries).filter(Boolean).length === 0}
                  >
                    💳 Mark Selected as Paid &amp; Freeze
                  </button>
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
