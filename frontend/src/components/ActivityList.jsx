import React from 'react';
import '../styles/ActivityList.css';

function ActivityList({ activities, loading, onRefresh, currentTrainer }) {
  if (loading) {
    return (
      <div className="activity-list-container">
        <div className="loading">
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  // Filter activities for the logged-in user
  const userActivities = (activities || []).filter(activity => {
    const trainerName = activity['Trainer Name'] || activity.trainer_name || '';
    const currentName = currentTrainer?.name || '';
    return trainerName.toLowerCase() === currentName.toLowerCase();
  });

  if (!userActivities || userActivities.length === 0) {
    return (
      <div className="activity-list-container">
        <div className="empty-state">
          <p>No activities logged yet. Start by logging your first activity!</p>
        </div>
      </div>
    );
  }

  // Sort activities by date (most recent first)
  const sortedActivities = [...userActivities].reverse();

  // Calculate duration from start and end times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    return duration > 0 ? `${duration} min` : '-';
  };

  // Group activities by date
  const groupedByDate = sortedActivities.reduce((groups, activity) => {
    const date = activity.Date || activity.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="activity-list-container">
      <div className="list-header">
        <div className="header-info">
          <h2>📋 Your Activity History</h2>
          <p className="trainer-filter">Showing activities for: <strong>{currentTrainer?.name}</strong></p>
        </div>
        <button className="btn btn-refresh" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {/* Activities by Date */}
      {sortedDates.map(date => (
        <div key={date} className="date-group">
          <h3 className="date-header">
            📅 {new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div className="date-activities">
            {groupedByDate[date].map((activity, index) => (
              <div key={index} className="activity-card">
                <div className="activity-header">
                  <span className={`badge badge-${activity.Activity?.toLowerCase() || 'default'}`}>
                    {activity.Activity || activity.activity}
                  </span>
                  <span className="time-range">
                    {activity['Start Time'] || activity.start_time} - {activity['End Time'] || activity.end_time}
                  </span>
                </div>
                
                <div className="activity-details">
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">
                      {calculateDuration(
                        activity['Start Time'] || activity.start_time,
                        activity['End Time'] || activity.end_time
                      )}
                    </span>
                  </div>
                  {(activity.Note || activity.note) && (
                    <div className="detail-item">
                      <span className="label">Note:</span>
                      <span className="value">{activity.Note || activity.note}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="list-footer">
        <p>Total: {userActivities.length} activities</p>
      </div>
    </div>
  );
}

export default ActivityList;
