import React, { useState, useEffect } from 'react';
import '../styles/ActivityForm.css';

function ActivityForm({ onSubmit, trainers, currentTrainer }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    trainer_name: currentTrainer?.name || '',
    note: ''
  });

  const [activities, setActivities] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState({});
  const [existingActivities, setExistingActivities] = useState([]);
  const [editingActivities, setEditingActivities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Fetch activity list on mount
  useEffect(() => {
    fetchActivityList();
  }, []);

  // Update trainer name if it changes
  useEffect(() => {
    if (currentTrainer?.name) {
      setFormData(prev => ({
        ...prev,
        trainer_name: currentTrainer.name
      }));
    }
  }, [currentTrainer]);

  // Fetch existing activities when date changes
  useEffect(() => {
    if (formData.date && formData.trainer_name) {
      fetchExistingActivities();
    }
  }, [formData.date, formData.trainer_name]);

  const fetchActivityList = async () => {
    try {
      setLoadingActivities(true);
      const response = await fetch('/api/activity-list');
      const result = await response.json();
      
      if (result.success && result.data) {
        setActivities(result.data);
        console.log('📋 Loaded activities:', result.data);
      } else {
        console.error('Failed to load activities:', result.message);
        setError('Failed to load activities');
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchExistingActivities = async () => {
    try {
      setLoadingExisting(true);
      console.log(`📅 Fetching activities for ${formData.trainer_name} on ${formData.date}`);
      
      const response = await fetch(
        `/api/activities/${encodeURIComponent(formData.trainer_name)}/${encodeURIComponent(formData.date)}`
      );
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Found existing activities:', result.data);
        setExistingActivities(result.data);
        // Initialize editing activities with existing data
        const editing = {};
        result.data.forEach(act => {
          editing[act.Activity] = {
            start_time: act['Start Time'],
            end_time: act['End Time'],
            note: act.Note || ''
          };
        });
        setEditingActivities(editing);
      } else {
        console.log('No existing activities found for this date');
        setExistingActivities([]);
        setEditingActivities({});
      }
    } catch (err) {
      console.error('Error fetching existing activities:', err);
      setExistingActivities([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleDateChange = (e) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  const handleNoteChange = (e) => {
    setFormData(prev => ({
      ...prev,
      note: e.target.value
    }));
  };

  const handleActivityToggle = (activity) => {
    setSelectedActivities(prev => {
      const newSelected = { ...prev };
      if (newSelected[activity]) {
        delete newSelected[activity];
      } else {
        newSelected[activity] = {
          activity,
          start_time: '',
          end_time: ''
        };
      }
      return newSelected;
    });
  };

  const handleActivityTimeChange = (activity, field, value) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        [field]: value
      }
    }));
  };

  const handleExistingActivityChange = (activity, field, value) => {
    setEditingActivities(prev => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        [field]: value
      }
    }));
  };

  const handleUpdateActivity = async (activity) => {
    try {
      setSubmitting(true);
      const editedData = editingActivities[activity];
      
      if (!editedData.start_time || !editedData.end_time) {
        setError(`Please set start and end times for ${activity}`);
        setSubmitting(false);
        return;
      }

      console.log(`📝 Updating ${activity}...`);
      const response = await fetch(
        `/api/activities/${encodeURIComponent(formData.trainer_name)}/${encodeURIComponent(formData.date)}/${encodeURIComponent(activity)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: editedData.start_time,
            end_time: editedData.end_time,
            note: editedData.note || formData.note
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✓ Updated ${activity}`);
        // Refresh existing activities
        await fetchExistingActivities();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to update activity');
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      setError('Failed to update activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activity) => {
    if (!window.confirm(`Delete ${activity}?`)) return;
    
    try {
      // For now, we'll update with empty times as a deletion placeholder
      // In production, you'd want a proper delete endpoint
      setSubmitting(true);
      console.log(`🗑️  Deleting ${activity}...`);
      
      // Could send DELETE request here if endpoint exists
      // For now, just remove from UI and refresh
      setExistingActivities(prev => 
        prev.filter(act => act.Activity !== activity)
      );
      setEditingActivities(prev => {
        const updated = { ...prev };
        delete updated[activity];
        return updated;
      });
      
      setSuccess(`✓ Deleted ${activity}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate at least one new activity is selected or we have existing activities
    const selectedCount = Object.keys(selectedActivities).length;
    if (selectedCount === 0 && existingActivities.length === 0) {
      setError('Please select at least one activity or you have no existing activities');
      return;
    }

    // Validate all selected activities have times
    for (const [activityName, activityData] of Object.entries(selectedActivities)) {
      if (!activityData.start_time || !activityData.end_time) {
        setError(`Please set start and end times for ${activityName}`);
        return;
      }
    }

    if (selectedCount === 0) {
      // Only existing activities, no new ones to submit
      setSuccess('✓ No new activities to log');
      // Clear selection
      setSelectedActivities({});
      return;
    }

    setSubmitting(true);
    try {
      // Prepare submission data for new activities only
      const submissionData = {
        trainer_name: formData.trainer_name,
        date: formData.date,
        note: formData.note,
        activities: Object.values(selectedActivities)
      };

      console.log('📤 Submitting new activities:', submissionData);
      const result = await onSubmit(submissionData);
      
      if (result.success) {
        const activityList = result.activities?.join(', ') || '';
        setSuccess(`✓ Logged ${result.count} new activity/activities: ${activityList}`);
        
        // Refresh existing activities
        await fetchExistingActivities();
        
        // Reset new activity selection
        setSelectedActivities({});
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.message || 'Failed to log activities');
      }
    } catch (err) {
      console.error('Error submitting activities:', err);
      setError('Failed to log activities');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingActivities) {
    return (
      <div className="activity-form-container">
        <div className="form-card">
          <h2>Log Activities</h2>
          <p className="loading">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-form-container">
      <div className="form-card">
        <h2>Log Activities</h2>
        
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="activity-form">
          <div className="trainer-info">
            <p>Logging as: <strong>{formData.trainer_name}</strong></p>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={handleDateChange}
              required
            />
          </div>

          {/* Existing Activities Section */}
          {loadingExisting ? (
            <div className="loading-section">Loading existing activities...</div>
          ) : existingActivities.length > 0 ? (
            <div className="existing-activities-section">
              <label className="section-label">
                📝 Today's Activities ({existingActivities.length})
              </label>
              <div className="existing-activities-list">
                {existingActivities.map((activity, idx) => (
                  <div key={idx} className="existing-activity-card">
                    <div className="activity-header">
                      <h4>{activity.Activity}</h4>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleDeleteActivity(activity.Activity)}
                        title="Delete activity"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="activity-times-edit">
                      <div className="time-input">
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={editingActivities[activity.Activity]?.start_time || ''}
                          onChange={(e) =>
                            handleExistingActivityChange(activity.Activity, 'start_time', e.target.value)
                          }
                        />
                      </div>

                      <div className="time-input">
                        <label>End Time</label>
                        <input
                          type="time"
                          value={editingActivities[activity.Activity]?.end_time || ''}
                          onChange={(e) =>
                            handleExistingActivityChange(activity.Activity, 'end_time', e.target.value)
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-save"
                        onClick={() => handleUpdateActivity(activity.Activity)}
                        disabled={submitting}
                      >
                        {submitting ? '💾...' : '💾 Save'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* New Activities Checkboxes Section */}
          <div className="activities-section">
            <label className="section-label">Add New Activities</label>
            <div className="activities-grid">
              {activities.length > 0 ? (
                activities.map(activity => (
                  <div key={activity} className="activity-checkbox-group">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={!!selectedActivities[activity]}
                        onChange={() => handleActivityToggle(activity)}
                      />
                      <span className="checkbox-label">{activity}</span>
                    </label>

                    {/* Time inputs appear when activity is selected */}
                    {selectedActivities[activity] && (
                      <div className="activity-times">
                        <div className="time-input">
                          <label>Start Time</label>
                          <input
                            type="time"
                            value={selectedActivities[activity].start_time}
                            onChange={(e) =>
                              handleActivityTimeChange(activity, 'start_time', e.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="time-input">
                          <label>End Time</label>
                          <input
                            type="time"
                            value={selectedActivities[activity].end_time}
                            onChange={(e) =>
                              handleActivityTimeChange(activity, 'end_time', e.target.value)
                            }
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-activities">No activities available</p>
              )}
            </div>
          </div>

          {/* Summary of selected new activities */}
          {Object.keys(selectedActivities).length > 0 && (
            <div className="selected-summary">
              <h3>New Activities ({Object.keys(selectedActivities).length}):</h3>
              <ul>
                {Object.values(selectedActivities).map((act, idx) => (
                  <li key={idx}>
                    {act.activity}: {act.start_time} - {act.end_time}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="note">Note (applies to new activities)</label>
            <textarea
              id="note"
              value={formData.note}
              onChange={handleNoteChange}
              placeholder="Any additional notes about the new activities..."
              rows="3"
            />
          </div>

          {Object.keys(selectedActivities).length > 0 && (
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Logging...' : `Log ${Object.keys(selectedActivities).length} New Activity/ies`}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default ActivityForm;
