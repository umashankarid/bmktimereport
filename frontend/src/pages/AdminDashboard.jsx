import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import ActivityHistoryView from '../components/ActivityHistoryView';
import ActivitySummaryTable from '../components/ActivitySummaryTable';
import QRCodePrinter from '../components/QRCodePrinter';
import ManageTrainers from '../components/ManageTrainers';
import ManageTournaments from '../components/ManageTournaments';
import ManageVolunteers from '../components/ManageVolunteers';
import PaymentManagement from '../components/PaymentManagement';
import TimeReportStatus from '../components/TimeReportStatus';
import BillManagement from '../components/BillManagement';
import PasswordVault from '../components/PasswordVault';

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

  // Change password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMessage, setChangePasswordMessage] = useState('');
  const [changePasswordMessageType, setChangePasswordMessageType] = useState('');

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

  const handleRefreshCache = async () => {
    try {
      setIsRefreshing(true);
      setMessage('');
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/cache/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ Cache refreshed! Activities: ${result.data.activities_count}, Trainers: ${result.data.trainers_count}, Freezes: ${result.data.freezes_count}`);
        setMessageType('success');
        // Refresh all reports
        setRefreshKey(prev => prev + 1);
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error refreshing cache: ' + err.message);
      setMessageType('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordMessage('');
    setChangePasswordMessageType('');

    if (!changePasswordForm.oldPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      setChangePasswordMessage('All fields are required');
      setChangePasswordMessageType('error');
      return;
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangePasswordMessage('New passwords do not match');
      setChangePasswordMessageType('error');
      return;
    }

    if (changePasswordForm.newPassword.length < 6) {
      setChangePasswordMessage('New password must be at least 6 characters');
      setChangePasswordMessageType('error');
      return;
    }

    try {
      setChangePasswordLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: changePasswordForm.oldPassword,
          new_password: changePasswordForm.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        setChangePasswordMessage('✅ Password changed successfully');
        setChangePasswordMessageType('success');
        setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowChangePasswordModal(false);
        }, 1500);
      } else {
        setChangePasswordMessage(`❌ ${result.message}`);
        setChangePasswordMessageType('error');
      }
    } catch (err) {
      setChangePasswordMessage(`Error: ${err.message}`);
      setChangePasswordMessageType('error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>⚙️ Admin Dashboard</h1>
          <p>Manage badminton activity logger</p>
        </div>
        <div className="admin-header-actions">
          <button className="change-password-btn" onClick={() => setShowChangePasswordModal(true)}>
            🔐 Change Password
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔐 Change Password</h2>
              <button className="close-btn" onClick={() => setShowChangePasswordModal(false)}>×</button>
            </div>

            {changePasswordMessage && (
              <div className={`alert alert-${changePasswordMessageType}`}>
                <span>{changePasswordMessage}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="change-password-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={changePasswordForm.oldPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, oldPassword: e.target.value})}
                  placeholder="Enter your current password"
                  disabled={changePasswordLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={changePasswordForm.newPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, newPassword: e.target.value})}
                  placeholder="Enter new password (minimum 6 characters)"
                  disabled={changePasswordLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={changePasswordForm.confirmPassword}
                  onChange={(e) => setChangePasswordForm({...changePasswordForm, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  disabled={changePasswordLoading}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-change-password"
                  disabled={changePasswordLoading}
                >
                  {changePasswordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowChangePasswordModal(false)}
                  disabled={changePasswordLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          💳 Payment Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          💰 Bill Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => setActiveTab('vault')}
        >
          🔐 Password Vault
        </button>
        <button
          className={`tab-btn ${activeTab === 'qrcodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('qrcodes')}
        >
          📱 QR Codes
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
          <PaymentManagement />
        )}
        {activeTab === 'bills' && (
          <BillManagement />
        )}
        {activeTab === 'vault' && (
          <PasswordVault />
        )}
        {activeTab === 'trainers' && (
          <ManageTrainers />
        )}
        {activeTab === 'qrcodes' && (
          <QRCodePrinter />
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
              <button 
                className="btn-refresh btn-cache-refresh"
                onClick={handleRefreshCache}
                disabled={isRefreshing}
                title="Force refresh all cached data from sheets (trainers, activities, freezes)"
              >
                {isRefreshing ? '⚡ Syncing...' : '⚡ Sync Cache'}
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
