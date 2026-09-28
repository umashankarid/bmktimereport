import React, { useState, useEffect } from 'react';
import '../styles/TournamentLogbook.css';

function TournamentLogbook({ isAdmin = false }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('players'); // players, ongoing, upcoming, finished, notes, report

  // Matches
  const [matches, setMatches] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [kometOnly, setKometOnly] = useState(true);

  // Komet players (with categories)
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Match Notes
  const [notePlayer, setNotePlayer] = useState('');
  const [playerMatches, setPlayerMatches] = useState([]);
  const [loadingPlayerMatches, setLoadingPlayerMatches] = useState(false);
  const [myComments, setMyComments] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({}); // matchLabel -> text
  const [savingNote, setSavingNote] = useState('');
  const [noteMsg, setNoteMsg] = useState('');

  // Admin report + URL editing
  const [reportComments, setReportComments] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [editingUrl, setEditingUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');

  const token = localStorage.getItem('adminToken') || localStorage.getItem('trainerToken');
  const authHeader = { 'Authorization': `Bearer ${token}` };

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logbook/tournaments', { headers: authHeader });
      const data = await res.json();
      if (data.success) setTournaments(data.tournaments || []);
      else setError(data.error || 'Failed to load tournaments');
    } catch (err) {
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const openTournament = (t) => {
    setSelected(t);
    setActiveTab('players');
    setMatches([]); setPlayers([]); setMyComments([]);
    setNotePlayer(''); setPlayerMatches([]); setNoteDrafts({}); setNoteMsg('');
    setPlayerSearch('');
    if (t.tournament_id) {
      fetchPlayers(t);
      fetchComments(t);
    }
  };

  const backToList = () => setSelected(null);

  const fetchPlayers = async (t) => {
    if (!t.tournament_id) return;
    try {
      setLoadingPlayers(true);
      setPlayersError('');
      const res = await fetch(`/api/logbook/players-with-categories?id=${encodeURIComponent(t.tournament_id)}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setPlayers(data.players || []);
      else setPlayersError(data.error || 'Failed to load players');
    } catch (err) {
      setPlayersError('Failed to load players');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchMatches = async (t, day = '') => {
    if (!t.tournament_id) return;
    try {
      setLoadingMatches(true);
      setMatchError('');
      const params = new URLSearchParams({ id: t.tournament_id });
      if (day) params.append('date', day);
      if (kometOnly) params.append('komet_only', '1');
      const res = await fetch(`/api/live-matches?${params.toString()}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
        setDays(data.days || []);
        setSelectedDay(data.selected_day || '');
      } else {
        setMatchError(data.error || 'Failed to load matches');
      }
    } catch (err) {
      setMatchError('Failed to load matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchComments = async (t) => {
    try {
      const res = await fetch(`/api/logbook/comments?tournament=${encodeURIComponent(t.name)}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setMyComments(data.data || []);
    } catch (err) { /* ignore */ }
  };

  const fetchReport = async (t) => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/logbook/comments/report?tournament=${encodeURIComponent(t.name)}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setReportComments(data.data || []);
    } catch (err) { /* ignore */ } finally {
      setLoadingReport(false);
    }
  };

  const fetchPlayerMatches = async (playerName) => {
    if (!selected?.tournament_id || !playerName) { setPlayerMatches([]); return; }
    try {
      setLoadingPlayerMatches(true);
      const res = await fetch(`/api/logbook/player-matches?id=${encodeURIComponent(selected.tournament_id)}&player=${encodeURIComponent(playerName)}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setPlayerMatches(data.matches || []);
      else setPlayerMatches([]);
    } catch (err) {
      setPlayerMatches([]);
    } finally {
      setLoadingPlayerMatches(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if ((tab === 'ongoing' || tab === 'upcoming' || tab === 'finished') && matches.length === 0 && selected?.tournament_id) {
      fetchMatches(selected);
    }
    if (tab === 'report' && selected) fetchReport(selected);
  };

  const saveTournamentUrl = async () => {
    if (!editingUrl.trim()) { setUrlMsg('Please paste a tournament URL'); return; }
    try {
      setSavingUrl(true); setUrlMsg('');
      const res = await fetch('/api/tournaments/set-url', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_name: selected.name, tournament_url: editingUrl.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setUrlMsg('✅ Link saved');
        await fetchTournaments();
        const guidMatch = editingUrl.match(/\/tournament\/([0-9A-Fa-f-]{36})/) || editingUrl.match(/id=([A-Fa-f0-9-]+)/);
        const guid = guidMatch ? guidMatch[1] : '';
        const updated = { ...selected, url: editingUrl.trim(), tournament_id: guid };
        setSelected(updated);
        setEditingUrl('');
        if (guid) { fetchPlayers(updated); fetchComments(updated); }
      } else {
        setUrlMsg(`❌ ${data.message}`);
      }
    } catch (err) {
      setUrlMsg('Error saving link');
    } finally {
      setSavingUrl(false);
    }
  };

  // ---- Match Notes helpers ----
  const selectNotePlayer = (name) => {
    setNotePlayer(name);
    setNoteMsg('');
    setNoteDrafts({});
    fetchPlayerMatches(name);
  };

  const matchLabelFor = (m) => {
    // A readable, stable identifier for the match
    const opp = `${m.team1} vs ${m.team2}`;
    return [m.event, m.round, opp].filter(Boolean).join(' · ');
  };

  const commentsForMatch = (label) =>
    myComments.filter(c => c.player_name === notePlayer && (c.match_label || '') === label);

  const saveNote = async (label) => {
    const text = (noteDrafts[label] || '').trim();
    if (!text) { setNoteMsg('Write a note first'); return; }
    try {
      setSavingNote(label);
      setNoteMsg('');
      const res = await fetch('/api/logbook/comments', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament: selected.name, player: notePlayer, comment: text, match_label: label })
      });
      const data = await res.json();
      if (data.success) {
        setNoteMsg('✅ Note saved');
        setNoteDrafts(prev => ({ ...prev, [label]: '' }));
        fetchComments(selected);
      } else {
        setNoteMsg(`❌ ${data.message}`);
      }
    } catch (err) {
      setNoteMsg('Error saving note');
    } finally {
      setSavingNote('');
    }
  };

  const deleteNote = async (c) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/logbook/comments/${c.id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (data.success) fetchComments(selected);
    } catch (err) { /* ignore */ }
  };

  const matchesByStatus = (status) => matches.filter(m => m.status === status);

  const renderTeam = (teamStr, kometNames, won) => {
    const kometSet = new Set((kometNames || []).map(n => n.toLowerCase()));
    const parts = (teamStr || '').split(' / ');
    return (
      <span className={won ? 'won' : ''}>
        {parts.map((name, i) => {
          const isKomet = kometSet.has(name.trim().toLowerCase());
          return (
            <React.Fragment key={i}>
              {i > 0 && ' / '}
              <span className={isKomet ? 'tlb-komet-player' : ''}>{name}</span>
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  const renderMatchCard = (m, idx) => (
    <div key={idx} className={`tlb-match-card ${m.status} ${m.has_komet ? 'komet' : ''}`}>
      <div className="tlb-match-header">
        <span className="tlb-match-event">{m.event}{m.round ? ` · ${m.round}` : ''}</span>
        {m.has_komet && <span className="tlb-komet-badge">KOMET</span>}
      </div>
      <div className="tlb-match-teams">
        {renderTeam(m.team1, m.komet_names, m.team1_won)}
        <span className="tlb-vs">vs</span>
        {renderTeam(m.team2, m.komet_names, (!m.team1_won && m.status === 'done'))}
      </div>
      <div className="tlb-match-meta">
        {m.time && <span>🕐 {m.time}</span>}
        {m.score && <span>🏸 {m.score}</span>}
        {m.court && <span>📍 {m.court}</span>}
        {m.duration && <span>⏱️ {m.duration}</span>}
      </div>
    </div>
  );

  // ================= Detail view =================
  if (selected) {
    return (
      <div className="tournament-logbook">
        <button className="tlb-back" onClick={backToList}>← Back to tournaments</button>
        <h2>{selected.name}</h2>
        <p className="tlb-sub">
          📍 {selected.location || '—'} · 📅 {selected.date_start}
          {selected.date_end && selected.date_end !== selected.date_start ? ` → ${selected.date_end}` : ''}
        </p>

        {!selected.tournament_id ? (
          <div className="tlb-warning">
            <p>This tournament has no badmintonsweden link yet.</p>
            {isAdmin ? (
              <div className="tlb-url-editor">
                <input type="text" value={editingUrl} onChange={(e) => setEditingUrl(e.target.value)}
                  placeholder="Paste badmintonsweden tournament URL here" />
                <button onClick={saveTournamentUrl} disabled={savingUrl}>
                  {savingUrl ? 'Saving...' : '💾 Save Link'}
                </button>
                {urlMsg && <span className="tlb-url-msg">{urlMsg}</span>}
              </div>
            ) : (
              <p style={{ fontSize: '13px' }}>An admin can add one in Manage Tournaments.</p>
            )}
          </div>
        ) : (
          <>
            <div className="tlb-tabs">
              <button className={activeTab === 'players' ? 'active' : ''} onClick={() => switchTab('players')}>👥 Komet Players</button>
              <button className={activeTab === 'ongoing' ? 'active' : ''} onClick={() => switchTab('ongoing')}>🔴 Ongoing</button>
              <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => switchTab('upcoming')}>⏳ Upcoming</button>
              <button className={activeTab === 'finished' ? 'active' : ''} onClick={() => switchTab('finished')}>✅ Finished</button>
              <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => switchTab('notes')}>📝 Match Notes</button>
              {isAdmin && (
                <button className={activeTab === 'report' ? 'active' : ''} onClick={() => switchTab('report')}>📊 All Coach Notes</button>
              )}
            </div>

            {(activeTab === 'ongoing' || activeTab === 'upcoming' || activeTab === 'finished') && days.length > 1 && (
              <div className="tlb-days">
                {days.map(d => (
                  <button key={d} className={d === selectedDay ? 'active' : ''} onClick={() => fetchMatches(selected, d)}>
                    {d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d}
                  </button>
                ))}
              </div>
            )}

            {(activeTab === 'ongoing' || activeTab === 'upcoming' || activeTab === 'finished') && (
              <label className="tlb-komet-toggle">
                <input type="checkbox" checked={kometOnly}
                  onChange={(e) => { setKometOnly(e.target.checked); setTimeout(() => fetchMatches(selected, selectedDay), 0); }} />
                Show only Komet players' matches
              </label>
            )}

            <div className="tlb-content">
              {/* Komet Players + categories (no comment button) */}
              {activeTab === 'players' && (
                loadingPlayers ? <p className="tlb-loading">Loading players...</p> :
                playersError ? <p className="tlb-error">{playersError}</p> :
                players.length === 0 ? <p className="tlb-empty">No Komet players found in this tournament.</p> :
                <>
                  <input type="text" className="tlb-player-search" placeholder="🔍 Search player by name..."
                    value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} />
                  <div className="tlb-players-list">
                    {players
                      .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                      .map((p, i) => (
                        <div key={i} className="tlb-player-card">
                          <span className="tlb-player-name">{p.name}</span>
                          <span className="tlb-player-cats">
                            {(p.categories && p.categories.length) ? p.categories.map((c, j) => (
                              <span key={j} className="tlb-cat-badge">{c}</span>
                            )) : <span className="tlb-no-cat">No category yet</span>}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Match tabs */}
              {(activeTab === 'ongoing' || activeTab === 'upcoming' || activeTab === 'finished') && (
                loadingMatches ? <p className="tlb-loading">Loading matches...</p> :
                matchError ? <p className="tlb-error">{matchError}</p> :
                (() => {
                  const statusMap = { ongoing: 'ongoing', upcoming: 'upcoming', finished: 'done' };
                  const list = matchesByStatus(statusMap[activeTab]);
                  return list.length === 0
                    ? <p className="tlb-empty">No {activeTab} matches.</p>
                    : <div className="tlb-match-list">{list.map(renderMatchCard)}</div>;
                })()
              )}

              {/* Match Notes: pick player -> their matches -> note per match */}
              {activeTab === 'notes' && (
                <div className="tlb-notes">
                  <div className="tlb-notes-playerpick">
                    <label>Select player:</label>
                    <select value={notePlayer} onChange={(e) => selectNotePlayer(e.target.value)}>
                      <option value="">-- Select a Komet player --</option>
                      {players.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
                    </select>
                    {noteMsg && <span className="tlb-note-msg">{noteMsg}</span>}
                  </div>

                  {!notePlayer ? (
                    <p className="tlb-empty">Select a player to view their matches and add notes.</p>
                  ) : loadingPlayerMatches ? (
                    <p className="tlb-loading">Loading {notePlayer}'s matches...</p>
                  ) : playerMatches.length === 0 ? (
                    <p className="tlb-empty">No matches found for {notePlayer}.</p>
                  ) : (
                    <div className="tlb-note-matches">
                      {playerMatches.map((m, idx) => {
                        const label = matchLabelFor(m);
                        const existing = commentsForMatch(label);
                        return (
                          <div key={idx} className="tlb-note-match-card">
                            <div className="tlb-note-match-header">
                              <span className="tlb-match-event">{m.event}{m.round ? ` · ${m.round}` : ''}</span>
                              <span className={`tlb-note-status status-${m.status}`}>
                                {m.status === 'done' ? '✅ Finished' : m.status === 'ongoing' ? '🔴 Live' : '⏳ Upcoming'}
                              </span>
                            </div>
                            <div className="tlb-note-match-teams">
                              {m.team1} <span className="tlb-vs">vs</span> {m.team2}
                              {m.score && <span className="tlb-note-score"> · {m.score}</span>}
                            </div>

                            {existing.length > 0 && (
                              <div className="tlb-note-existing">
                                {existing.map((c, ci) => (
                                  <div key={ci} className="tlb-note-item">
                                    <span className="tlb-note-text">{c.comment}</span>
                                    <span className="tlb-note-item-actions">
                                      <span className="tlb-note-date">{c.updated_date}</span>
                                      <button onClick={() => deleteNote(c)} title="Delete">🗑️</button>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="tlb-note-editor">
                              <textarea
                                rows={2}
                                placeholder="Add a note for this match..."
                                value={noteDrafts[label] || ''}
                                onChange={(e) => setNoteDrafts(prev => ({ ...prev, [label]: e.target.value }))}
                              />
                              <button onClick={() => saveNote(label)} disabled={savingNote === label}>
                                {savingNote === label ? 'Saving...' : '➕ Add Note'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Admin: all coach notes */}
              {activeTab === 'report' && isAdmin && (
                <div className="tlb-report">
                  {loadingReport ? <p className="tlb-loading">Loading report...</p> :
                  reportComments.length === 0 ? <p className="tlb-empty">No notes recorded for this tournament yet.</p> :
                  <table className="tlb-report-table">
                    <thead>
                      <tr><th>Player</th><th>Match</th><th>Coach</th><th>Note</th><th>Updated</th></tr>
                    </thead>
                    <tbody>
                      {reportComments.map((c, i) => (
                        <tr key={i}>
                          <td>{c.player_name}</td>
                          <td>{c.match_label || '—'}</td>
                          <td>{c.coach_name}</td>
                          <td>{c.comment}</td>
                          <td className="tlb-report-date">{c.updated_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ================= Tournament list =================
  return (
    <div className="tournament-logbook">
      <h2>📖 Tournament Logbook</h2>
      <p className="tlb-sub">Select a tournament to view Komet players, matches, and record match notes.</p>

      {loading ? (
        <p className="tlb-loading">Loading tournaments...</p>
      ) : error ? (
        <p className="tlb-error">{error}</p>
      ) : tournaments.length === 0 ? (
        <p className="tlb-empty">No tournaments yet. An admin can add them in Manage Tournaments.</p>
      ) : (
        <div className="tlb-tournament-list">
          {tournaments.map((t, idx) => (
            <div key={idx} className="tlb-card" onClick={() => openTournament(t)}>
              <h3>{t.name}</h3>
              {t.location && <p>📍 {t.location}</p>}
              <p>📅 {t.date_start}{t.date_end && t.date_end !== t.date_start ? ` → ${t.date_end}` : ''}</p>
              {t.status && <span className={`tlb-status tlb-status-${(t.status || '').toLowerCase()}`}>{t.status}</span>}
              {!t.tournament_id && <p className="tlb-nolink">⚠️ No tournament link</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TournamentLogbook;
