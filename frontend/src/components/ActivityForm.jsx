import React, { useState, useEffect } from 'react';
import '../styles/ActivityForm.css';
import TimeInput from './TimeInput';
import ActivityHistoryTable from './ActivityHistoryTable';
import DatePickerCalendar from './DatePickerCalendar';

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
  const [frozenDates, setFrozenDates] = useState([]);

  // Fetch activity list on mount
  useEffect(() => {
    fetchActivityList();
    fetchFrozenDates();
  }, [currentTrainer?.trainer_type]);

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
        // Filter activities based on trainer type
        let filteredActivities = result.data;
        if (currentTrainer?.trainer_type === 'Junior Trainer') {
          // Junior Trainers only see "Training"
          filteredActivities = result.data.filter(activity => activity === 'Training');
        }
        
        setActivities(filteredActivities);
        console.log('📋 Loaded activities:', filteredActivities, 'Trainer type:', currentTrainer?.trainer_type);
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

  const fetchFrozenDates = async () => {
    try {
      const token = localStorage.getItem('trainerToken') || localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/freeze/dates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setFrozenDates(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching frozen dates:', err);
    }
  };

  const isFrozen = (date) => {
    return frozenDates.some(freeze => {
      const freezeValue = freeze['Date/Month'];
      const freezeType = freeze['Freeze Type'];
      
      if (freezeType === 'Date' && freezeValue === date) {
        return true;
      }
      
      if (freezeType === 'Month') {
        const monthPart = date.substring(0, 7);
        return freezeValue === monthPart;
      }
      
      return false;
    });
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

  const handleDateChange = (dateString) => {
    setFormData(prev => ({
      ...prev,
      date: dateString
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

  // Validate time slot - check for invalid range or overlaps
  const validateTimeSlot = (slot, allSlots, existingActivities) => {
    // Check if times are set
    if (!slot.start_time || !slot.end_time) {
      return null; // Not an error, just incomplete
    }

    // Check if end time is after start time
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return 'Invalid time range: End time must be after start time';
    }

    // Check for overlaps with new time slots
    for (let i = 0; i < allSlots.length; i++) {
      if (allSlots[i] === slot || !allSlots[i].start_time || !allSlots[i].end_time) {
        continue;
      }

      const [otherStartH, otherStartM] = allSlots[i].start_time.split(':').map(Number);
      const [otherEndH, otherEndM] = allSlots[i].end_time.split(':').map(Number);
      const otherStartMinutes = otherStartH * 60 + otherStartM;
      const otherEndMinutes = otherEndH * 60 + otherEndM;

      // Check if times overlap
      if (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) {
        return 'Overlapping time with another slot';
      }
    }

    // Check for overlaps with existing activities
    console.log(`[OVERLAP CHECK] Checking ${slot.start_time}-${slot.end_time} against ${existingActivities.length} existing activities`);
    for (const existing of existingActivities) {
      const existingStartTime = existing['Start Time'];
      const existingEndTime = existing['End Time'];
      const existingActivity = existing.Activity;
      
      if (!existingStartTime || !existingEndTime) {
        console.log(`[OVERLAP CHECK] Skipping existing activity with missing times`);
        continue;
      }

      const [existingStartH, existingStartM] = existingStartTime.split(':').map(Number);
      const [existingEndH, existingEndM] = existingEndTime.split(':').map(Number);
      const existingStartMinutes = existingStartH * 60 + existingStartM;
      const existingEndMinutes = existingEndH * 60 + existingEndM;

      console.log(`[OVERLAP CHECK] New: ${startMinutes}-${endMinutes} vs Existing: ${existingStartMinutes}-${existingEndMinutes} (${existingActivity})`);

      if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
        console.log(`[OVERLAP DETECTED] Overlap found!`);
        return `Overlapping with existing ${existingActivity} (${existingStartTime}-${existingEndTime})`;
      }
    }

    return null; // No errors
  };

  // Get all validation errors for selected activities
  const getValidationErrors = () => {
    const errors = [];

    console.log(`[VALIDATION] Checking ${Object.keys(selectedActivities).length} activities against ${existingActivities.length} existing activities`);

    for (const [activityName, slots] of Object.entries(selectedActivities)) {
      for (let i = 0; i < slots.length; i++) {
        const error = validateTimeSlot(slots[i], slots, existingActivities);
        if (error) {
          console.log(`[VALIDATION ERROR] ${activityName} slot ${i}: ${error}`);
          errors.push({
            activity: activityName,
            slotIndex: i,
            error: error
          });
        } else {
          console.log(`[VALIDATION OK] ${activityName} slot ${i}: ${slots[i].start_time}-${slots[i].end_time}`);
        }
      }
    }

    return errors;
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

    // FIRST: Check that all time slots have BOTH start and end times filled
    console.log('[SUBMIT] Checking if all times are filled...');
    for (const [activityName, slots] of Object.entries(selectedActivities)) {
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].start_time || !slots[i].end_time) {
          console.log(`[SUBMIT] ❌ INCOMPLETE: ${activityName} slot ${i + 1} missing times`);
          setError(`❌ ${activityName} (Slot ${i + 1}): Both start and end times are required`);
          return;
        }
      }
    }
    console.log('[SUBMIT] ✅ All times filled');

    // SECOND: Get all validation errors (overlaps, invalid ranges, etc)
    console.log('[SUBMIT] Running validation checks...');
    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => 
        `${err.activity} (Slot ${err.slotIndex + 1}): ${err.error}`
      ).join('\n');
      console.log(`[SUBMIT] ❌ VALIDATION FAILED:\n${errorMessages}`);
      setError('❌ Please fix the following issues:\n' + errorMessages);
      return;
    }
    console.log('[SUBMIT] ✅ All validations passed');

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

        {isFrozen(formData.date) && (
          <div className="alert alert-frozen">
            <span>🔒 This date is frozen and cannot be edited. Activities are locked for review.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="activity-form" disabled={isFrozen(formData.date)}>
          <div className="trainer-info">
            <p>Logging as: <strong>{formData.trainer_name}</strong></p>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date * (Today or earlier)</label>
            <DatePickerCalendar 
              selectedDate={formData.date}
              onChange={handleDateChange}
              trainerName={formData.trainer_name}
              frozenDates={frozenDates}
            />
          </div>

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
                        {selectedActivities[activity].map((slot, slotIndex) => {
                          const slotError = getValidationErrors().find(
                            e => e.activity === activity && e.slotIndex === slotIndex
                          );
                          return (
                            <div 
                              key={slotIndex} 
                              className={`time-slot ${slotError ? 'time-slot-invalid' : ''}`}
                            >
                              <div className="time-slot-inputs">
                                <div className={`time-input ${slotError ? 'has-error' : ''}`}>
                                  <TimeInput
                                    label="Start"
                                    value={slot.start_time}
                                    onChange={(e) =>
                                      handleTimeSlotChange(activity, slotIndex, 'start_time', e.target.value)
                                    }
                                    required
                                  />
                                </div>

                                <div className={`time-input ${slotError ? 'has-error' : ''}`}>
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
                              {slotError && (
                                <div className="time-slot-error-message">
                                  ⚠️ {slotError.error}
                                </div>
                              )}
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
                          );
                        })}
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
              <h3>⚠️ New Activities to Save ({Object.keys(selectedActivities).length}):</h3>
              <p className="summary-info">These activities have not been saved yet. Please click the "Save Activities" button below to save them.</p>
              <ul>
                {Object.entries(selectedActivities).map(([activity, slots]) => {
                  const activityErrors = getValidationErrors().filter(e => e.activity === activity);
                  return (
                    <li key={activity} className={activityErrors.length > 0 ? 'with-error' : ''}>
                      <div className="activity-summary-item">
                        <strong>{activity}:</strong> {slots.map((s, idx) => {
                          const slotError = activityErrors.find(e => e.slotIndex === idx);
                          return (
                            <span key={idx} className={slotError ? 'time-slot-error' : ''}>
                              {s.start_time && s.end_time ? `${s.start_time}-${s.end_time}` : '⏱️ incomplete'}
                            </span>
                          );
                        }).reduce((prev, curr, idx) => [prev, ', ', curr])}
                      </div>
                      {activityErrors.length > 0 && (
                        <div className="slot-error-messages">
                          {activityErrors.map((err, idx) => (
                            <div key={idx} className="error-message">
                              ❌ Slot {err.slotIndex + 1}: {err.error}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
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
              disabled={submitting || isFrozen(formData.date)}
              title={isFrozen(formData.date) ? 'Cannot edit frozen dates' : 'Save activities'}
            >
              {isFrozen(formData.date) ? '🔒 Date Frozen - Cannot Save' : (submitting ? 'Saving...' : 'Save Activities')}
            </button>
          )}
        </form>

        {/* Mini Calendar showing activity dates - moved to modal triggered by date picker */}
        {/* Calendar is now accessed by clicking the date input field */}

        {/* Activity History Table at the bottom */}
        {existingActivities.length > 0 && (
          <ActivityHistoryTable 
            activities={existingActivities}
            date={formData.date}
          />
        )}
      </div>
    </div>
  );
}

export default ActivityForm;
