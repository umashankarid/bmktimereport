import React, { useState, useEffect } from 'react';
import '../styles/TournamentLogbook.css';

function TournamentLogbook({ isAdmin = false }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Detail view
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('players'); // players, ongoing, upcoming, finished, comments, report

  // Admin report
  const [reportComments, setReportComments] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Admin URL editing
  const [editingUrl, setEditingUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');

  // Matches
  const [matches, setMatches] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [kometOnly, setKometOnly] = useState(true);

  // Komet players
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Comments
  const [commentPlayer, setCommentPlayer] = useState('');
  const [commentText, setCommentText] = useState('');
  const [myComments, setMyComments] = useState([]);
  const [savingComment, setSavingComment] = useState(false);
  const [commentMsg, setCommentMsg] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);

  const token = localStorage.getItem('adminToken') || localStorage.getItem('trainerToken');
  const authHeader = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetchTournaments();
  }, []);

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
    setMatches([]);
    setPlayers([]);
    setMyComments([]);
    setCommentPlayer('');
    setCommentText('');
    setCommentMsg('');
    if (t.tournament_id) {
      fetchPlayers(t);
      fetchComments(t);
    }
  };

  const backToList = () => {
    setSelected(null);
  };

  const fetchPlayers = async (t) => {
    if (!t.tournament_id) return;
    try {
      setLoadingPlayers(true);
      setPlayersError('');
      const res = await fetch(`/api/logbook/komet-players?id=${encodeURIComponent(t.tournament_id)}`, { headers: authHeader });
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
    } catch (err) {
      // ignore
    }
  };

  const fetchReport = async (t) => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/logbook/comments/report?tournament=${encodeURIComponent(t.name)}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) setReportComments(data.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoadingReport(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if ((tab === 'ongoing' || tab === 'upcoming' || tab === 'finished') && matches.length === 0 && selected?.tournament_id) {
      fetchMatches(selected);
    }
    if (tab === 'report' && selected) {
      fetchReport(selected);
    }
  };

  const saveTournamentUrl = async () => {
    if (!editingUrl.trim()) {
      setUrlMsg('Please paste a tournament URL');
      return;
    }
    try {
      setSavingUrl(true);
      setUrlMsg('');
      const res = await fetch('/api/tournaments/set-url', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_name: selected.name, tournament_url: editingUrl.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setUrlMsg('✅ Link saved');
        // Refresh tournaments and re-open this one with the new URL
        await fetchTournaments();
        const guidMatch = editingUrl.match(/\/tournament\/([0-9A-Fa-f-]{36})/) || editingUrl.match(/id=([A-Fa-f0-9-]+)/);
        const guid = guidMatch ? guidMatch[1] : '';
        const updated = { ...selected, url: editingUrl.trim(), tournament_id: guid };
        setSelected(updated);
        setEditingUrl('');
        if (guid) {
          fetchPlayers(updated);
          fetchComments(updated);
        }
      } else {
        setUrlMsg(`❌ ${data.message}`);
      }
    } catch (err) {
      setUrlMsg('Error saving link');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveComment = async () => {
    if (!commentPlayer || !commentText.trim()) {
      setCommentMsg('Select a player and write a comment');
      return;
    }
    try {
      setSavingComment(true);
      setCommentMsg('');
      let res;
      if (editingCommentId) {
        // Edit existing comment
        res = await fetch(`/api/logbook/comments/${editingCommentId}`, {
          method: 'PUT',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: commentText.trim() })
        });
      } else {
        // Append a new comment
        res = await fetch('/api/logbook/comments', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournament: selected.name, player: commentPlayer, comment: commentText.trim() })
        });
      }
      const data = await res.json();
      if (data.success) {
        setCommentMsg(editingCommentId ? '✅ Comment updated' : '✅ Comment added');
        setCommentText('');
        setCommentPlayer('');
        setEditingCommentId(null);
        fetchComments(selected);
      } else {
        setCommentMsg(`❌ ${data.message}`);
      }
    } catch (err) {
      setCommentMsg('Error saving comment');
    } finally {
      setSavingComment(false);
    }
  };

  const editComment = (c) => {
    setCommentPlayer(c.player_name);
    setCommentText(c.comment);
    setEditingCommentId(c.id);
    setActiveTab('comments');
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setCommentText('');
    setCommentPlayer('');
    setCommentMsg('');
  };

  const deleteComment = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/logbook/comments/${c.id}`, {
        method: 'DELETE',
        headers: authHeader
      });
      const data = await res.json();
      if (data.success) {
        if (editingCommentId === c.id) cancelEdit();
        fetchComments(selected);
      }
    } catch (err) {
      // ignore
    }
  };

  const matchesByStatus = (status) => matches.filter(m => m.status === status);

  // Highlight Komet player names within a team string
  const renderTeam = (teamStr, kometNames, won) => {
    const kometSet = new Set((kometNames || []).map(n => n.toLowerCase()));
    // Team is "Player A / Player B"; check each name
    const parts = teamStr.split(' / ');
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

  // ---- Detail view ----
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
                <input
                  type="text"
                  value={editingUrl}
                  onChange={(e) => setEditingUrl(e.target.value)}
                  placeholder="Paste badmintonsweden tournament URL here"
                />
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
              <button className={activeTab === 'comments' ? 'active' : ''} onClick={() => switchTab('comments')}>📝 Player Comments</button>
              {isAdmin && (
                <button className={activeTab === 'report' ? 'active' : ''} onClick={() => switchTab('report')}>📊 All Coach Comments</button>
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
                <input
                  type="checkbox"
                  checked={kometOnly}
                  onChange={(e) => {
                    setKometOnly(e.target.checked);
                    // Re-fetch with the new filter
                    setTimeout(() => fetchMatches(selected, selectedDay), 0);
                  }}
                />
                Show only Komet players' matches
              </label>
            )}

            <div className="tlb-content">
              {/* Komet Players */}
              {activeTab === 'players' && (
                loadingPlayers ? <p className="tlb-loading">Loading players...</p> :
                playersError ? <p className="tlb-error">{playersError}</p> :
                players.length === 0 ? <p className="tlb-empty">No Komet players found in this tournament.</p> :
                <>
                  <input
                    type="text"
                    className="tlb-player-search"
                    placeholder="🔍 Search player by name..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                  />
                  <div className="tlb-players-list">
                    {players
                      .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                      .map((p, i) => (
                        <div key={i} className="tlb-player-card">
                          <span className="tlb-player-name">{p.name}</span>
                          <span className="tlb-player-club">{p.club}</span>
                          <button className="tlb-comment-btn" onClick={() => { setCommentPlayer(p.name); setEditingCommentId(null); setCommentText(''); setActiveTab('comments'); }}>
                            📝 Comment
                          </button>
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

              {/* Player Comments */}
              {activeTab === 'comments' && (
                <div className="tlb-comments">
                  <div className="tlb-comment-editor">
                    <h4>{editingCommentId ? 'Edit Comment' : 'Add Comment'}</h4>
                    <div className="tlb-comment-row">
                      <select
                        value={commentPlayer}
                        onChange={(e) => setCommentPlayer(e.target.value)}
                        disabled={!!editingCommentId}
                      >
                        <option value="">-- Select player --</option>
                        {players.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write your observations about this player for training..."
                      rows={4}
                    />
                    <div className="tlb-comment-actions">
                      <button onClick={handleSaveComment} disabled={savingComment}>
                        {savingComment ? 'Saving...' : (editingCommentId ? '💾 Update' : '➕ Add Comment')}
                      </button>
                      {editingCommentId && (
                        <button className="tlb-cancel-btn" onClick={cancelEdit}>Cancel</button>
                      )}
                      {commentMsg && <span className="tlb-comment-msg">{commentMsg}</span>}
                    </div>
                  </div>

                  <div className="tlb-my-comments">
                    <h4>My Comments ({myComments.length})</h4>
                    {myComments.length === 0 ? (
                      <p className="tlb-empty">No comments yet.</p>
                    ) : (
                      myComments.map((c, i) => (
                        <div key={i} className="tlb-comment-item">
                          <div className="tlb-comment-player">{c.player_name}</div>
                          <div className="tlb-comment-text">{c.comment}</div>
                          <div className="tlb-comment-footer">
                            <span className="tlb-comment-date">{c.updated_date}</span>
                            <span className="tlb-comment-item-actions">
                              <button onClick={() => editComment(c)} title="Edit">✏️</button>
                              <button onClick={() => deleteComment(c)} title="Delete">🗑️</button>
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Admin: All coach comments report */}
              {activeTab === 'report' && isAdmin && (
                <div className="tlb-report">
                  {loadingReport ? (
                    <p className="tlb-loading">Loading report...</p>
                  ) : reportComments.length === 0 ? (
                    <p className="tlb-empty">No comments recorded for this tournament yet.</p>
                  ) : (
                    <table className="tlb-report-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Coach</th>
                          <th>Comment</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportComments.map((c, i) => (
                          <tr key={i}>
                            <td>{c.player_name}</td>
                            <td>{c.coach_name}</td>
                            <td>{c.comment}</td>
                            <td className="tlb-report-date">{c.updated_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Tournament list ----
  return (
    <div className="tournament-logbook">
      <h2>📖 Tournament Logbook</h2>
      <p className="tlb-sub">Select a tournament to view Komet players, live matches, and record player comments.</p>

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
