import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import MainLoginPage from './pages/MainLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/ReportsPage';
import VolunteerDashboard from './pages/VolunteerDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import ResetPassword from './pages/ResetPassword';
import ActivityForm from './components/ActivityForm';
import ActivityHistoryView from './components/ActivityHistoryView';
import Responsibilities from './components/Responsibilities';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function AppContent() {
  const [authState, setAuthState] = useState('checking'); // checking, login, ready
  const [activities, setActivities] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState(null);
  const [userType, setUserType] = useState(null); // 'admin', 'trainer', or 'volunteer'
  const navigate = useNavigate();

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
      
      // Route based on user type
      if (isVolunteer) {
        navigate('/volunteer');
      } else {
        navigate('/trainer');
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
        navigate('/admin');
      } else {
        setAuthState('login');
        navigate('/login');
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
        navigate('/admin');
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
        console.log(`[APP] Calling login endpoint...`);
        const response = await axios.post(`${API_URL}/auth/trainer/login`, {
          trainer_name: trainerName,
          password
        });

        console.log(`[APP] Login response:`, response.data);

        if (response.data.success) {
          const trainerData = response.data.trainer;
          
          console.log(`[APP] Login successful, saving trainer data:`, trainerData);
          
          localStorage.setItem('trainerToken', response.data.token);
          localStorage.setItem('trainer', JSON.stringify(trainerData));
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          const isVolunteer = trainerData.trainer_type === 'Volunteer';
          const actualUserType = isVolunteer ? 'volunteer' : 'trainer';
          
          setAdmin(trainerData);
          setUserType(actualUserType);
          setAuthState('ready');
          
          // Navigate based on user type
          if (isVolunteer) {
            navigate('/volunteer');
          } else {
            navigate('/trainer');
          }
          
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
        return { success: true };
      } else {
        console.log('❌ API returned success=false:', response.data.message);
        setError(response.data.message || 'Failed to log activity');
        return { success: false, error: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error logging activity';
      console.error('❌ Error submitting activity:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleLogout = () => {
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
    navigate('/login');
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

  return (
    <Routes>
      <Route path="/login" element={<MainLoginPage onAdminLogin={handleAdminLogin} onTrainerLogin={handleTrainerLogin} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/*" element={<AdminDashboard onLogout={handleLogout} />} />
      <Route path="/trainer" element={<TrainerDashboard onLogout={handleLogout} error={error} setError={setError} onActivitySubmit={handleActivitySubmit} trainers={trainers} currentTrainer={admin} />} />
      <Route path="/volunteer" element={<VolunteerDashboard volunteer={admin} onLogout={handleLogout} />} />
      <Route path="/" element={<Navigate to={userType === 'admin' ? '/admin' : userType === 'volunteer' ? '/volunteer' : userType === 'trainer' ? '/trainer' : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
