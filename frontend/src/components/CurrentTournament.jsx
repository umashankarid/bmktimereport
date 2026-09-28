import React, { useState, useEffect } from 'react';
import '../styles/CurrentTournament.css';

function CurrentTournament() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live view state
  const [selected, setSelected] = useState(null); // {name, tournament_id, location}
  const [matches, setMatches] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, ongoing, done, upcoming

  useEffect(() => {
    fetchCurrentTournaments();
  }, []);

  const fetchCurrentTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/current-tournaments');
      const data = await res.json();
      if (data.success) {
        setTournaments(data.tournaments || []);
      } else {
        setError(data.error || 'Failed to load tournaments');
      }
    } catch (err) {
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const openLive = async (t, day = '') => {
    setSelected(t);
    setMatchError('');
    setLoadingMatches(true);
    setMatches([]);
    try {
      const params = new URLSearchParams({ id: t.tournament_id });
      if (day) params.append('date', day);
      const res = await fetch(`/api/live-matches?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
        setDays(data.days || []);
        setSelectedDay(data.selected_day || '');
      } else {
        setMatchError(data.error || 'Failed to load matches');
      }
    } catch (err) {
      setMatchError('Failed to load live matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  const backToList = () => {
    setSelected(null);
    setMatches([]);
    setDays([]);
    setSelectedDay('');
    setStatusFilter('all');
  };

  const formatDay = (d) => {
    // d is YYYYMMDD
    if (!d || d.length !== 8) return d;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  };

  const statusBadge = (status) => {
    const map = {
      ongoing: { label: '🔴 Live', cls: 'status-ongoing' },
      done: { label: '✅ Done', cls: 'status-done' },
      upcoming: { label: '⏳ Upcoming', cls: 'status-upcoming' }
    };
    const s = map[status] || map.upcoming;
    return <span className={`match-status ${s.cls}`}>{s.label}</span>;
  };

  const filteredMatches = statusFilter === 'all'
    ? matches
    : matches.filter(m => m.status === statusFilter);

  // Count by status for the filter chips
  const counts = {
    all: matches.length,
    ongoing: matches.filter(m => m.status === 'ongoing').length,
    done: matches.filter(m => m.status === 'done').length,
    upcoming: matches.filter(m => m.status === 'upcoming').length
  };

  // ---- Live match view ----
  if (selected) {
    return (
      <div className="current-tournament">
        <button className="ct-back" onClick={backToList}>← Back to tournaments</button>
        <h2>{selected.name}</h2>
        <p className="ct-sub">📍 {selected.location}</p>

        {days.length > 1 && (
          <div className="ct-days">
            {days.map((d) => (
              <button
                key={d}
                className={`ct-day-btn ${d === selectedDay ? 'active' : ''}`}
                onClick={() => openLive(selected, d)}
              >
                {formatDay(d)}
              </button>
            ))}
          </div>
        )}

        <div className="ct-filters">
          {['all', 'ongoing', 'done', 'upcoming'].map((f) => (
            <button
              key={f}
              className={`ct-filter-chip ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
          <button className="ct-refresh" onClick={() => openLive(selected, selectedDay)}>
            🔄 Refresh
          </button>
        </div>

        {loadingMatches ? (
          <p className="ct-loading">Loading matches...</p>
        ) : matchError ? (
          <p className="ct-error">{matchError}</p>
        ) : filteredMatches.length === 0 ? (
          <p className="ct-empty">No matches to show.</p>
        ) : (
          <div className="match-list">
            {filteredMatches.map((m, idx) => (
              <div key={idx} className={`match-card ${m.status}`}>
                <div className="match-card-header">
                  <span className="match-event">{m.event} {m.round && `· ${m.round}`}</span>
                  {statusBadge(m.status)}
                </div>
                <div className="match-teams">
                  <div className={`match-team ${m.team1_won ? 'won' : ''}`}>{m.team1}</div>
                  <div className="match-vs">vs</div>
                  <div className={`match-team ${(!m.team1_won && m.status === 'done') ? 'won' : ''}`}>{m.team2}</div>
                </div>
                <div className="match-meta">
                  {m.score && <span className="match-score">🏸 {m.score}</span>}
                  {m.court && <span className="match-court">📍 {m.court}</span>}
                  {m.duration && <span className="match-duration">⏱️ {m.duration}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Tournament list view ----
  return (
    <div className="current-tournament">
      <h2>🏸 Current Tournament</h2>
      <p className="ct-sub">Tournaments happening today. Click one to follow live matches.</p>

      {loading ? (
        <p className="ct-loading">Loading today's tournaments...</p>
      ) : error ? (
        <p className="ct-error">{error}</p>
      ) : tournaments.length === 0 ? (
        <p className="ct-empty">No tournaments happening today.</p>
      ) : (
        <div className="ct-tournament-list">
          {tournaments.map((t, idx) => (
            <div
              key={idx}
              className={`ct-card ${t.tournament_id ? '' : 'ct-card-disabled'}`}
              onClick={() => t.tournament_id && openLive(t)}
            >
              <h3>{t.name}</h3>
              {t.location && <p>📍 {t.location}</p>}
              <p>📅 {t.date_start}{t.date_end && t.date_end !== t.date_start ? ` → ${t.date_end}` : ''}</p>
              {t.tournament_id ? (
                <p className="ct-link">View players &amp; matches →</p>
              ) : (
                <p className="ct-nolink">No live data link available for this tournament.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurrentTournament;
