import React from 'react';
import '../styles/Responsibilities.css';

function Responsibilities() {
  return (
    <div className="responsibilities-container">
      <h2>📋 Responsibilities</h2>
      
      <div className="responsibilities-content">
        <div className="responsibility-card">
          <div className="card-icon">📅</div>
          <h3>Daily Logging</h3>
          <p>Log your coaching activities daily to maintain accurate records of your work and training sessions.</p>
        </div>

        <div className="responsibility-card">
          <div className="card-icon">⏰</div>
          <h3>Time Tracking</h3>
          <p>Record accurate start and end times for each activity to track your coaching hours and workload.</p>
        </div>

        <div className="responsibility-card">
          <div className="card-icon">🎯</div>
          <h3>Activity Types</h3>
          <p>Categorize your work properly - Training, Tournament, Meeting, or Other - for accurate reporting.</p>
        </div>

        <div className="responsibility-card">
          <div className="card-icon">📝</div>
          <h3>Documentation</h3>
          <p>Add notes to your activities to provide context and details about your coaching sessions.</p>
        </div>

        <div className="responsibility-card">
          <div className="card-icon">✅</div>
          <h3>Accuracy</h3>
          <p>Ensure all entries are accurate and up-to-date. Review your activity log regularly.</p>
        </div>

        <div className="responsibility-card">
          <div className="card-icon">🔔</div>
          <h3>Compliance</h3>
          <p>Follow the organization's guidelines and reporting requirements for all activities.</p>
        </div>
      </div>

      <div className="responsibilities-guidelines">
        <h3>📌 Important Guidelines</h3>
        <ul>
          <li>Log activities on the same day they occur</li>
          <li>Be precise with start and end times</li>
          <li>Use clear and descriptive activity notes</li>
          <li>Review your monthly activity summary</li>
          <li>Contact admin if you need to modify past entries</li>
        </ul>
      </div>
    </div>
  );
}

export default Responsibilities;
