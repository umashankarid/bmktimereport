import React from 'react';
import '../styles/Responsibilities.css';

function Responsibilities({ currentTrainer }) {
  const isJunior = currentTrainer?.trainer_type === 'Junior Trainer';

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

      {/* Tournament Responsibilities - Assistant Trainers */}
      {!isJunior && (
        <div className="tournament-responsibilities">
          <h3>🏸 Club Tournament Responsibilities</h3>
          <p className="tournament-intro">
            Assistant coaches play a key role in making club tournaments run smoothly. Below are your duties before, during, and after match days.
          </p>

          <div className="tournament-section">
            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🔧</span>
                <h4>Before Tournament Day</h4>
              </div>
              <ul>
                <li>Help set up and fix the courts (nets, lines, posts)</li>
                <li>Set up the match help desk (scoring sheets, schedules, pens)</li>
                <li>Set up speakers and audio equipment</li>
                <li>Arrange tables and chairs for players, officials, and spectators</li>
                <li>Verify all equipment is in working condition</li>
              </ul>
            </div>

            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🏆</span>
                <h4>During Match Day</h4>
              </div>
              <ul>
                <li>Coach club players under the head coach's instructions</li>
                <li>Support players between matches with feedback and warm-up</li>
                <li>Manage the live streaming of matches</li>
                <li>Assist at the match help desk when needed</li>
                <li>Help maintain the tournament schedule and flow</li>
              </ul>
            </div>

            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🧹</span>
                <h4>End of Match Day</h4>
              </div>
              <ul>
                <li>Help tidy up the courts (remove nets, clean up)</li>
                <li>Pack down the match help desk</li>
                <li>Disassemble speakers and audio equipment</li>
                <li>Return tables, chairs, and equipment to storage</li>
                <li>Ensure the venue is left clean and in order</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
