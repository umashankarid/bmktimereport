import React, { useState } from 'react';
import '../styles/AdminDashboard.css';
import ReportsPage from './ReportsPage';
import ActivityHistoryView from '../components/ActivityHistoryView';

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('config'); // config, reports, activities
  const [configFile, setConfigFile] = useState(null);
  const [sheetId, setSheetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error

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
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          🔧 Configuration
        </button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          📝 Activity History
        </button>
      </div>

      <div className="admin-content">
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
          <ReportsPage />
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
