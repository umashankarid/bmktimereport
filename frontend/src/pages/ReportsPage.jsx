import React, { useState, useEffect } from 'react';
import '../styles/ReportsPage.css';

function ReportsPage({ currentTrainer = null }) {
  const [activeReport, setActiveReport] = useState('activity-summary');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTrainerView, setIsTrainerView] = useState(false);

  useEffect(() => {
    // Check if this is a trainer view (not admin)
    if (currentTrainer && currentTrainer.name) {
      setIsTrainerView(true);
    }
  }, [currentTrainer]);

  useEffect(() => {
    fetchReports();
  }, [activeReport]);

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
                  <ActivitySummaryReport data={reports['activity-summary']} trainerFilter={isTrainerView ? currentTrainer?.name : null} />
                )}
                {activeReport === 'activity-distribution' && (
                  <ActivityDistributionReport data={reports['activity-distribution']} trainerFilter={isTrainerView ? currentTrainer?.name : null} />
                )}
                {activeReport === 'training-hours' && (
                  <TrainingHoursReport data={reports['training-hours']} trainerFilter={isTrainerView ? currentTrainer?.name : null} />
                )}
                {activeReport === 'monthly-trends' && (
                  <MonthlyTrendsReport data={reports['monthly-trends']} trainerFilter={isTrainerView ? currentTrainer?.name : null} />
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
  if (!data || Object.keys(data).length === 0) {
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
    return <div className="empty-report">No data available for your activities</div>;
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
              <span className="stat-value">{summary.total_activities}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Hours:</span>
              <span className="stat-value">{summary.total_hours}h</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Days:</span>
              <span className="stat-value">{summary.active_days}</span>
            </div>
            
            <div className="activity-types">
              <h4>Activity Types:</h4>
              <ul>
                {Object.entries(summary.activity_types).map(([type, count]) => (
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
  if (!data || data.length === 0) {
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
  if (!data || data.data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  // Filter data if this is a trainer view
  let filteredData = data.data;
  if (trainerFilter) {
    filteredData = data.data.filter(item => item.trainer.toLowerCase() === trainerFilter.toLowerCase());
  }

  if (filteredData.length === 0) {
    return <div className="empty-report">No data available for your activities</div>;
  }

  // Calculate summary for filtered data
  const summary = filteredData.length === data.data.length 
    ? data.summary
    : {
        total_hours: filteredData.reduce((sum, item) => sum + item.total_hours, 0),
        total_sessions: filteredData.reduce((sum, item) => sum + item.total_sessions, 0),
        avg_hours_per_trainer: filteredData.length > 0 
          ? filteredData.reduce((sum, item) => sum + item.total_hours, 0) / filteredData.length 
          : 0
      };

  return (
    <div className="report-section">
      <h2>Training Hours Report {trainerFilter && `(${trainerFilter})`}</h2>
      
      <div className="summary-stats">
        <div className="stat-box">
          <h4>Total Hours</h4>
          <p className="stat-number">{summary.total_hours.toFixed(2)}h</p>
        </div>
        <div className="stat-box">
          <h4>Total Sessions</h4>
          <p className="stat-number">{summary.total_sessions}</p>
        </div>
        <div className="stat-box">
          <h4>Avg Hours/Session</h4>
          <p className="stat-number">{(summary.total_hours / summary.total_sessions).toFixed(2)}h</p>
        </div>
      </div>

      <div className="hours-table">
        <table>
          <thead>
            <tr>
              <th>Trainer</th>
              <th>Total Hours</th>
              <th>Sessions</th>
              <th>Avg per Session</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => (
              <tr key={idx}>
                <td className="trainer-name">{item.trainer}</td>
                <td className="hours-cell">{item.total_hours}h</td>
                <td className="sessions-cell">{item.total_sessions}</td>
                <td className="avg-cell">{item.avg_session_hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Monthly Trends Report Component
function MonthlyTrendsReport({ data, trainerFilter }) {
  if (!data || data.length === 0) {
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
                <span className="metric-value">{month.total_count}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Hours:</span>
                <span className="metric-value">{month.total_hours}h</span>
              </div>
            </div>

            <div className="activities-breakdown">
              {month.activities.map((act, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-name">{act.activity_type}</span>
                  <span className="activity-stat">
                    {act.count} ({act.hours}h)
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
