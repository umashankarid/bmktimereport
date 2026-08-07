import React, { useState } from 'react';
import '../styles/MainLoginPage.css';

function MainLoginPage({ onAdminLogin, onTrainerLogin }) {
  const [view, setView] = useState('choice'); // choice, admin, trainer
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerPassword, setTrainerPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [trainerConfirmPassword, setTrainerConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!adminUsername || !adminPassword) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    const result = await onAdminLogin(adminUsername, adminPassword);
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleTrainerRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!trainerName || !trainerPassword) {
      setError('Trainer name and password are required');
      setLoading(false);
      return;
    }

    if (trainerPassword !== trainerConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (trainerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await onTrainerLogin(trainerName, trainerPassword, true);
    if (result.success) {
      setError('');
      alert('Registration successful! Please login.');
      setIsRegistering(false);
      setTrainerName('');
      setTrainerPassword('');
      setTrainerConfirmPassword('');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleTrainerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    console.log(`[TRAINER LOGIN] Starting login for: ${trainerName}`);

    if (!trainerName || !trainerPassword) {
      console.log(`[TRAINER LOGIN] Validation failed - empty fields`);
      setError('Trainer name and password are required');
      setLoading(false);
      return;
    }

    console.log(`[TRAINER LOGIN] Calling onTrainerLogin...`);
    const result = await onTrainerLogin(trainerName, trainerPassword, false);
    
    console.log(`[TRAINER LOGIN] Result:`, result);
    
    if (!result.success) {
      console.log(`[TRAINER LOGIN] Login failed: ${result.message}`);
      setError(result.message);
    } else {
      console.log(`[TRAINER LOGIN] Login successful!`);
    }
    setLoading(false);
  };

  return (
    <div className="main-login-container">
      <div className="main-login-card">
        <div className="login-header">
          <h1>🏸 BMK Komet Activity Logger</h1>
          <p>Login to your account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {view === 'choice' && (
          <div className="login-choice">
            <button
              className="choice-btn admin-btn"
              onClick={() => {
                setView('admin');
                setError('');
              }}
            >
              <span className="choice-icon">👨‍💼</span>
              <span className="choice-text">Admin Login</span>
            </button>
            <button
              className="choice-btn trainer-btn"
              onClick={() => {
                setView('trainer');
                setError('');
              }}
            >
              <span className="choice-icon">🏸</span>
              <span className="choice-text">Trainer Login</span>
            </button>
          </div>
        )}

        {view === 'admin' && (
          <form onSubmit={handleAdminLogin} className="login-form">
            <button
              type="button"
              className="back-btn"
              onClick={() => {
                setView('choice');
                setError('');
                setAdminUsername('');
                setAdminPassword('');
              }}
            >
              ← Back
            </button>

            <h2>Admin Login</h2>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {view === 'trainer' && (
          <div>
            <div className="trainer-toggle">
              <button
                className={`toggle-btn ${!isRegistering ? 'active' : ''}`}
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                }}
              >
                Login
              </button>
              <button
                className={`toggle-btn ${isRegistering ? 'active' : ''}`}
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                }}
              >
                Register
              </button>
            </div>

            {!isRegistering ? (
              <form onSubmit={handleTrainerLogin} className="login-form">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setView('choice');
                    setError('');
                    setTrainerName('');
                    setTrainerPassword('');
                  }}
                >
                  ← Back
                </button>

                <h2>Trainer Login</h2>

                <div className="form-group">
                  <label>Trainer Name</label>
                  <input
                    type="text"
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    placeholder="Enter your trainer name"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={trainerPassword}
                      onChange={(e) => setTrainerPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTrainerRegister} className="login-form">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setView('choice');
                    setError('');
                    setTrainerName('');
                    setTrainerPassword('');
                    setTrainerConfirmPassword('');
                  }}
                >
                  ← Back
                </button>

                <h2>Trainer Registration</h2>

                <div className="form-group">
                  <label>Trainer Name</label>
                  <input
                    type="text"
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    placeholder="Your trainer name"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={trainerPassword}
                      onChange={(e) => setTrainerPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={trainerConfirmPassword}
                    onChange={(e) => setTrainerConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="login-footer">
          <p>Secure badminton activity logging system</p>
        </div>
      </div>
    </div>
  );
}

export default MainLoginPage;
