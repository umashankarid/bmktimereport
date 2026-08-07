import React, { useState } from 'react';
import trainerAuthService from '../services/trainerAuthService';
import '../styles/TrainerLoginPage.css';

function TrainerLoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [trainerName, setTrainerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

      setPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!trainerName || !password || !email || !phone) {
      setError('Trainer name, password, email, and phone are required');
      setLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone (basic validation)
    if (phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('trainer_name', trainerName);
    formData.append('password', password);
    formData.append('email', email);
    formData.append('phone', phone);
    if (photo) {
      formData.append('photo', photo);
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
        setIsLogin(true);
        setTrainerName('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setPhone('');
        setPhoto(null);
        setPhotoPreview(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }

    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!trainerName || !password) {
      setError('Trainer name and password are required');
      setLoading(false);
      return;
    }

    const result = await trainerAuthService.login(trainerName, password);

    if (result.success) {
      setError('');
      onLoginSuccess(result.trainer);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="trainer-login-container">
      <div className="trainer-login-card">
        <div className="trainer-login-header">
          <h1>🏸 BMK Komet Activity Logger</h1>
          <p>Trainer Portal</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="auth-toggle">
          <button
            className={`toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
          >
            Login
          </button>
          <button
            className={`toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="trainer-form">
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
          </form>
        ) : (
          <form onSubmit={handleRegister} className="trainer-form">
            <h2>Create Trainer Account</h2>

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
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {photoPreview ? '✓ Photo selected' : '📷 Choose photo (max 5MB)'}
                </label>
              </div>
              {photoPreview && (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Preview" />
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div className="trainer-login-footer">
          <p>Your credentials are securely stored with encryption</p>
        </div>
      </div>
    </div>
  );
}

export default TrainerLoginPage;
