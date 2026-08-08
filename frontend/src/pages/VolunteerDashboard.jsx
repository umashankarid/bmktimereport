import React, { useState, useEffect } from 'react';
import '../styles/VolunteerDashboard.css';

function VolunteerDashboard({ volunteer, onLogout }) {
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    fetchTournaments();
    fetchRegistrations();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments');
      const result = await response.json();
      
      if (result.success) {
        // Filter to only upcoming/ongoing tournaments
        const now = new Date().toISOString().split('T')[0];
        const upcomingTournaments = result.data.filter(t => t.Date >= now);
        setTournaments(upcomingTournaments);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setMessage('Failed to load tournaments');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`/api/tournaments/registrations/${encodeURIComponent(volunteer.name)}`);
      const result = await response.json();
      
      if (result.success) {
        setRegistrations(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    }
  };

  const handleRegister = async (tournamentName) => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          volunteer_name: volunteer.name,
          tournament_name: tournamentName
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Successfully registered for ${tournamentName}`);
        setMessageType('success');
        fetchTournaments();
        fetchRegistrations();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Registration failed: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const isRegisteredFor = (tournamentName) => {
    return registrations.some(reg => reg['Tournament Name'] === tournamentName && reg.Status === 'Registered');
  };

  return (
    <div className="volunteer-dashboard">
      <header className="volunteer-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🤝 Volunteer Support Dashboard</h1>
            <p>Welcome, {volunteer.name}!</p>
          </div>
          <div className="header-right">
            <span className="volunteer-info">
              📧 {volunteer.email}
            </span>
            <button className="btn-logout" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <main className="volunteer-content">
        <section className="tournaments-section">
          <h2>🏸 Available Tournaments</h2>
          
          {loading && <div className="loading">Loading tournaments...</div>}
          
          {!loading && tournaments.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming tournaments available</p>
            </div>
          ) : (
            <div className="tournaments-grid">
              {tournaments.map((tournament, idx) => {
                const isRegistered = isRegisteredFor(tournament['Tournament Name']);
                
                return (
                  <div key={idx} className="tournament-card">
                    <div className="tournament-header">
                      <h3>{tournament['Tournament Name']}</h3>
                      <span className={`status-badge ${tournament.Status?.toLowerCase()}`}>
                        {tournament.Status || 'Upcoming'}
                      </span>
                    </div>

                    <div className="tournament-details">
                      <div className="detail-row">
                        <span className="label">📅 Date:</span>
                        <span className="value">{tournament.Date}</span>
                      </div>

                      <div className="detail-row">
                        <span className="label">📍 Venue:</span>
                        <span className="value">{tournament.Venue || 'TBA'}</span>
                      </div>

                      <div className="detail-row">
                        <span className="label">🕐 Time:</span>
                        <span className="value">
                          {tournament['Start Time']} - {tournament['End Time']}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="label">🙋 Slots Available:</span>
                        <span className="value">{tournament['Available Slots'] || 'N/A'}</span>
                      </div>
                    </div>

                    <button
                      className={`btn-register ${isRegistered ? 'registered' : ''}`}
                      onClick={() => handleRegister(tournament['Tournament Name'])}
                      disabled={isRegistered || loading}
                    >
                      {isRegistered ? '✓ Registered' : 'Register Support'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {registrations.length > 0 && (
          <section className="registrations-section">
            <h2>📋 My Tournament Registrations</h2>
            
            <div className="registrations-table-container">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Registered Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => (
                    <tr key={idx}>
                      <td>{reg['Tournament Name']}</td>
                      <td>{reg['Registration Date']}</td>
                      <td>
                        <span className={`status ${reg.Status?.toLowerCase()}`}>
                          {reg.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default VolunteerDashboard;
