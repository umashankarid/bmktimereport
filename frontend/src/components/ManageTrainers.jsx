import React, { useState, useEffect } from 'react';
import '../styles/ManageTrainers.css';

function ManageTrainers() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trainers/details/all');
      const result = await response.json();
      if (result.success && result.data) {
        setTrainers(result.data);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
      setMessage('Failed to load trainers');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (trainer) => {
    setEditingTrainer(trainer.name);
    setEditFormData({
      name: trainer.name,
      email: trainer.email,
      phone: trainer.phone
    });
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingTrainer(null);
    setEditFormData({ name: '', email: '', phone: '' });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name) {
      setMessage('Trainer name is required');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch(`/api/trainers/${encodeURIComponent(editingTrainer)}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          new_name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Trainer updated successfully');
        setMessageType('success');
        setEditingTrainer(null);
        setEditFormData({ name: '', email: '', phone: '' });
        fetchTrainers();
      } else {
        setMessage(`❌ ${result.message || 'Failed to update trainer'}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error updating trainer:', err);
      setMessage('Failed to update trainer');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrainer = async (trainerName) => {
    if (!window.confirm(`Are you sure you want to delete trainer "${trainerName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await fetch(`/api/trainers/${encodeURIComponent(trainerName)}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Trainer "${trainerName}" deleted successfully`);
        setMessageType('success');
        fetchTrainers();
      } else {
        setMessage(`❌ ${result.message || 'Failed to delete trainer'}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error deleting trainer:', err);
      setMessage('Failed to delete trainer');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && trainers.length === 0) {
    return <div className="loading">Loading trainers...</div>;
  }

  return (
    <div className="manage-trainers-container">
      <h2>Manage Users</h2>
      <p className="section-description">
        View, edit, or delete user accounts (trainers and volunteers). Changes to user information will be saved to the system.
      </p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          {messageType === 'error' && (
            <button onClick={() => setMessage('')}>×</button>
          )}
        </div>
      )}

      {trainers.length === 0 ? (
        <div className="empty-state">
          <p>No users found</p>
        </div>
      ) : (
        <div className="trainers-table-container">
          <table className="trainers-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => (
                <tr key={trainer.name}>
                  <td>{trainer.name}</td>
                  <td><span className={`user-type ${trainer.trainer_type?.toLowerCase().replace(' ', '-')}`}>{trainer.trainer_type || 'Assistant Trainer'}</span></td>
                  <td>{trainer.email || '-'}</td>
                  <td>{trainer.phone || '-'}</td>
                  <td className="actions">
                    <button
                      className="btn btn-edit"
                      onClick={() => handleEditClick(trainer)}
                      title="Edit user"
                    >
                      ✎
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDeleteTrainer(trainer.name)}
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingTrainer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Trainer: {editingTrainer}</h3>
            
            <div className="form-group">
              <label>Trainer Name</label>
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditChange}
                placeholder="Trainer name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleEditChange}
                placeholder="trainer@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={editFormData.phone}
                onChange={handleEditChange}
                placeholder="Phone number"
                disabled={loading}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageTrainers;
