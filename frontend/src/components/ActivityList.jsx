import React from 'react';
import '../styles/ActivityList.css';

function ActivityList({ activities, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="activity-list-container">
        <div className="loading">
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="activity-list-container">
        <div className="empty-state">
          <p>No activities logged yet. Start by logging your first activity!</p>
        </div>
      </div>
    );
  }

  // Sort activities by date (most recent first)
  const sortedActivities = [...activities].reverse();

  // Calculate duration from start and end times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    return duration > 0 ? `${duration} min` : '-';
  };

  return (
    <div className="activity-list-container">
      <div className="list-header">
        <h2>Activity History</h2>
        <button className="btn btn-refresh" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="table-responsive">
        <table className="activities-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Trainer Name</th>
              <th>Activity</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {sortedActivities.map((activity, index) => (
              <tr key={index} className="activity-row">
                <td className="date-cell">
                  {new Date(activity.Date || activity.date).toLocaleDateString()}
                </td>
                <td className="trainer-cell">
                  {activity['Trainer Name'] || activity.trainer_name}
                </td>
                <td className="activity-cell">
                  <span className={`badge badge-${activity.Activity?.toLowerCase() || 'default'}`}>
                    {activity.Activity || activity.activity}
                  </span>
                </td>
                <td className="time-cell">
                  {activity['Start Time'] || activity.start_time}
                </td>
                <td className="time-cell">
                  {activity['End Time'] || activity.end_time}
                </td>
                <td className="duration-cell">
                  {calculateDuration(
                    activity['Start Time'] || activity.start_time,
                    activity['End Time'] || activity.end_time
                  )}
                </td>
                <td className="note-cell">
                  {activity.Note || activity.note || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="list-footer">
        <p>Showing {activities.length} recent activities</p>
      </div>
    </div>
  );
}

export default ActivityList;
