import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import '../styles/SetupPage.css';

function SetupPage({ onSetupComplete, admin }) {
  const [sheetId, setSheetId] = useState('');
  const [credentialsFile, setCredentialsFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupStatus, setSetupStatus] = useState(null);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    const status = await authService.checkSetupStatus();
    setSetupStatus(status);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate it's a JSON file
      if (!file.name.endsWith('.json')) {
        setError('Please select a JSON file');
        return;
      }
      setCredentialsFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!sheetId.trim()) {
      setError('Please enter your Google Sheet ID');
      return;
    }

    if (!credentialsFile) {
      setError('Please select the credentials JSON file');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.setupGoogleSheets(sheetId, credentialsFile);

      if (result.success) {
        setSuccess('✓ Google Sheets connection successful!');
        setSheetId('');
        setCredentialsFile(null);
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Setup error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>🔧 Setup Google Sheets Integration</h1>
        <p className="setup-subtitle">
          Configure your badminton activity Google Sheet for data storage
        </p>

        {setupStatus?.configured ? (
          <div className="alert alert-success setup-complete">
            ✓ Google Sheets is already configured!
            <br />
            <small>Connected to sheet: {setupStatus.sheet_id}</small>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} className="setup-form">
              <div className="setup-step">
                <h2>Step 1: Enter Google Sheet ID</h2>
                <p className="step-description">
                  Your Sheet ID is found in the URL:
                  <br />
                  <code>
                    docs.google.com/spreadsheets/d/<strong>SHEET_ID_HERE</strong>/edit
                  </code>
                </p>

                <div className="form-group">
                  <label htmlFor="sheetId">Google Sheet ID *</label>
                  <input
                    type="text"
                    id="sheetId"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="e.g., 1a2b3c4d5e6f7g8h9i0j"
                    disabled={loading}
                    required
                  />
                  <small>
                    This should be a long alphanumeric string from your Google Sheet URL
                  </small>
                </div>
              </div>

              <div className="setup-step">
                <h2>Step 2: Upload Service Account Credentials</h2>
                <p className="step-description">
                  Upload the JSON file you downloaded from Google Cloud Console
                </p>

                <div className="form-group">
                  <label htmlFor="credentials">Credentials JSON File *</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="credentials"
                      accept=".json"
                      onChange={handleFileChange}
                      disabled={loading}
                      required
                    />
                    {credentialsFile && (
                      <div className="file-selected">
                        ✓ {credentialsFile.name}
                      </div>
                    )}
                  </div>
                  <small>
                    Downloaded from: Google Cloud Console &gt; Service Account &gt; Keys &gt; Create Key
                  </small>
                </div>
              </div>

              <div className="setup-step setup-checklist">
                <h3>Before you continue, make sure:</h3>
                <ul>
                  <li>
                    <input type="checkbox" disabled /> Your Google Sheet has headers:
                    Trainer Name, Date, Activity, Start Time, End Time, Note
                  </li>
                  <li>
                    <input type="checkbox" disabled /> You shared the Google Sheet with the
                    service account email (found in the JSON file)
                  </li>
                  <li>
                    <input type="checkbox" disabled /> The JSON credentials file is from your
                    Google Cloud Service Account
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !sheetId.trim() || !credentialsFile}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </form>

            <div className="setup-help">
              <h3>Need help?</h3>
              <p>
                <strong>Getting Google Sheet ID:</strong>
                <br />
                Open your Google Sheet, copy the ID from the URL between /d/ and /edit
              </p>
              <p>
                <strong>Getting Service Account Credentials:</strong>
                <br />
                1. Go to Google Cloud Console
                <br />
                2. Create a Service Account
                <br />
                3. Create a JSON key
                <br />
                4. Download and upload it here
              </p>
            </div>
          </>
        )}

        <div className="setup-footer">
          <button className="btn btn-secondary" onClick={() => authService.logout()}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetupPage;
