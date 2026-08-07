import React from 'react';
import '../styles/ActivityHistoryTable.css';

function ActivityHistoryTable({ activities = [], date = '' }) {
  if (!activities || activities.length === 0) {
    return null;
  }

  const formatHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '0:00';
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const durationMinutes = (endH - startH) * 60 + (endM - startM);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '0:00';
    }
  };

  // Group activities by type
  const groupedActivities = {};
  activities.forEach((activity) => {
    const type = activity.Activity;
    if (!groupedActivities[type]) {
      groupedActivities[type] = [];
    }
    groupedActivities[type].push(activity);
  });

  // Calculate totals
  let totalMinutes = 0;
  activities.forEach((activity) => {
    try {
      const [startH, startM] = (activity['Start Time'] || '0:0').split(':').map(Number);
      const [endH, endM] = (activity['End Time'] || '0:0').split(':').map(Number);
      const durationMinutes = (endH - startH) * 60 + (endM - startM);
      totalMinutes += durationMinutes;
    } catch {
      // Ignore invalid times
    }
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  return (
    <div className="activity-history-container">
      <h3 className="history-title">📋 Activity History - {date}</h3>
      <div className="activity-history-table-wrapper">
        <table className="activity-history-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedActivities).map(([activityType, actList]) =>
              actList.map((activity, idx) => (
                <tr key={`${activityType}-${idx}`}>
                  {idx === 0 && (
                    <td rowSpan={actList.length} className="activity-type-cell">
                      {activityType}
                    </td>
                  )}
                  <td>{activity['Start Time']}</td>
                  <td>{activity['End Time']}</td>
                  <td className="duration">
                    {formatHours(activity['Start Time'], activity['End Time'])}
                  </td>
                </tr>
              ))
            )}
            <tr className="total-row">
              <td colSpan="3" className="total-label">Total Hours</td>
              <td className="duration total">
                {totalHours}:{totalMins.toString().padStart(2, '0')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActivityHistoryTable;
