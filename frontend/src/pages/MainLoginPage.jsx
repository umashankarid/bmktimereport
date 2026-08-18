import React, { useState } from 'react';
import '../styles/MainLoginPage.css';

function MainLoginPage({ onAdminLogin, onTrainerLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationType, setRegistrationType] = useState('trainer'); // 'trainer' or 'volunteer'
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Trainer Registration fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [trainerType, setTrainerType] = useState('Assistant Trainer');
  const [regPhoto, setRegPhoto] = useState(null);
  const [regPhotoPreview, setRegPhotoPreview] = useState(null);
  
  // Volunteer Registration fields
  const [volName, setVolName] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volPassword, setVolPassword] = useState('');
  const [volConfirmPassword, setVolConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotMessageType, setForgotMessageType] = useState('');

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMessage('');

    if (!forgotEmail) {
      setForgotMessage('Please enter your email address');
      setForgotMessageType('error');
      return;
    }

    try {
      setForgotLoading(true);
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const result = await response.json();

      setForgotMessage('If the email is registered, a reset link has been sent to your inbox.');
      setForgotMessageType('success');
      setForgotEmail('');
    } catch (err) {
      setForgotMessage('An error occurred. Please try again.');
      setForgotMessageType('error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    // Check if admin (admin, andi, or sugi)
    const adminUsers = ['admin', 'andi', 'sugi'];
    if (adminUsers.includes(username.toLowerCase())) {
      const result = await onAdminLogin(username, password);
      if (!result.success) {
        setError(result.message);
      }
    } else {
      // Trainer login
      const result = await onTrainerLogin(username, password, false);
      if (!result.success) {
        setError(result.message);
      }
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!regUsername || !regPassword || !regEmail || !regPhone) {
      setError('Trainer name, password, email, and phone are required');
      setLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone
    if (regPhone.length < 10) {
      setError('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('trainer_name', regUsername);
    formData.append('password', regPassword);
    formData.append('email', regEmail);
    formData.append('phone', regPhone);
    formData.append('trainer_type', trainerType);
    if (regPhoto) {
      formData.append('photo', regPhoto);
    }

    try {
      const response = await fetch('/api/auth/trainer/register', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setError('');
        alert('Registration successful! Please login with your credentials.');
        setIsRegistering(false);
        setRegUsername('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegEmail('');
        setRegPhone('');
        setTrainerType('Assistant Trainer');
        setRegPhoto(null);
        setRegPhotoPreview(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }

    setLoading(false);
  };

  const handleVolunteerRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!volName || !volPassword || !volEmail || !volPhone) {
      setError('Name, password, email, and phone are required');
      setLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(volEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone
    if (volPhone.length < 10) {
      setError('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }

    if (volPassword !== volConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (volPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Create FormData for volunteer registration
    const formData = new FormData();
    formData.append('trainer_name', volName);
    formData.append('password', volPassword);
    formData.append('email', volEmail);
    formData.append('phone', volPhone);
    formData.append('trainer_type', 'Volunteer');

    try {
      const response = await fetch('/api/auth/trainer/register', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setError('');
        alert('Volunteer registration successful! Please login with your credentials.');
        setIsRegistering(false);
        setRegistrationType('trainer');
        setVolName('');
        setVolPassword('');
        setVolConfirmPassword('');
        setVolEmail('');
        setVolPhone('');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }

    setLoading(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setRegPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setRegPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="main-login-container">
      <div className="main-login-card">
        <div className="login-header">
          <h1>🏸 BMK KOMET ACTIVITIES</h1>
          <p>{isRegistering ? 'Create your account' : 'Login to your account'}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Login</h2>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username (admin/andi/sugi for admins)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="forgot-password-link">
              <a href="/reset-password" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>
                Forgot Password?
              </a>
            </div>

            <div className="form-toggle">
              <p>Don't have an account? <button type="button" className="link-btn" onClick={() => { setIsRegistering(true); setError(''); setRegistrationType('trainer'); }}>Register</button></p>
            </div>
          </form>
        ) : (
          <div>
            {/* Registration Tabs */}
            <div className="registration-tabs">
              <button
                className={`tab-btn ${registrationType === 'trainer' ? 'active' : ''}`}
                onClick={() => {
                  setRegistrationType('trainer');
                  setError('');
                }}
              >
                📋 Trainer
              </button>
              <button
                className={`tab-btn ${registrationType === 'volunteer' ? 'active' : ''}`}
                onClick={() => {
                  setRegistrationType('volunteer');
                  setError('');
                }}
              >
                🤝 Volunteer Support
              </button>
            </div>

            {/* Trainer Registration Form */}
            {registrationType === 'trainer' && (
              <form onSubmit={handleRegister} className="login-form">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                >
                  ← Back to Login
                </button>

                <h2>Register as Trainer</h2>
                <p className="registration-note">👨‍🏫 All young coaches should register as Junior Trainers</p>

            <div className="form-group">
              <label>Trainer Name</label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Your trainer name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Your phone number"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Trainer Type</label>
              <select
                value={trainerType}
                onChange={(e) => setTrainerType(e.target.value)}
                disabled={loading}
                className="trainer-type-select"
              >
                <option value="Assistant Trainer">Assistant Trainer</option>
                <option value="Junior Trainer">Junior Trainer</option>
              </select>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
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
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Profile Photo (Optional)</label>
              <div className="photo-upload-group">
                <input
                  type="file"
                  id="photo-input"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={loading}
                  className="photo-input"
                />
                <label htmlFor="photo-input" className="photo-input-label">
                  {regPhotoPreview ? '✓ Photo selected' : '📷 Choose photo (max 5MB)'}
                </label>
              </div>
              {regPhotoPreview && (
                <div className="photo-preview">
                  <img src={regPhotoPreview} alt="Preview" />
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>

            <div className="form-toggle">
              <p>Already have an account? <button type="button" className="link-btn" onClick={() => { setIsRegistering(false); setError(''); }}>Login here</button></p>
            </div>
              </form>
            )}

            {/* Volunteer Registration Form */}
            {registrationType === 'volunteer' && (
              <form onSubmit={handleVolunteerRegister} className="login-form">
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                >
                  ← Back to Login
                </button>

                <h2>Register as Volunteer Support</h2>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={volName}
                    onChange={(e) => setVolName(e.target.value)}
                    placeholder="Your full name"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={volEmail}
                    onChange={(e) => setVolEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={volPhone}
                    onChange={(e) => setVolPhone(e.target.value)}
                    placeholder="Your phone number"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={volPassword}
                      onChange={(e) => setVolPassword(e.target.value)}
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
                    value={volConfirmPassword}
                    onChange={(e) => setVolConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </button>

                <div className="form-toggle">
                  <p>Already have an account? <button type="button" className="link-btn" onClick={() => { setIsRegistering(false); setError(''); }}>Login here</button></p>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="login-footer">
          <p>Secure badminton activity logging system</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Reset Password</h2>
              <button className="close-btn" onClick={() => setShowForgotPassword(false)}>×</button>
            </div>
            <p className="modal-description">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            {forgotMessage && (
              <div className={`alert alert-${forgotMessageType}`}>
                <span>{forgotMessage}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  disabled={forgotLoading}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="modal-footer">
              <button className="btn-text" onClick={() => setShowForgotPassword(false)}>
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainLoginPage;
