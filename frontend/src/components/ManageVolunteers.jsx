import React, { useState, useEffect } from 'react';
import '../styles/ManageVolunteers.css';

function ManageVolunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('Authentication token not found. Please log in again.');
        setMessageType('error');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/volunteers/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success && result.data) {
        setVolunteers(result.data);
      } else {
        setMessage(result.message || 'Failed to load volunteers');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      setMessage('Error loading volunteers: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (volunteer) => {
    setEditingVolunteer(volunteer.name);
    setEditData({
      name: volunteer.name,
      email: volunteer.email || '',
      phone: volunteer.phone || ''
    });
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) {
      setMessage('Volunteer name cannot be empty');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/volunteers/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          old_name: editingVolunteer,
          name: editData.name,
          email: editData.email,
          phone: editData.phone
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Volunteer updated successfully`);
        setMessageType('success');
        setEditingVolunteer(null);
        fetchVolunteers();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error updating volunteer: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (volunteerName) => {
    if (!window.confirm(`Remove ${volunteerName} from volunteers list?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/volunteers/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: volunteerName
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${volunteerName} removed successfully`);
        setMessageType('success');
        fetchVolunteers();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Error removing volunteer: ' + err.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingVolunteer(null);
    setEditData({ name: '', email: '', phone: '' });
  };

  return (
    <div className="manage-volunteers-container">
      <h2>Manage Volunteers</h2>
      <p className="section-description">
        View, edit, and manage registered volunteers
      </p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {loading && volunteers.length === 0 ? (
        <div className="loading">Loading volunteers...</div>
      ) : volunteers.length === 0 ? (
        <div className="empty-state">
          <p>No volunteers registered yet</p>
        </div>
      ) : (
        <div className="volunteers-table-container">
          <table className="volunteers-table">
            <thead>
              <tr>
                <th>Volunteer Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(volunteer => (
                <tr key={volunteer.name} className={editingVolunteer === volunteer.name ? 'editing' : ''}>
                  <td className="volunteer-name-cell">
                    {editingVolunteer === volunteer.name ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => handleEditChange('name', e.target.value)}
                        className="edit-input"
                        disabled={loading}
                      />
                    ) : (
                      <>👤 {volunteer.name}</>
                    )}
                  </td>
                  <td className="email-cell">
                    {editingVolunteer === volunteer.name ? (
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => handleEditChange('email', e.target.value)}
                        className="edit-input"
                        disabled={loading}
                        placeholder="optional"
                      />
                    ) : (
                      volunteer.email || '-'
                    )}
                  </td>
                  <td className="phone-cell">
                    {editingVolunteer === volunteer.name ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => handleEditChange('phone', e.target.value)}
                        className="edit-input"
                        disabled={loading}
                        placeholder="optional"
                      />
                    ) : (
                      volunteer.phone || '-'
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingVolunteer === volunteer.name ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="btn-save"
                          disabled={loading}
                          title="Save changes"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="btn-cancel"
                          disabled={loading}
                          title="Cancel editing"
                        >
                          ✖ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(volunteer)}
                          className="btn-edit"
                          disabled={loading}
                          title="Edit volunteer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemove(volunteer.name)}
                          className="btn-remove"
                          disabled={loading}
                          title="Remove volunteer"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageVolunteers;
