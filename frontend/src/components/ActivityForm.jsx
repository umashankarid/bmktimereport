import React, { useState, useEffect } from 'react';
import '../styles/ActivityForm.css';
import TimeInput from './TimeInput';

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
      
      console.log('🔍 API Response success:', result.success, 'has data:', !!result.data);
      
      if (result.success && result.data) {
        console.log('✅ Found existing activities:', result.data);
        setExistingActivities(result.data);
        
        console.log('🔄 Starting to group activities...');
        // Group activities by type and collect all time slots
        const editing = {};
        result.data.forEach((act, idx) => {
          console.log(`  [${idx}] Processing: ${act.Activity} ${act['Start Time']}-${act['End Time']}`);
          const actType = act.Activity;
          if (!editing[actType]) {
            editing[actType] = {
              time_slots: [],
              note: act.Note || ''
            };
          }
          // Add time slot to the activity
          editing[actType].time_slots.push({
            start_time: act['Start Time'],
            end_time: act['End Time']
          });
        });
        console.log('📊 Grouped editing activities:', editing);
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
        newSelected[activity] = [{ start_time: '', end_time: '' }];
      }
      return newSelected;
    });
  };

  const handleAddTimeSlot = (activity) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activity]: [...(prev[activity] || []), { start_time: '', end_time: '' }]
    }));
  };

  const handleRemoveNewTimeSlot = (activity, slotIndex) => {
    setSelectedActivities(prev => {
      const slots = prev[activity].filter((_, idx) => idx !== slotIndex);
      if (slots.length === 0) {
        const newSelected = { ...prev };
        delete newSelected[activity];
        return newSelected;
      }
      return {
        ...prev,
        [activity]: slots
      };
    });
  };

  const handleTimeSlotChange = (activity, slotIndex, field, value) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activity]: prev[activity].map((slot, idx) =>
        idx === slotIndex ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleExistingActivityChange = (activity, field, slotIdx, value) => {
    setEditingActivities(prev => {
      const updated = { ...prev };
      if (!updated[activity].time_slots[slotIdx]) {
        updated[activity].time_slots[slotIdx] = {};
      }
      updated[activity].time_slots[slotIdx][field] = value;
      return updated;
    });
  };

  const handleRemoveTimeSlot = (activity, slotIdx) => {
    setEditingActivities(prev => {
      const updated = { ...prev };
      updated[activity].time_slots.splice(slotIdx, 1);
      // If no time slots left, remove the activity
      if (updated[activity].time_slots.length === 0) {
        delete updated[activity];
      }
      return updated;
    });
  };

  const handleUpdateActivity = async (activity) => {
    try {
      setSubmitting(true);
      const editedData = editingActivities[activity];
      
      if (!editedData.time_slots || editedData.time_slots.length === 0) {
        setError(`No time slots for ${activity}`);
        setSubmitting(false);
        return;
      }

      // Validate all time slots
      for (let i = 0; i < editedData.time_slots.length; i++) {
        const slot = editedData.time_slots[i];
        if (!slot.start_time || !slot.end_time) {
          setError(`Please set start and end times for all time slots of ${activity}`);
          setSubmitting(false);
          return;
        }
      }

      console.log(`📝 Updating ${activity} with ${editedData.time_slots.length} time slot(s)...`);
      
      // For each time slot, find the corresponding activity in existingActivities and update it
      const existingActivityRecords = existingActivities.filter(a => a.Activity === activity);
      
      for (let i = 0; i < editedData.time_slots.length; i++) {
        const slot = editedData.time_slots[i];
        const existingRecord = existingActivityRecords[i];
        
        if (!existingRecord) {
          console.warn(`No existing record for time slot ${i} of ${activity}`);
          continue;
        }

        // Use the original start/end time to identify the record
        const response = await fetch(
          `/api/activities/${encodeURIComponent(formData.trainer_name)}/${encodeURIComponent(formData.date)}/${encodeURIComponent(activity)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              old_start_time: existingRecord['Start Time'],
              old_end_time: existingRecord['End Time'],
              start_time: slot.start_time,
              end_time: slot.end_time,
              note: editedData.note || formData.note
            })
          }
        );

        const result = await response.json();
        
        if (!result.success) {
          setError(result.message || `Failed to update time slot ${i + 1} of ${activity}`);
          setSubmitting(false);
          return;
        }
      }
      
      setSuccess(`✓ Updated ${activity}`);
      // Refresh existing activities
      await fetchExistingActivities();
      setTimeout(() => setSuccess(''), 3000);
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
      setSubmitting(true);
      console.log(`🗑️  Deleting ${activity}...`);
      
      // Call backend API to delete from Google Sheets
      const response = await fetch(
        `/api/activities/${encodeURIComponent(formData.trainer_name)}/${encodeURIComponent(formData.date)}/${encodeURIComponent(activity)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state after successful deletion
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
      } else {
        setError(result.message || 'Failed to delete activity');
      }
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
    
    // Validate at least one new activity is selected
    const selectedCount = Object.keys(selectedActivities).length;
    if (selectedCount === 0 && existingActivities.length === 0) {
      setError('Please select at least one activity or you have no existing activities');
      return;
    }

    // Validate all time slots have times
    for (const [activityName, slots] of Object.entries(selectedActivities)) {
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].start_time || !slots[i].end_time) {
          setError(`Please set start and end times for all time slots of ${activityName}`);
          return;
        }
        
        // Validate end time is after start time
        const [startH, startM] = slots[i].start_time.split(':').map(Number);
        const [endH, endM] = slots[i].end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        if (endMinutes <= startMinutes) {
          setError(`Invalid time range for ${activityName} (Slot ${i + 1}): End time must be after start time`);
          return;
        }
      }
    }

    if (selectedCount === 0) {
      setSuccess('✓ No new activities to log');
      setSelectedActivities({});
      return;
    }

    setSubmitting(true);
    try {
      // Prepare submission data - flatten all time slots
      const allActivities = [];
      for (const [activityName, slots] of Object.entries(selectedActivities)) {
        for (const slot of slots) {
          allActivities.push({
            activity: activityName,
            start_time: slot.start_time,
            end_time: slot.end_time
          });
        }
      }

      const submissionData = {
        trainer_name: formData.trainer_name,
        date: formData.date,
        note: formData.note,
        activities: allActivities
      };

      console.log('📤 Submitting activities:', submissionData);
      const result = await onSubmit(submissionData);
      
      if (result.success) {
        const activityList = result.activities?.join(', ') || '';
        setSuccess(`✓ Logged ${result.count} activity/activities: ${activityList}`);
        
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
                📝 Today's Activities ({existingActivities.length} session{existingActivities.length !== 1 ? 's' : ''})
              </label>
              <div className="existing-activities-list">
                {Object.entries(editingActivities).map(([activityType, activityData]) => (
                    <div key={activityType} className="existing-activity-card">
                      <div className="activity-header">
                        <h4>{activityType}</h4>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDeleteActivity(activityType)}
                          title="Delete all time slots for this activity"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {/* Display all time slots for this activity */}
                      <div className="activity-time-slots-edit">
                        {activityData.time_slots && activityData.time_slots.map((slot, slotIdx) => (
                          <div key={slotIdx} className="activity-times-edit">
                            <div className="time-input">
                              <TimeInput
                                label="Start"
                                value={slot.start_time || ''}
                                onChange={(e) =>
                                  handleExistingActivityChange(activityType, 'start_time', slotIdx, e.target.value)
                                }
                              />
                            </div>

                            <div className="time-input">
                              <TimeInput
                                label="End"
                                value={slot.end_time || ''}
                                onChange={(e) =>
                                  handleExistingActivityChange(activityType, 'end_time', slotIdx, e.target.value)
                                }
                              />
                            </div>

                            {activityData.time_slots.length > 1 && (
                              <button
                                type="button"
                                className="btn-remove-time-slot"
                                onClick={() => handleRemoveTimeSlot(activityType, slotIdx)}
                                title="Remove this time slot"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        className="btn-save"
                        onClick={() => handleUpdateActivity(activityType)}
                        disabled={submitting}
                      >
                        {submitting ? '💾...' : '💾 Save'}
                      </button>
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

                    {/* Time slots appear when activity is selected */}
                    {selectedActivities[activity] && (
                      <div className="activity-time-slots">
                        {selectedActivities[activity].map((slot, slotIndex) => (
                          <div key={slotIndex} className="time-slot">
                            <div className="time-slot-inputs">
                              <div className="time-input">
                                <TimeInput
                                  label="Start"
                                  value={slot.start_time}
                                  onChange={(e) =>
                                    handleTimeSlotChange(activity, slotIndex, 'start_time', e.target.value)
                                  }
                                  required
                                />
                              </div>

                              <div className="time-input">
                                <TimeInput
                                  label="End"
                                  value={slot.end_time}
                                  onChange={(e) =>
                                    handleTimeSlotChange(activity, slotIndex, 'end_time', e.target.value)
                                  }
                                  required
                                />
                              </div>

                              {selectedActivities[activity].length > 1 && (
                                <button
                                  type="button"
                                  className="btn-remove-slot"
                                  onClick={() => handleRemoveNewTimeSlot(activity, slotIndex)}
                                  title="Remove this time slot"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {slotIndex === selectedActivities[activity].length - 1 && (
                              <button
                                type="button"
                                className="btn-add-slot"
                                onClick={() => handleAddTimeSlot(activity)}
                                title="Add another time slot for this activity"
                              >
                                + Add time slot
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-activities">No activities available</p>
              )}
            </div>
          </div>

          {/* Summary of selected activities */}
          {Object.keys(selectedActivities).length > 0 && (
            <div className="selected-summary">
              <h3>New Activities ({Object.keys(selectedActivities).length}):</h3>
              <ul>
                {Object.entries(selectedActivities).map(([activity, slots]) => (
                  <li key={activity}>
                    {activity}: {slots.map(s => `${s.start_time}-${s.end_time}`).join(', ')}
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
              {submitting ? 'Logging...' : `Log ${Object.keys(selectedActivities).length} Activity/ies`}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default ActivityForm;
