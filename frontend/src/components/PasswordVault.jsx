import React, { useState, useEffect } from 'react';
import '../styles/PasswordVault.css';

function PasswordVault() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [formData, setFormData] = useState({
    item_name: '',
    item_type: 'laptop',
    username: '',
    password: '',
    url: '',
    notes: ''
  });

  const itemTypes = [
    { value: 'laptop', label: '💻 Laptop', icon: '💻' },
    { value: 'website', label: '🌐 Website', icon: '🌐' },
    { value: 'app', label: '📱 App', icon: '📱' },
    { value: 'wifi', label: '📶 WiFi', icon: '📶' },
    { value: 'other', label: '🔑 Other', icon: '🔑' }
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/vault', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setItems(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching vault items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.item_name || !formData.password) {
      setMessage('Item name and password are required');
      setMessageType('error');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `/api/vault/${editingId}` : '/api/vault',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();
      if (result.success) {
        setMessage(isEditing ? '✅ Item updated' : '✅ Item saved to vault');
        setMessageType('success');
        resetForm();
        fetchItems();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setMessageType('error');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      item_name: item.item_name,
      item_type: item.item_type,
      username: item.username,
      password: '', // Don't prefill password
      url: item.url,
      notes: item.notes
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item from the vault?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/vault/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchItems();
      }
    } catch (err) {
      console.error('Error deleting vault item:', err);
    }
  };

  const togglePassword = async (itemId) => {
    if (visiblePasswords[itemId]) {
      // Hide password
      setVisiblePasswords(prev => ({ ...prev, [itemId]: null }));
    } else {
      // Fetch and show password
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/vault/${itemId}/password`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setVisiblePasswords(prev => ({ ...prev, [itemId]: result.password }));
          // Auto-hide after 30 seconds
          setTimeout(() => {
            setVisiblePasswords(prev => ({ ...prev, [itemId]: null }));
          }, 30000);
        }
      } catch (err) {
        console.error('Error fetching password:', err);
      }
    }
  };

  const copyToClipboard = async (itemId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/vault/${itemId}/password`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        await navigator.clipboard.writeText(result.password);
        setMessage('📋 Password copied to clipboard');
        setMessageType('success');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (err) {
      console.error('Error copying password:', err);
    }
  };

  const resetForm = () => {
    setFormData({ item_name: '', item_type: 'laptop', username: '', password: '', url: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getTypeIcon = (type) => {
    const found = itemTypes.find(t => t.value === type);
    return found ? found.icon : '🔑';
  };

  return (
    <div className="password-vault">
      <div className="vault-header">
        <h2>🔐 Password Vault</h2>
        <button className="btn-add-vault" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? '✕ Cancel' : '➕ Add Item'}
        </button>
      </div>
      <p className="vault-description">Securely store passwords for club devices, apps, and websites. Passwords are encrypted at rest.</p>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="vault-form">
          <h3>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Item Name *</label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g., Tournament Laptop, Scoring App"
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
              >
                {itemTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username / Login</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username or email"
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingId ? 'Leave blank to keep current' : 'Enter password'}
                required={!editingId}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>URL / Location</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://... or physical location"
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional info..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save-vault">
              {editingId ? '💾 Update' : '💾 Save to Vault'}
            </button>
            <button type="button" className="btn-cancel-vault" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="vault-items">
        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p className="no-items">No items in the vault yet. Click "Add Item" to get started.</p>
        ) : (
          <div className="vault-grid">
            {items.map((item) => (
              <div key={item.id} className={`vault-card type-${item.item_type}`}>
                <div className="vault-card-header">
                  <span className="vault-type-icon">{getTypeIcon(item.item_type)}</span>
                  <div className="vault-card-title">
                    <h4>{item.item_name}</h4>
                    <span className="vault-type-label">{item.item_type}</span>
                  </div>
                  <div className="vault-card-actions">
                    <button onClick={() => handleEdit(item)} title="Edit">✏️</button>
                    <button onClick={() => handleDelete(item.id)} title="Delete">🗑️</button>
                  </div>
                </div>

                <div className="vault-card-body">
                  {item.username && (
                    <div className="vault-field">
                      <span className="field-label">Username:</span>
                      <span className="field-value">{item.username}</span>
                    </div>
                  )}
                  <div className="vault-field">
                    <span className="field-label">Password:</span>
                    <span className="field-value password-field">
                      {visiblePasswords[item.id] || '••••••••'}
                    </span>
                    <button className="btn-toggle-pw" onClick={() => togglePassword(item.id)} title={visiblePasswords[item.id] ? 'Hide' : 'Show'}>
                      {visiblePasswords[item.id] ? '🙈' : '👁️'}
                    </button>
                    <button className="btn-copy-pw" onClick={() => copyToClipboard(item.id)} title="Copy password">
                      📋
                    </button>
                  </div>
                  {item.url && (
                    <div className="vault-field">
                      <span className="field-label">URL:</span>
                      <span className="field-value">{item.url}</span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="vault-field">
                      <span className="field-label">Notes:</span>
                      <span className="field-value">{item.notes}</span>
                    </div>
                  )}
                </div>

                <div className="vault-card-footer">
                  <span>Added by {item.created_by}</span>
                  <span>{item.updated_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PasswordVault;
