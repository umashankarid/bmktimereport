import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/MainLoginPage.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setMessage('Invalid reset link. No token provided.');
      setMessageType('error');
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await response.json();

      if (result.success) {
        setValid(true);
        setTrainerName(result.trainer_name);
      } else {
        setMessage(result.message || 'Invalid or expired reset link');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error validating reset link');
      setMessageType('error');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newPassword || !confirmPassword) {
      setMessage('Both fields are required');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const result = await response.json();

      if (result.success) {
        setMessage('✅ Password has been reset successfully! You can now login with your new password.');
        setMessageType('success');
        setSuccess(true);
      } else {
        setMessage(result.message || 'Error resetting password');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-login-container">
      <div className="main-login-card">
        <div className="login-header">
          <h1>🏸 BMK KOMET ACTIVITIES</h1>
          <p>Reset Password</p>
        </div>

        {message && (
          <div className={`alert alert-${messageType}`}>
            <span>{message}</span>
          </div>
        )}

        {validating ? (
          <div className="reset-loading">
            <p>Validating reset link...</p>
          </div>
        ) : valid && !success ? (
          <form onSubmit={handleSubmit} className="login-form">
            <p className="reset-info">
              Set a new password for <strong>{trainerName}</strong>
            </p>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : null}

        {success && (
          <div className="reset-success">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              ← Go to Login
            </button>
          </div>
        )}

        {!valid && !validating && (
          <div className="reset-invalid">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
