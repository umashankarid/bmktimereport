import React, { useState, useEffect } from 'react';
import '../styles/ReportsPage.css';

function ReportsPage({ currentTrainer = null }) {
  const [activeReport, setActiveReport] = useState('activity-summary');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTrainerView, setIsTrainerView] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  useEffect(() => {
    // Check if this is a trainer view (not admin)
    if (currentTrainer && currentTrainer.name) {
      setIsTrainerView(true);
    } else {
      // Admin view - fetch all trainers
      fetchTrainers();
    }
  }, [currentTrainer]);

  const fetchTrainers = async () => {
    try {
      console.log('📋 Fetching trainers list...');
      const response = await fetch('/api/trainers');
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Trainers loaded:', result.data);
        setTrainers(result.data);
        // Set first trainer as default
        if (result.data.length > 0) {
          setSelectedTrainer(result.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeReport, selectedTrainer]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    
    try {
      const reportEndpoints = {
        'activity-summary': '/api/reports/activity-summary',
        'activity-distribution': '/api/reports/activity-distribution',
        'training-hours': '/api/reports/training-hours',
        'monthly-trends': '/api/reports/monthly-trends'
      };

      const endpoint = reportEndpoints[activeReport];
      if (!endpoint) return;

      console.log(`📊 Fetching ${activeReport}...`);
      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        setReports(prev => ({
          ...prev,
          [activeReport]: result.data
        }));
      } else {
        setError(result.error || 'Failed to load report');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/export-csv');
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activities_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ CSV exported successfully');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-container">
        <header className="reports-header">
          <h1>📊 Reports</h1>
          <p>
            {isTrainerView 
              ? `View your activity analytics and trends`
              : `View activity analytics and trends`
            }
          </p>
          
          {/* Trainer Selector for Admin */}
          {!isTrainerView && trainers.length > 0 && (
            <div className="trainer-selector">
              <label htmlFor="trainer-filter">Select Trainer:</label>
              <select
                id="trainer-filter"
                value={selectedTrainer || ''}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="trainer-select"
              >
                {trainers.map(trainer => (
                  <option key={trainer} value={trainer}>
                    {trainer}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="reports-layout">
          {/* Report Navigation */}
          <nav className="reports-nav">
            <button
              className={`nav-item ${activeReport === 'activity-summary' ? 'active' : ''}`}
              onClick={() => setActiveReport('activity-summary')}
            >
              📋 Activity Summary
            </button>
            <button
              className={`nav-item ${activeReport === 'activity-distribution' ? 'active' : ''}`}
              onClick={() => setActiveReport('activity-distribution')}
            >
              📈 Activity Types
            </button>
            <button
              className={`nav-item ${activeReport === 'training-hours' ? 'active' : ''}`}
              onClick={() => setActiveReport('training-hours')}
            >
              ⏱️ Training Hours
            </button>
            <button
              className={`nav-item ${activeReport === 'monthly-trends' ? 'active' : ''}`}
              onClick={() => setActiveReport('monthly-trends')}
            >
              📅 Monthly Trends
            </button>
          </nav>

          {/* Report Content */}
          <div className="reports-content">
            {loading ? (
              <div className="loading-state">
                <p>Loading report...</p>
              </div>
            ) : (
              <>
                {activeReport === 'activity-summary' && (
                  <ActivitySummaryReport data={reports['activity-summary']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} />
                )}
                {activeReport === 'activity-distribution' && (
                  <ActivityDistributionReport data={reports['activity-distribution']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} />
                )}
                {activeReport === 'training-hours' && (
                  <TrainingHoursReport data={reports['training-hours']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} />
                )}
                {activeReport === 'monthly-trends' && (
                  <MonthlyTrendsReport data={reports['monthly-trends']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} />
                )}
              </>
            )}

            {/* Export Button */}
            <div className="export-section">
              <button 
                className="btn btn-export"
                onClick={handleExportCSV}
                disabled={loading}
              >
                📥 Export to CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Summary Report Component
function ActivitySummaryReport({ data, trainerFilter }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (typeof data !== 'object' || Object.keys(data).length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  // Filter data if this is a trainer view
  let filteredData = data;
  if (trainerFilter) {
    filteredData = {};
    if (data[trainerFilter]) {
      filteredData[trainerFilter] = data[trainerFilter];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    return <div className="empty-report">No data available for {trainerFilter}</div>;
  }

  return (
    <div className="report-section">
      <h2>Activity Summary {trainerFilter ? `for ${trainerFilter}` : 'by Trainer'}</h2>
      <div className="summary-grid">
        {Object.entries(filteredData).map(([trainer, summary]) => (
          <div key={trainer} className="summary-card">
            <h3>{trainer}</h3>
            
            <div className="stat-row">
              <span className="stat-label">Total Activities:</span>
              <span className="stat-value">{summary.total_activities || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Hours:</span>
              <span className="stat-value">{typeof summary.total_hours === 'number' ? summary.total_hours.toFixed(2) : 0}h</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Days:</span>
              <span className="stat-value">{summary.active_days || 0}</span>
            </div>
            
            {/* Current Month Quota Section */}
            <div className="monthly-quota-section">
              <h4>📅 Current Month Quota</h4>
              
              <div className="quota-bar-container">
                <div className="quota-bar">
                  <div 
                    className="quota-bar-fill"
                    style={{ width: `${Math.min(summary.current_month_percentage || 0, 100)}%` }}
                  >
                    {(summary.current_month_percentage || 0) > 10 && <span>{summary.current_month_percentage}%</span>}
                  </div>
                  {(summary.current_month_percentage || 0) > 100 && (
                    <div 
                      className="quota-bar-overtime"
                      style={{ width: `${Math.min((summary.current_month_percentage || 0) - 100, 100)}%` }}
                    >
                      {((summary.current_month_percentage || 0) - 100) > 10 && <span>+{((summary.current_month_percentage || 0) - 100).toFixed(0)}%</span>}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="quota-stats">
                <div className="quota-stat-row">
                  <span className="quota-label">Hours Worked:</span>
                  <span className="quota-value">{typeof summary.current_month_hours === 'number' ? summary.current_month_hours.toFixed(1) : 0}h / {summary.current_month_quota}h</span>
                </div>
                
                {summary.current_month_hours_left > 0 && (
                  <div className="quota-stat-row hours-left">
                    <span className="quota-label">⏳ Hours Left:</span>
                    <span className="quota-value-green">{typeof summary.current_month_hours_left === 'number' ? summary.current_month_hours_left.toFixed(1) : 0}h</span>
                  </div>
                )}
                
                {summary.current_month_overtime > 0 && (
                  <div className="quota-stat-row overtime">
                    <span className="quota-label">⚠️ Overtime:</span>
                    <span className="quota-value-red">{typeof summary.current_month_overtime === 'number' ? summary.current_month_overtime.toFixed(1) : 0}h</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="activity-types">
              <h4>Activity Types:</h4>
              <ul>
                {summary.activity_types && Object.entries(summary.activity_types).map(([type, count]) => (
                  <li key={type}>
                    <span className="type-name">{type}</span>
                    <span className="type-count">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Activity Distribution Report Component
function ActivityDistributionReport({ data, trainerFilter }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  return (
    <div className="report-section">
      <h2>Activity Types Distribution {trainerFilter && `(${trainerFilter})`}</h2>
      <p className="report-subtitle">
        Total Activities: <strong>{data.total_activities || 0}</strong>
      </p>
      
      <div className="distribution-list">
        {data.map((item, idx) => (
          <div key={idx} className="distribution-item">
            <div className="distribution-header">
              <h4>{item.activity_type}</h4>
              <span className={`badge badge-${item.activity_type.toLowerCase()}`}>
                {item.percentage}%
              </span>
            </div>
            
            <div className="distribution-bar">
              <div 
                className="distribution-bar-fill"
                style={{ width: `${item.percentage}%` }}
              >
                {item.percentage > 5 && <span>{item.percentage}%</span>}
              </div>
            </div>
            
            <div className="distribution-stats">
              <span>📊 Count: {item.count}</span>
              <span>⏱️ Hours: {item.hours}</span>
              <span>👥 Trainers: {item.unique_trainers}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Training Hours Report Component
function TrainingHoursReport({ data, trainerFilter }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (!data.data || data.data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  // Filter data if this is a trainer view
  let filteredData = data.data;
  if (trainerFilter) {
    filteredData = data.data.filter(item => 
      item.trainer.toLowerCase() === trainerFilter.toLowerCase()
    );
  }

  if (filteredData.length === 0) {
    return <div className="empty-report">No data available for {trainerFilter}</div>;
  }

  // Calculate summary for filtered data
  let summary = {};
  
  if (trainerFilter && filteredData.length === 1) {
    // For single trainer, use their data
    const trainerData = filteredData[0];
    summary = {
      total_hours: trainerData.total_hours || 0,
      total_sessions: trainerData.total_sessions || 0,
      avg_hours_per_trainer: trainerData.avg_session_hours || 0,
      total_overtime: trainerData.total_overtime || 0,
      monthly_quota: data.summary?.monthly_quota || 180
    };
  } else {
    // For all trainers (admin view)
    summary = data.summary || {
      total_hours: 0,
      total_sessions: 0,
      avg_hours_per_trainer: 0,
      total_overtime: 0,
      monthly_quota: 180
    };
  }

  return (
    <div className="report-section">
      <h2>Training Hours Report {trainerFilter && `(${trainerFilter})`}</h2>
      
      <div className="summary-stats">
        <div className="stat-box">
          <h4>Total Hours</h4>
          <p className="stat-number">{typeof summary.total_hours === 'number' ? summary.total_hours.toFixed(2) : 0}h</p>
        </div>
        <div className="stat-box">
          <h4>Total Sessions</h4>
          <p className="stat-number">{summary.total_sessions || 0}</p>
        </div>
        <div className="stat-box">
          <h4>{trainerFilter ? 'Avg Hours/Session' : 'Avg Hours/Trainer'}</h4>
          <p className="stat-number">
            {typeof summary.avg_hours_per_trainer === 'number' ? summary.avg_hours_per_trainer.toFixed(2) : 0}h
          </p>
        </div>
        <div className="stat-box stat-box-warning">
          <h4>Total Overtime</h4>
          <p className="stat-number stat-overtime">
            {typeof summary.total_overtime === 'number' ? summary.total_overtime.toFixed(2) : 0}h
          </p>
        </div>
      </div>

      <div className="hours-table">
        <table>
          <thead>
            <tr>
              <th>Trainer</th>
              <th>Total Hours</th>
              <th>Sessions</th>
              <th>Avg/Session</th>
              <th>Overtime</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => (
              <tr key={idx}>
                <td className="trainer-name">{item.trainer}</td>
                <td className="hours-cell">{typeof item.total_hours === 'number' ? item.total_hours.toFixed(2) : 0}h</td>
                <td className="sessions-cell">{item.total_sessions || 0}</td>
                <td className="avg-cell">{typeof item.avg_session_hours === 'number' ? item.avg_session_hours.toFixed(2) : 0}h</td>
                <td className={`overtime-cell ${item.total_overtime > 0 ? 'overtime' : ''}`}>
                  {typeof item.total_overtime === 'number' ? item.total_overtime.toFixed(2) : 0}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Breakdown */}
      {filteredData.length > 0 && filteredData[0].monthly_breakdown && (
        <div className="monthly-breakdown">
          <h3>📅 Monthly Breakdown & Quota Tracking</h3>
          <div className="monthly-quota-grid">
            {filteredData.map((trainer, idx) => (
              <div key={idx} className="trainer-monthly-section">
                <h4>{trainer.trainer}</h4>
                <div className="months-list">
                  {trainer.monthly_breakdown.map((month, mIdx) => (
                    <div key={mIdx} className="month-quota-card">
                      <div className="month-header">
                        <span className="month-name">{formatMonthShort(month.month)}</span>
                        <span className={`quota-badge ${month.overtime > 0 ? 'overtime' : 'normal'}`}>
                          {month.overtime > 0 ? `+${month.overtime.toFixed(1)}h OT` : month.hours_left > 0 ? `${month.hours_left.toFixed(1)}h Left` : 'Met'}
                        </span>
                      </div>
                      
                      <div className="quota-bar-container">
                        <div className="quota-bar">
                          <div 
                            className="quota-bar-fill"
                            style={{ width: `${Math.min(month.percentage, 100)}%` }}
                          >
                            {month.percentage > 10 && <span>{month.percentage}%</span>}
                          </div>
                          {month.percentage > 100 && (
                            <div 
                              className="quota-bar-overtime"
                              style={{ width: `${Math.min(month.percentage - 100, 100)}%` }}
                            >
                              {(month.percentage - 100) > 10 && <span>+{(month.percentage - 100).toFixed(0)}%</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="quota-details">
                        <div className="detail-row">
                          <span className="detail-label">Hours:</span>
                          <span className="detail-value">{month.hours.toFixed(1)}h / {month.quota}h</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Sessions:</span>
                          <span className="detail-value">{month.sessions}</span>
                        </div>
                        {month.hours_left > 0 && (
                          <div className="detail-row hours-left">
                            <span className="detail-label">Hours Left:</span>
                            <span className="detail-value">{month.hours_left.toFixed(1)}h</span>
                          </div>
                        )}
                        {month.overtime > 0 && (
                          <div className="detail-row overtime-row">
                            <span className="detail-label">Overtime:</span>
                            <span className="detail-value overtime">{month.overtime.toFixed(1)}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format month short (e.g., "Aug 2026")
function formatMonthShort(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(`${monthStr}-01`);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Monthly Trends Report Component
function MonthlyTrendsReport({ data, trainerFilter }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  return (
    <div className="report-section">
      <h2>Monthly Activity Trends {trainerFilter && `(${trainerFilter})`}</h2>
      
      <div className="trends-timeline">
        {data.map((month, idx) => (
          <div key={idx} className="month-card">
            <h3>{formatMonth(month.month)}</h3>
            
            <div className="month-summary">
              <div className="metric">
                <span className="metric-label">Activities:</span>
                <span className="metric-value">{month.total_count || 0}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Hours:</span>
                <span className="metric-value">{typeof month.total_hours === 'number' ? month.total_hours.toFixed(2) : 0}h</span>
              </div>
            </div>

            <div className="activities-breakdown">
              {month.activities && month.activities.map((act, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-name">{act.activity_type}</span>
                  <span className="activity-stat">
                    {act.count} ({typeof act.hours === 'number' ? act.hours.toFixed(2) : 0}h)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to format month
function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(`${monthStr}-01`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default ReportsPage;
