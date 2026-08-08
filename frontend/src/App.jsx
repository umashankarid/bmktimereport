import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import MainLoginPage from './pages/MainLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/ReportsPage';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ActivityForm from './components/ActivityForm';
import ActivityHistoryView from './components/ActivityHistoryView';
import Responsibilities from './components/Responsibilities';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [authState, setAuthState] = useState('checking'); // checking, login, ready
  const [activities, setActivities] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [admin, setAdmin] = useState(null);
  const [userType, setUserType] = useState(null); // 'admin' or 'trainer'

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    // Check trainer auth first
    const trainerToken = localStorage.getItem('trainerToken');
    const trainer = JSON.parse(localStorage.getItem('trainer')) || null;
    
    if (trainerToken && trainer) {
      setAuthState('ready');
      setAdmin(trainer);
      
      // Determine user type based on trainer_type
      const isVolunteer = trainer.trainer_type === 'Volunteer';
      const userTypeValue = isVolunteer ? 'volunteer' : 'trainer';
      setUserType(userTypeValue);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${trainerToken}`;
      
      // Only fetch trainers and activities for actual trainers on first load
      // Volunteers don't need this data
      if (!isVolunteer) {
        // Don't fetch on init - only fetch when needed to reduce API calls
        // fetchTrainers();
        // fetchActivities();
      }
    } else {
      // Check admin auth
      const adminToken = localStorage.getItem('adminToken');
      const adminData = JSON.parse(localStorage.getItem('adminData')) || null;
      
      if (adminToken && adminData) {
        setAuthState('ready');
        setAdmin(adminData);
        setUserType('admin');
        axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
        // Don't fetch on init - data loads when admin dashboard components mount
      } else {
        setAuthState('login');
      }
    }
  };

  const handleAdminLogin = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminData', JSON.stringify(response.data.admin));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        setAdmin(response.data.admin);
        setUserType('admin');
        setAuthState('ready');
        // Don't fetch on login - let admin dashboard load data as needed
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login error: ' + err.message 
      };
    }
  };

  const handleTrainerLogin = async (trainerName, password, isRegister) => {
    try {
      console.log(`[APP] Trainer login/register attempt:`, {trainerName, isRegister});
      
      if (isRegister) {
        // Registration
        console.log(`[APP] Calling registration endpoint...`);
        const response = await axios.post(`${API_URL}/auth/trainer/register`, {
          trainer_name: trainerName,
          password
        });

        console.log(`[APP] Registration response:`, response.data);
        return { 
          success: response.data.success, 
          message: response.data.message 
        };
      } else {
        // Login - call backend first
        console.log(`[APP] Calling login endpoint...`);
        const response = await axios.post(`${API_URL}/auth/trainer/login`, {
          trainer_name: trainerName,
          password
        });

        console.log(`[APP] Login response:`, response.data);

        if (response.data.success) {
          // Backend verified the password, now just save locally
          const trainerData = response.data.trainer;
          
          console.log(`[APP] Login successful, saving trainer data:`, trainerData);
          
          // Store token and trainer info
          localStorage.setItem('trainerToken', response.data.token);
          localStorage.setItem('trainer', JSON.stringify(trainerData));
          
          // Set auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          // Determine user type based on trainer_type
          const isVolunteer = trainerData.trainer_type === 'Volunteer';
          const actualUserType = isVolunteer ? 'volunteer' : 'trainer';
          
          // Update app state
          setAdmin(trainerData);
          setUserType(actualUserType);
          setAuthState('ready');
          
          // Don't fetch trainers/activities on login to reduce API calls
          // They're loaded lazily when needed (ActivityForm, ReportsPage, etc)
          
          return { success: true };
        } else {
          console.log(`[APP] Login failed:`, response.data.message);
          return { 
            success: false, 
            message: response.data.message 
          };
        }
      }
    } catch (err) {
      console.error(`[APP] Login error:`, err);
      console.error(`[APP] Error details:`, {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      return { 
        success: false, 
        message: err.response?.data?.message || 'Error: ' + err.message 
      };
    }
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
        // Keep activeTab as 'form' so the activity form stays visible after success
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
    // Clear both trainer and admin auth
    localStorage.removeItem('trainerToken');
    localStorage.removeItem('trainer');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    delete axios.defaults.headers.common['Authorization'];
    
    setAdmin(null);
    setUserType(null);
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
    return <MainLoginPage onAdminLogin={handleAdminLogin} onTrainerLogin={handleTrainerLogin} />;
  }

  // Admin dashboard
  if (userType === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // Volunteer dashboard
  if (userType === 'volunteer') {
    return <VolunteerDashboard volunteer={admin} onLogout={handleLogout} />;
  }

  // Trainer app - main trainer interface
  if (userType === 'trainer') {
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
                👤 {userType === 'admin' ? (admin?.username || 'Admin') : (admin?.name || 'Trainer')}
              </span>
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

        {activeTab === 'responsibilities' && (
          <Responsibilities />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 BMK Komet Activity Logger | Data stored in Google Sheets</p>
      </footer>
    </div>
    );
  }

  // Default/loading state
  return (
    <div className="App">
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    </div>
  );
}

export default App;
