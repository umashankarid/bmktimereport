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
  
  // Month/Year filter
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Date filter for specific day
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  
  const [useDateFilter, setUseDateFilter] = useState(false);
  
  // Separate reports by trainer type
  const [reportTrainerType, setReportTrainerType] = useState('Assistant Trainer');

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
      const response = await fetch('/api/trainers/details/all');
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Trainers loaded:', result.data);
        setTrainers(result.data);
        // Set first trainer as default
        if (result.data.length > 0) {
          setSelectedTrainer(result.data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeReport, selectedTrainer, selectedMonth, selectedDate, useDateFilter, reportTrainerType]);

  // Filter trainers based on trainer type and set default selection
  useEffect(() => {
    if (trainers.length > 0 && !isTrainerView) {
      const filteredTrainers = trainers.filter(t => 
        t.trainer_type === reportTrainerType
      );
      
      if (filteredTrainers.length > 0) {
        // Set first trainer of the selected type as default
        if (!selectedTrainer || !filteredTrainers.find(t => t.name === selectedTrainer)) {
          setSelectedTrainer(filteredTrainers[0].name);
        }
      }
    }
  }, [reportTrainerType, trainers, isTrainerView]);

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

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedTrainer) {
        params.append('trainer', selectedTrainer);
      }
      // Use date filter if enabled, otherwise use month filter
      if (useDateFilter && selectedDate) {
        params.append('date', selectedDate);
      } else if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      
      const query = params.toString();
      const fullEndpoint = query ? `${endpoint}?${query}` : endpoint;

      console.log(`📊 Fetching ${activeReport}...`);
      const response = await fetch(fullEndpoint);
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
          
          {/* Filters for Admin */}
          {!isTrainerView && trainers.length > 0 && (
            <div className="report-filters">
              <div className="filter-group">
                <label htmlFor="trainer-filter">Trainer:</label>
                <select
                  id="trainer-filter"
                  value={selectedTrainer || ''}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="filter-select"
                >
                  {trainers
                    .filter(trainer => trainer.trainer_type === reportTrainerType)
                    .map(trainer => (
                      <option key={trainer.name} value={trainer.name}>
                        {trainer.name}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="date-toggle" className="date-toggle-label">
                  <input
                    type="checkbox"
                    id="date-toggle"
                    checked={useDateFilter}
                    onChange={(e) => setUseDateFilter(e.target.checked)}
                    className="date-toggle-checkbox"
                  />
                  <span>Filter by specific date</span>
                </label>
              </div>

              {useDateFilter ? (
                <div className="filter-group">
                  <label htmlFor="date-filter">Date:</label>
                  <input
                    type="date"
                    id="date-filter"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="filter-input"
                  />
                </div>
              ) : (
                <div className="filter-group">
                  <label htmlFor="month-filter">Month & Year:</label>
                  <input
                    type="month"
                    id="month-filter"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="filter-input"
                  />
                </div>
              )}
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
          {/* Trainer Type Selector */}
          {!isTrainerView && (
            <div className="trainer-type-selector">
              <label>Report Type:</label>
              <div className="type-radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="Assistant Trainer"
                    checked={reportTrainerType === 'Assistant Trainer'}
                    onChange={(e) => setReportTrainerType(e.target.value)}
                  />
                  <span>📊 Assistant Trainer Reports</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="Junior Trainer"
                    checked={reportTrainerType === 'Junior Trainer'}
                    onChange={(e) => setReportTrainerType(e.target.value)}
                  />
                  <span>👶 Junior Trainer Reports</span>
                </label>
              </div>
            </div>
          )}

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
                  <ActivitySummaryReport data={reports['activity-summary']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} selectedMonth={selectedMonth} trainerType={reportTrainerType} />
                )}
                {activeReport === 'activity-distribution' && (
                  <ActivityDistributionReport data={reports['activity-distribution']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} selectedMonth={selectedMonth} />
                )}
                {activeReport === 'monthly-trends' && (
                  <MonthlyTrendsReport data={reports['monthly-trends']} trainerFilter={isTrainerView ? currentTrainer?.name : selectedTrainer} selectedMonth={selectedMonth} />
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

// Helper function to format month (e.g., "Aug 2026")
function formatMonthShort(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(`${monthStr}-01`);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Helper function to convert decimal hours to HH:MM format
function formatHoursToHHMM(decimalHours) {
  if (typeof decimalHours !== 'number' || decimalHours < 0) return '0:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

// Activity Summary Report Component
function ActivitySummaryReport({ data, trainerFilter, selectedMonth }) {
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
      <h2>Activity Summary {trainerFilter ? `for ${trainerFilter}` : 'by Trainer'} {selectedMonth && `(${formatMonthShort(selectedMonth)})`}</h2>
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
              <span className="stat-value">{formatHoursToHHMM(summary.total_hours)}</span>
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
                  <span className="quota-value">{formatHoursToHHMM(summary.current_month_hours)} / {formatHoursToHHMM(summary.current_month_quota)}</span>
                </div>
                
                {summary.current_month_hours_left > 0 && (
                  <div className="quota-stat-row hours-left">
                    <span className="quota-label">⏳ Hours Left:</span>
                    <span className="quota-value-green">{formatHoursToHHMM(summary.current_month_hours_left)}</span>
                  </div>
                )}
                
                <div className={`quota-stat-row ${summary.current_month_overtime > 0 ? 'overtime' : 'no-overtime'}`}>
                  <span className="quota-label">⚠️ Overtime:</span>
                  <span className={summary.current_month_overtime > 0 ? 'quota-value-red' : 'quota-value-gray'}>{formatHoursToHHMM(summary.current_month_overtime)}</span>
                </div>
              </div>
            </div>
            
            <div className="activity-types">
              <h4>Activity Types:</h4>
              <ul>
                {summary.activity_types && Object.entries(summary.activity_types).map(([type, data]) => {
                  // Handle both old format (plain count) and new format (object with count and hours)
                  const count = typeof data === 'object' ? data.count : data;
                  const hours = typeof data === 'object' ? data.hours : 0;
                  const hoursStr = hours > 0 ? formatHoursToHHMM(hours) : '0:00';
                  
                  return (
                    <li key={type}>
                      <span className="type-name">{type}</span>
                      <span className="type-count">{count} ({hoursStr})</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Activity Distribution Report Component
function ActivityDistributionReport({ data, trainerFilter, selectedMonth }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  return (
    <div className="report-section">
      <h2>Activity Types Distribution {trainerFilter && `(${trainerFilter})`} {selectedMonth && `(${formatMonthShort(selectedMonth)})`}</h2>
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
              <span>⏱️ Time: {formatHoursToHHMM(item.hours)}</span>
              <span>👥 Trainers: {item.unique_trainers}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Monthly Trends Report Component
function MonthlyTrendsReport({ data, trainerFilter, selectedMonth }) {
  if (!data) {
    return <div className="empty-report">Loading report data...</div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-report">No data available</div>;
  }

  return (
    <div className="report-section">
      <h2>Monthly Activity Trends {trainerFilter && `(${trainerFilter})`} {selectedMonth && `(${formatMonthShort(selectedMonth)})`}</h2>
      
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
                <span className="metric-value">{formatHoursToHHMM(month.total_hours)}</span>
              </div>
            </div>

            {/* Overtime/Undertime Indicators */}
            <div className="overtime-indicators">
              <div className={`overtime-badge ${month.overtime > 0 ? 'overtime-status' : 'no-overtime-status'}`}>
                <span className="badge-label">Overtime:</span>
                <span className="badge-value">{formatHoursToHHMM(month.overtime || 0)}</span>
              </div>
              {month.undertime > 0 && (
                <div className="undertime-badge">
                  <span className="badge-label">Undertime:</span>
                  <span className="badge-value">{formatHoursToHHMM(month.undertime || 0)}</span>
                </div>
              )}
            </div>

            <div className="activities-breakdown">
              {month.activities && month.activities.map((act, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-name">{act.activity_type}</span>
                  <span className="activity-stat">
                    {act.count} ({formatHoursToHHMM(act.hours)})
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
