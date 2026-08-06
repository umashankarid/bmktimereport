import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TrainerLoginPage from './pages/TrainerLoginPage';
import ActivityForm from './components/ActivityForm';
import ActivityList from './components/ActivityList';
import trainerAuthService from './services/trainerAuthService';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [authState, setAuthState] = useState('checking'); // checking, login, setup, ready
  const [activities, setActivities] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [admin, setAdmin] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    if (trainerAuthService.isAuthenticated()) {
      // Skip setup - go directly to ready state
      setAuthState('ready');
      setAdmin(trainerAuthService.getTrainer());
      fetchTrainers();
      fetchActivities();
    } else {
      setAuthState('login');
    }
  };

  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData);
    setAuthState('ready');
    fetchTrainers();
    fetchActivities();
  };

  const fetchTrainers = async () => {
    try {
      const response = await axios.get(`${API_URL}/trainers`);
      if (response.data.success) {
        setTrainers(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/activities?limit=50`);
      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivitySubmit = async (formData) => {
    try {
      setError('');
      console.log('📤 Sending activity to API:', formData);
      const response = await axios.post(`${API_URL}/activities`, formData);

      console.log('📥 API Response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Activity logged successfully');
        await fetchTrainers();
        await fetchActivities();
        setActiveTab('history');
        return { success: true };
      } else {
        console.log('❌ API returned success=false:', response.data.message);
        setError(response.data.message || 'Failed to log activity');
        return { success: false, error: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error logging activity';
      console.error('❌ Error submitting activity:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleRefresh = () => {
    fetchActivities();
  };

  const handleLogout = () => {
    trainerAuthService.logout();
    setAdmin(null);
    setAuthState('login');
    setActivities([]);
    setTrainers([]);
  };

  // Render based on auth state
  if (authState === 'checking') {
    return (
      <div className="App">
        <div className="loading-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'login') {
    return <TrainerLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Main app - ready state (skip setup page)
  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="header-title">
              <h1>🏸 Badminton Activity Logger</h1>
              <p>Track and log your coaching activities</p>
            </div>
            <div className="header-admin">
              <span className="admin-name">👤 {admin?.username || 'Admin'}</span>
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
          Log Activity
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            handleRefresh();
          }}
        >
          Activity History
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
          <ActivityForm onSubmit={handleActivitySubmit} trainers={trainers} currentTrainer={admin} />
        )}

        {activeTab === 'history' && (
          <ActivityList activities={activities} loading={loading} onRefresh={handleRefresh} />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 Badminton Activity Logger | Data stored in Google Sheets</p>
      </footer>
    </div>
  );
}

export default App;
