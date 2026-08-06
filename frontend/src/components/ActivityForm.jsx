import React, { useState, useEffect } from 'react';
import '../styles/ActivityForm.css';

const ACTIVITY_TYPES = [
  'Practice',
  'Drill',
  'Match',
  'Tournament',
  'Conditioning',
  'Theory',
  'Other'
];

function ActivityForm({ onSubmit, trainers, currentTrainer }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    trainer_name: currentTrainer?.name || '',
    activity: '',
    start_time: '',
    end_time: '',
    note: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Update trainer name if it changes
  useEffect(() => {
    if (currentTrainer?.name) {
      setFormData(prev => ({
        ...prev,
        trainer_name: currentTrainer.name
      }));
    }
  }, [currentTrainer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.activity || !formData.date || !formData.start_time || !formData.end_time) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(formData);
      
      if (result.success) {
        setSuccess('✓ Activity logged successfully!');
        // Reset form but keep trainer name
        setFormData(prev => ({
          date: new Date().toISOString().split('T')[0],
          trainer_name: prev.trainer_name,
          activity: '',
          start_time: '',
          end_time: '',
          note: ''
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="activity-form-container">
      <div className="form-card">
        <h2>Log New Activity</h2>
        
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="activity-form">
          <div className="trainer-info">
            <p>Logging as: <strong>{formData.trainer_name}</strong></p>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="activity">Activity *</label>
            <select
              id="activity"
              name="activity"
              value={formData.activity}
              onChange={handleChange}
              required
            >
              <option value="">Select activity type</option>
              {ACTIVITY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time *</label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_time">End Time *</label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Any additional notes about the activity..."
              rows="3"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Logging...' : 'Log Activity'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ActivityForm;
