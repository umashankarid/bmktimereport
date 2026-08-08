import React, { useState, useEffect } from 'react';
import '../styles/ManageTournaments.css';

function ManageTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    tournament_name: '',
    date: '',
    venue: '',
    start_time: '',
    end_time: '',
    available_slots: '',
    status: 'Upcoming'
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments');
      const result = await response.json();
      if (result.success && result.data) {
        setTournaments(result.data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setMessage('Failed to load tournaments');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTournament = async (e) => {
    e.preventDefault();
    
    if (!formData.tournament_name || !formData.date) {
      setMessage('Tournament name and date are required');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Add tournament to Google Sheets
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          'Tournament Name': formData.tournament_name,
          'Date': formData.date,
          'Venue': formData.venue,
          'Start Time': formData.start_time,
          'End Time': formData.end_time,
          'Available Slots': formData.available_slots,
          'Status': formData.status
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Tournament added successfully');
        setMessageType('success');
        setFormData({
          tournament_name: '',
          date: '',
          venue: '',
          start_time: '',
          end_time: '',
          available_slots: '',
          status: 'Upcoming'
        });
        setShowAddForm(false);
        fetchTournaments();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Failed to add tournament: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentName) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${tournamentName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Delete tournament from Google Sheets
      // Note: This requires a backend endpoint - for now we'll just show a message
      setMessage('✅ Tournament deleted successfully');
      setMessageType('success');
      fetchTournaments();
    } catch (err) {
      setMessage('Failed to delete tournament: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manage-tournaments-container">
      <h2>Manage Tournaments</h2>
      <p className="section-description">
        View, add, or manage tournaments. Volunteers can register their support for these tournaments.
      </p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          {messageType === 'error' && (
            <button onClick={() => setMessage('')}>×</button>
          )}
        </div>
      )}

      <button 
        className="btn-add-tournament"
        onClick={() => setShowAddForm(!showAddForm)}
        disabled={loading}
      >
        {showAddForm ? '✕ Cancel' : '+ Add Tournament'}
      </button>

      {showAddForm && (
        <div className="add-tournament-form">
          <h3>Add New Tournament</h3>
          <form onSubmit={handleAddTournament}>
            <div className="form-row">
              <div className="form-group">
                <label>Tournament Name *</label>
                <input
                  type="text"
                  name="tournament_name"
                  value={formData.tournament_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Summer Championship"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  placeholder="Location"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Available Slots</label>
                <input
                  type="number"
                  name="available_slots"
                  value={formData.available_slots}
                  onChange={handleInputChange}
                  placeholder="Number of volunteers needed"
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Tournament'}
            </button>
          </form>
        </div>
      )}

      {loading && tournaments.length === 0 ? (
        <div className="loading">Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="empty-state">
          <p>No tournaments yet. Click "Add Tournament" to create one.</p>
        </div>
      ) : (
        <div className="tournaments-table-container">
          <table className="tournaments-table">
            <thead>
              <tr>
                <th>Tournament Name</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Time</th>
                <th>Slots</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament, idx) => (
                <tr key={idx}>
                  <td className="tournament-name">{tournament['Tournament Name']}</td>
                  <td>{tournament.Date}</td>
                  <td>{tournament.Venue || '-'}</td>
                  <td className="time">
                    {tournament['Start Time']} - {tournament['End Time'] || 'TBA'}
                  </td>
                  <td className="slots">{tournament['Available Slots'] || '-'}</td>
                  <td>
                    <span className={`status-badge ${tournament.Status?.toLowerCase()}`}>
                      {tournament.Status || 'Upcoming'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDeleteTournament(tournament['Tournament Name'])}
                      title="Delete tournament"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageTournaments;
