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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(true);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate at least one activity is selected
    const selectedCount = Object.keys(selectedActivities).length;
    if (selectedCount === 0) {
      setError('Please select at least one activity');
      return;
    }

    // Validate all selected activities have times
    for (const [activityName, activityData] of Object.entries(selectedActivities)) {
      if (!activityData.start_time || !activityData.end_time) {
        setError(`Please set start and end times for ${activityName}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Prepare submission data
      const submissionData = {
        trainer_name: formData.trainer_name,
        date: formData.date,
        note: formData.note,
        activities: Object.values(selectedActivities)
      };

      console.log('📤 Submitting activities:', submissionData);
      const result = await onSubmit(submissionData);
      
      if (result.success) {
        const activityList = result.activities?.join(', ') || '';
        setSuccess(`✓ Logged ${result.count} activity/activities: ${activityList}`);
        
        // Reset form but keep trainer name and date
        setFormData(prev => ({
          date: new Date().toISOString().split('T')[0],
          trainer_name: prev.trainer_name,
          note: ''
        }));
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
          <h2>Log New Activity</h2>
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

          {/* Activities Checkboxes Section */}
          <div className="activities-section">
            <label className="section-label">Select Activities *</label>
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

          {/* Summary of selected activities */}
          {Object.keys(selectedActivities).length > 0 && (
            <div className="selected-summary">
              <h3>Selected ({Object.keys(selectedActivities).length}):</h3>
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
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={formData.note}
              onChange={handleNoteChange}
              placeholder="Any additional notes about the activities..."
              rows="3"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting || Object.keys(selectedActivities).length === 0}
          >
            {submitting ? 'Logging...' : `Log ${Object.keys(selectedActivities).length} Activity/ies`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ActivityForm;
