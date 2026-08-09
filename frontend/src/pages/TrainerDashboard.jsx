import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityForm from '../components/ActivityForm';
import Responsibilities from '../components/Responsibilities';
import '../styles/TrainerDashboard.css';

function TrainerDashboard({ onLogout, error, setError, onActivitySubmit, trainers, currentTrainer }) {
  const [activeTab, setActiveTab] = useState('form');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
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
          <ActivityForm onSubmit={onActivitySubmit} trainers={trainers} currentTrainer={currentTrainer} />
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

export default TrainerDashboard;
