import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityForm from '../components/ActivityForm';
import Responsibilities from '../components/Responsibilities';
import BillReimbursement from '../components/BillReimbursement';
import '../styles/TrainerDashboard.css';

function TrainerDashboard({ onLogout, error, setError, onActivitySubmit, trainers, currentTrainer }) {
  const [activeTab, setActiveTab] = useState('form');
  const navigate = useNavigate();

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

  const handleLogout = () => {
    onLogout();
    navigate('/login');
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
      const token = localStorage.getItem('trainerToken');
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
    <div className="App">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="header-title">
              <h1>🏸 BMK Komet Activity Logger</h1>
              <p>Track and log your coaching activities</p>
            </div>
            <div className="header-admin">
              <span className="admin-name">
                👤 {currentTrainer?.name || 'Trainer'}
              </span>
              <button className="btn-change-password" onClick={() => setShowChangePasswordModal(true)}>
                🔐 Change Password
              </button>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          📝 Log Activities
        </button>
        <button
          className={`tab ${activeTab === 'responsibilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('responsibilities')}
        >
          📋 Responsibilities
        </button>
        <button
          className={`tab ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          💰 Bill Reimbursement
        </button>
      </nav>

      <main className="container">
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {activeTab === 'form' && (
          <ActivityForm onSubmit={onActivitySubmit} trainers={trainers} currentTrainer={currentTrainer} />
        )}

        {activeTab === 'responsibilities' && (
          <Responsibilities />
        )}

        {activeTab === 'bills' && (
          <BillReimbursement currentTrainer={currentTrainer} />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 BMK Komet Activity Logger | Data stored in Google Sheets</p>
      </footer>

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
    </div>
  );
}

export default TrainerDashboard;
