import React, { useState, useEffect } from 'react';
import '../styles/ActivitySummaryTable.css';

function ActivitySummaryTable({ trainerFilter, selectedMonth, trainerType = 'Assistant Trainer' }) {
  const [activities, setActivities] = useState([]);
  const [totals, setTotals] = useState({
    total_hours: 0,
    overtime: 0,
    undertime: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [trainerFilter, selectedMonth]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams();
      if (trainerFilter) {
        params.append('trainer', trainerFilter);
      }
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }

      const query = params.toString();
      const endpoint = query ? `/api/activities/summary?${query}` : '/api/activities/summary';

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success && result.data) {
        // Format activities: group by activity type and flatten
        const formattedActivities = [];
        let groupIndex = 0;

        for (const activity of result.data) {
          activity.group_index = groupIndex;
          activity.group_size = 1; // Will update after grouping
          formattedActivities.push(activity);
          groupIndex++;
        }

        // Group activities by type and calculate subtotals
        const grouped = {};
        const activitySubtotals = {}; // Store subtotals per activity type
        
        formattedActivities.forEach(act => {
          const key = act.Activity;
          if (!grouped[key]) {
            grouped[key] = [];
            activitySubtotals[key] = 0;
          }
          grouped[key].push(act);
          activitySubtotals[key] += (act.hours || 0);
        });

        // Flatten with merge info and add subtotal rows
        const flatActivities = [];
        for (const [actType, acts] of Object.entries(grouped)) {
          acts.forEach((act, idx) => {
            flatActivities.push({
              ...act,
              merge_size: acts.length,
              merge_index: idx,
              should_show_activity: idx === 0, // Show activity name only for first row in group
              activity_subtotal: activitySubtotals[actType]
            });
          });
          
          // Add subtotal row for this activity type
          flatActivities.push({
            is_subtotal: true,
            activity_type: actType,
            subtotal_hours: activitySubtotals[actType]
          });
        }

        setActivities(flatActivities);

        // Calculate totals
        if (result.totals) {
          setTotals(result.totals);
        }
      } else {
        setError(result.error || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity summary');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours) => {
    if (!hours && hours !== 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">Loading activity summary...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="activity-summary-table-container">
      <table className="activity-summary-table">
        <thead>
          <tr>
            {!trainerFilter && <th>Player</th>}
            <th>Activity</th>
            <th>Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>No of Hours</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {activities.length > 0 ? (
            activities.map((activity, idx) => {
              // Render subtotal rows
              if (activity.is_subtotal) {
                return (
                  <>
                    {trainerType !== 'Junior Trainer' && (
                      <tr key={idx} className="activity-subtotal-row">
                        <td colSpan={!trainerFilter ? 5 : 4} className="subtotal-label">
                          {activity.activity_type} Subtotal
                        </td>
                        <td className="hours subtotal-value">{formatHours(activity.subtotal_hours)}</td>
                        <td></td>
                      </tr>
                    )}
                  </>
                );
              }
              
              // Render regular activity rows
              return (
                <tr key={idx} className="activity-row">
                  {!trainerFilter && <td>{activity['Trainer Name']}</td>}
                  {activity.should_show_activity && (
                    <td
                      rowSpan={activity.merge_size}
                      className="activity-merged"
                    >
                      {activity.Activity}
                    </td>
                  )}
                  <td>{activity.Date}</td>
                  <td>{activity['Start Time']}</td>
                  <td>{activity['End Time']}</td>
                  <td className="hours">{formatHours(activity.hours || 0)}</td>
                  <td>{activity.Note || '-'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={!trainerFilter ? 7 : 6} className="no-data">No activities found</td>
            </tr>
          )}
          {activities.length > 0 && (
            <tr className="totals-row">
              <td colSpan={!trainerFilter ? 5 : 4} className="totals-label">Total</td>
              <td className="hours totals-value">{formatHours(totals.total_hours)}</td>
              <td></td>
            </tr>
          )}
          {activities.length > 0 && totals.overtime > 0 && (
            <tr className="overtime-row">
              <td colSpan={!trainerFilter ? 5 : 4} className="totals-label">Overtime</td>
              <td className="hours totals-value overtime">{formatHours(totals.overtime)}</td>
              <td></td>
            </tr>
          )}
          {activities.length > 0 && totals.undertime > 0 && trainerFilter && trainerType !== 'Junior Trainer' && (
            <tr className="undertime-row">
              <td colSpan={!trainerFilter ? 5 : 4} className="totals-label">Shortfall</td>
              <td className="hours totals-value undertime">{formatHours(totals.undertime)}</td>
              <td></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ActivitySummaryTable;
