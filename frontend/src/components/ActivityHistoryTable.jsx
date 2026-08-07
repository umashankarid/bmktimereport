import React, { useState } from 'react';
import '../styles/ActivityHistoryTable.css';
import TimeInput from './TimeInput';

function ActivityHistoryTable({ activities = [], date = '' }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState({});

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

  const handleEditClick = (index, activity) => {
    setEditingIndex(index);
    setEditData({
      start_time: activity['Start Time'],
      end_time: activity['End Time']
    });
  };

  const handleSaveEdit = async (index, activity) => {
    try {
      // Call backend to update activity
      const response = await fetch(
        `/api/activities/${encodeURIComponent(activity['Trainer Name'])}/${encodeURIComponent(date)}/${encodeURIComponent(activity.Activity)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_start_time: activity['Start Time'],
            old_end_time: activity['End Time'],
            start_time: editData.start_time,
            end_time: editData.end_time,
            note: activity.Note || ''
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        setEditingIndex(null);
        // Reload page or refresh data
        window.location.reload();
      } else {
        alert('Failed to update activity');
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      alert('Error updating activity');
    }
  };

  const handleDeleteClick = async (activity) => {
    if (!window.confirm(`Delete ${activity.Activity} (${activity['Start Time']}-${activity['End Time']})?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/activities/${encodeURIComponent(activity['Trainer Name'])}/${encodeURIComponent(date)}/${encodeURIComponent(activity.Activity)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = await response.json();
      if (result.success) {
        window.location.reload();
      } else {
        alert('Failed to delete activity');
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Error deleting activity');
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

  let activityIndex = 0;

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedActivities).map(([activityType, actList]) =>
              actList.map((activity, idx) => {
                const currentIndex = activityIndex++;
                const isEditing = editingIndex === currentIndex;

                return (
                  <tr key={`${activityType}-${idx}`}>
                    {idx === 0 && (
                      <td rowSpan={actList.length} className="activity-type-cell">
                        {activityType}
                      </td>
                    )}
                    <td>
                      {isEditing ? (
                        <TimeInput
                          value={editData.start_time}
                          onChange={(e) =>
                            setEditData({ ...editData, start_time: e.target.value })
                          }
                        />
                      ) : (
                        activity['Start Time']
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <TimeInput
                          value={editData.end_time}
                          onChange={(e) =>
                            setEditData({ ...editData, end_time: e.target.value })
                          }
                        />
                      ) : (
                        activity['End Time']
                      )}
                    </td>
                    <td className="duration">
                      {isEditing
                        ? formatHours(editData.start_time, editData.end_time)
                        : formatHours(activity['Start Time'], activity['End Time'])}
                    </td>
                    <td className="actions-cell">
                      {isEditing ? (
                        <>
                          <button
                            className="btn-action btn-save-edit"
                            onClick={() => handleSaveEdit(currentIndex, activity)}
                            title="Save changes"
                          >
                            ✓
                          </button>
                          <button
                            className="btn-action btn-cancel-edit"
                            onClick={() => setEditingIndex(null)}
                            title="Cancel editing"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleEditClick(currentIndex, activity)}
                            title="Edit this entry"
                          >
                            ✎
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => handleDeleteClick(activity)}
                            title="Delete this entry"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="total-row">
              <td colSpan="3" className="total-label">Total Hours</td>
              <td className="duration total">
                {totalHours}:{totalMins.toString().padStart(2, '0')}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActivityHistoryTable;
