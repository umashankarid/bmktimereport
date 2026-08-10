import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import ActivityHistoryView from '../components/ActivityHistoryView';
import ActivitySummaryTable from '../components/ActivitySummaryTable';
import QRCodePrinter from '../components/QRCodePrinter';
import ManageTrainers from '../components/ManageTrainers';
import ManageTournaments from '../components/ManageTournaments';
import ManageVolunteers from '../components/ManageVolunteers';
import FreezeManagement from '../components/FreezeManagement';
import TimeReportStatus from '../components/TimeReportStatus';

function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get active tab from URL, default to reports
  const getActiveTab = () => {
    const path = location.pathname.split('/admin/')[1] || 'reports';
    return path === '' ? 'reports' : path;
  };
  
  const activeTab = getActiveTab();
  const setActiveTab = (tab) => navigate(`/admin/${tab}`);
  
  const [configFile, setConfigFile] = useState(null);
  const [sheetId, setSheetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [reportTrainerType, setReportTrainerType] = useState('Assistant Trainer');

  // Date filter for specific day or range
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  
  const [dateRangeStart, setDateRangeStart] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    return now.toISOString().split('T')[0];
  });
  
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState('single');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeReportTrainerType, setTimeReportTrainerType] = useState('Assistant Trainer');

  // Fetch trainers on mount
  React.useEffect(() => {
    fetchTrainers();
  }, []);

  // When report trainer type changes, reset selected trainer to first of that type
  React.useEffect(() => {
    if (trainers.length > 0) {
      const trainersOfType = trainers.filter(t => t.trainer_type === reportTrainerType);
      if (trainersOfType.length > 0) {
        setSelectedTrainer(trainersOfType[0].name);
      } else {
        setSelectedTrainer('');
      }
    }
  }, [reportTrainerType, trainers]);

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/trainers/details/all');
      const result = await response.json();
      if (result.success && result.data) {
        setTrainers(result.data);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const handleRefreshReport = async () => {
    setIsRefreshing(true);
    try {
      // Force ActivitySummaryTable to re-fetch by changing the key
      setRefreshKey(prev => prev + 1);
      // Small delay to show refresh animation
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        setMessage('Please select a JSON file');
        setMessageType('error');
        setConfigFile(null);
        return;
      }
      setConfigFile(file);
      setMessage('');
      setMessageType('');
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setLoading(true);

    if (!configFile || !sheetId) {
      setMessage('Please provide both credentials file and Sheet ID');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('sheet_id', sheetId);
      formData.append('credentials', configFile);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/auth/setup-sheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Google Sheets configuration saved successfully!');
        setMessageType('success');
        setConfigFile(null);
        setSheetId('');
        // Clear file input
        document.getElementById('credentialsFile').value = '';
      } else {
        setMessage(`❌ ${data.message || 'Configuration failed'}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>⚙️ Admin Dashboard</h1>
          <p>Manage badminton activity logger</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📋 Time Report Status
        </button>
        <button
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          📝 Activity History
        </button>
        <button
          className={`tab-btn ${activeTab === 'trainers' ? 'active' : ''}`}
          onClick={() => setActiveTab('trainers')}
        >
          👥 Manage Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          🏸 Manage Tournaments
        </button>
        <button
          className={`tab-btn ${activeTab === 'volunteers' ? 'active' : ''}`}
          onClick={() => setActiveTab('volunteers')}
        >
          🙋 Manage Volunteers
        </button>
        <button
          className={`tab-btn ${activeTab === 'freeze' ? 'active' : ''}`}
          onClick={() => setActiveTab('freeze')}
        >
          🔒 Freeze Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'qrcodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('qrcodes')}
        >
          📱 QR Codes
        </button>
        <button
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          🔧 Configuration
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'tournaments' && (
          <ManageTournaments />
        )}
        {activeTab === 'volunteers' && (
          <ManageVolunteers />
        )}
        {activeTab === 'freeze' && (
          <FreezeManagement />
        )}
        {activeTab === 'trainers' && (
          <ManageTrainers />
        )}
        {activeTab === 'qrcodes' && (
          <QRCodePrinter />
        )}
        {activeTab === 'config' && (
          <div className="config-section">
            <h2>Google Sheets Configuration</h2>
            <p className="section-description">
              Update your Google Sheets credentials and sheet ID for data storage.
            </p>

            {message && (
              <div className={`alert alert-${messageType}`}>
                <span>{message}</span>
                {messageType === 'error' && (
                  <button onClick={() => setMessage('')}>×</button>
                )}
              </div>
            )}

            <form onSubmit={handleConfigSubmit} className="config-form">
              <div className="form-group">
                <label>Google Cloud Credentials (JSON file)</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="credentialsFile"
                    accept=".json"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="file-input"
                  />
                  <label htmlFor="credentialsFile" className="file-label">
                    {configFile ? (
                      <>
                        ✅ {configFile.name}
                      </>
                    ) : (
                      <>
                        📁 Click to select JSON file
                      </>
                    )}
                  </label>
                </div>
                <p className="field-hint">
                  Download from Google Cloud Console &gt; Credentials &gt; Service Account &gt; Keys
                </p>
              </div>

              <div className="form-group">
                <label>Google Sheet ID</label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g., 1Kn2zxibNy2omm00YEZDmLnnanruqkfcv2UeU7TK35KU"
                  disabled={loading}
                  className="sheet-id-input"
                />
                <p className="field-hint">
                  Found in your Google Sheet URL: docs.google.com/spreadsheets/d/[SHEET_ID]/edit
                </p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving Configuration...' : 'Save Configuration'}
              </button>
            </form>

            <div className="config-info">
              <h3>ℹ️ Setup Instructions</h3>
              <ol>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>Create or select a project</li>
                <li>Enable Google Sheets API</li>
                <li>Create a Service Account</li>
                <li>Download the JSON credentials file</li>
                <li>Upload the file here along with your Sheet ID</li>
                <li>Share your Google Sheet with the service account email</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reports-section">
            <h2>Activity Summary Report</h2>
            
            {/* Trainer Type Selector */}
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
            
            <div className="report-filters">
              <div className="filter-group">
                <label htmlFor="trainer-filter">Trainer:</label>
                <select
                  id="trainer-filter"
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All {reportTrainerType}s</option>
                  {trainers
                    .filter(trainer => trainer.trainer_type === reportTrainerType)
                    .map((trainer) => (
                      <option key={trainer.name} value={trainer.name}>
                        {trainer.name}
                      </option>
                    ))}
                </select>
              </div>
              
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

              <div className="filter-group">
                <label htmlFor="date-toggle" className="date-toggle-label">
                  <input
                    type="checkbox"
                    id="date-toggle"
                    checked={useDateFilter}
                    onChange={(e) => setUseDateFilter(e.target.checked)}
                    className="date-toggle-checkbox"
                  />
                  <span>Filter by specific date(s)</span>
                </label>
              </div>
            </div>

            {useDateFilter && (
              <div className="report-filters">
                <div className="filter-group">
                  <label className="date-mode-label">
                    <input
                      type="radio"
                      value="single"
                      checked={dateFilterMode === 'single'}
                      onChange={(e) => setDateFilterMode(e.target.value)}
                    />
                    <span>Single Day</span>
                  </label>
                  <label className="date-mode-label">
                    <input
                      type="radio"
                      value="range"
                      checked={dateFilterMode === 'range'}
                      onChange={(e) => setDateFilterMode(e.target.value)}
                    />
                    <span>Date Range</span>
                  </label>
                </div>

                {dateFilterMode === 'single' ? (
                  <div className="filter-group">
                    <label htmlFor="date-filter">📅 Select Date:</label>
                    <input
                      type="date"
                      id="date-filter"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                ) : (
                  <div className="filter-group date-range-group">
                    <label htmlFor="date-from">📅 From Date:</label>
                    <input
                      type="date"
                      id="date-from"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="filter-input"
                    />
                    <label htmlFor="date-to">📅 To Date:</label>
                    <input
                      type="date"
                      id="date-to"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="report-actions">
              <button 
                className="btn-refresh"
                onClick={handleRefreshReport}
                disabled={isRefreshing}
                title="Refresh report data"
              >
                {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Report'}
              </button>
            </div>

            <ActivitySummaryTable 
              key={refreshKey}
              trainerFilter={selectedTrainer} 
              selectedMonth={selectedMonth}
              trainerType={reportTrainerType}
              useDateFilter={useDateFilter}
              dateFilterMode={dateFilterMode}
              selectedDate={selectedDate}
              dateRangeStart={dateRangeStart}
              dateRangeEnd={dateRangeEnd}
            />
          </div>
        )}

        {activeTab === 'status' && (
          <div className="status-section">
            <TimeReportStatus trainerType={timeReportTrainerType} onTrainerTypeChange={setTimeReportTrainerType} isAdminView={true} />
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="activities-section">
            <ActivityHistoryView isAdminView={true} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
