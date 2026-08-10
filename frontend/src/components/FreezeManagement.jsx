import React, { useState, useEffect } from 'react';
import '../styles/FreezeManagement.css';

function FreezeManagement() {
  const [frozenEntries, setFrozenEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Add freeze form
  const [freezeType, setFreezeType] = useState('Date');
  const [freezeValue, setFreezeValue] = useState('');
  const [freezeReason, setFreezeReason] = useState('');

  useEffect(() => {
    fetchFrozenDates();
  }, []);

  const fetchFrozenDates = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('Authentication token not found. Please log in again.');
        setMessageType('error');
        return;
      }

      const response = await fetch('/api/freeze/dates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setFrozenEntries(result.data || []);
      } else {
        setMessage(result.message || 'Failed to load frozen dates');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error fetching frozen dates:', err);
      setMessage('Error loading frozen dates: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFreeze = async () => {
    if (!freezeValue) {
      setMessage('Please select a date or month');
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
          reason: freezeReason
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${freezeType} frozen successfully`);
        setMessageType('success');
        setFreezeValue('');
        setFreezeReason('');
        fetchFrozenDates();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error adding freeze: ' + err.message);
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

  return (
    <div className="freeze-management-container">
      <h2>🔒 Freeze Management</h2>
      <p className="section-description">
        Lock activity entries by date or month to prevent editing and deletion
      </p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {/* Add Freeze Section */}
      <div className="add-freeze-section">
        <h3>Add Freeze</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Freeze Type:</label>
            <select
              value={freezeType}
              onChange={(e) => setFreezeType(e.target.value)}
              disabled={loading}
            >
              <option value="Date">🗓️ Single Date</option>
              <option value="Month">📅 Entire Month</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {freezeType === 'Date' ? 'Date:' : 'Month:'}
            </label>
            <input
              type={freezeType === 'Date' ? 'date' : 'month'}
              value={freezeValue}
              onChange={(e) => setFreezeValue(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Reason (optional):</label>
          <textarea
            value={freezeReason}
            onChange={(e) => setFreezeReason(e.target.value)}
            placeholder="e.g., Month end review, Data locked"
            disabled={loading}
            rows="2"
          />
        </div>

        <button
          className="btn-add-freeze"
          onClick={handleAddFreeze}
          disabled={loading}
        >
          {loading ? 'Adding...' : '🔒 Add Freeze'}
        </button>
      </div>

      {/* Frozen Entries List */}
      <div className="frozen-entries-section">
        <h3>Frozen Entries</h3>
        
        {loading && frozenEntries.length === 0 ? (
          <div className="loading">Loading frozen dates...</div>
        ) : frozenEntries.length === 0 ? (
          <div className="empty-state">
            <p>No frozen dates or months yet</p>
          </div>
        ) : (
          <div className="frozen-table-container">
            <table className="frozen-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date/Month</th>
                  <th>Frozen On</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {frozenEntries.map((entry, idx) => (
                  <tr key={idx} className={`freeze-${entry['Freeze Type'].toLowerCase()}`}>
                    <td className="type-cell">
                      {entry['Freeze Type'] === 'Date' ? '🗓️ Date' : '📅 Month'}
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
                    <td className="creator-cell">
                      {entry['Created By'] || 'admin'}
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn-remove-freeze"
                        onClick={() => handleRemoveFreeze(entry['Freeze Type'], entry['Date/Month'])}
                        disabled={loading}
                        title="Remove freeze"
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

      <div className="freeze-info">
        <h3>ℹ️ What happens when dates are frozen?</h3>
        <ul>
          <li>✅ Trainers cannot edit or delete activities on frozen dates</li>
          <li>✅ Admin can still edit/delete, but with warnings</li>
          <li>✅ Frozen dates show as 🟡 yellow in trainer calendar</li>
          <li>✅ Activities are read-only for end-of-month review</li>
          <li>✅ Reports include frozen date indicators</li>
        </ul>
      </div>
    </div>
  );
}

export default FreezeManagement;
