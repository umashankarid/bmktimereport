import React, { useState, useEffect } from 'react';
import '../styles/BillReimbursement.css';

function BillManagement() {
  const [bills, setBills] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Filters
  const [filterTrainer, setFilterTrainer] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Form for admin's own bill submission
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    bill_name: '',
    description: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    file: null
  });

  useEffect(() => {
    fetchTrainers();
    fetchBills();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [filterTrainer, filterMonth]);

  const fetchTrainers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/trainers/details/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTrainers(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      if (filterTrainer) params.append('trainer', filterTrainer);
      if (filterMonth) params.append('month', filterMonth);

      const response = await fetch(`/api/bills?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setBills(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.bill_name || !formData.amount || !formData.payment_date) {
      setMessage('Bill name, amount, and payment date are required');
      setMessageType('error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('adminToken');
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

      const data = new FormData();
      data.append('trainer_name', adminData.username || 'admin');
      data.append('bill_name', formData.bill_name);
      data.append('description', formData.description);
      data.append('amount', formData.amount);
      data.append('payment_date', formData.payment_date);
      if (formData.file) {
        data.append('file', formData.file);
      }

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      const result = await response.json();
      if (result.success) {
        setMessage('✅ Bill submitted successfully');
        setMessageType('success');
        setFormData({
          bill_name: '',
          description: '',
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          file: null
        });
        const fileInput = document.getElementById('admin-bill-file-input');
        if (fileInput) fileInput.value = '';
        setShowForm(false);
        fetchBills();
      } else {
        setMessage(`❌ ${result.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setMessage('Only PDF and image files are allowed');
        setMessageType('error');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setMessage('File size must be less than 10MB');
        setMessageType('error');
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleDownload = async (billId, fileName) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/bills/${billId}/file`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchBills();
      }
    } catch (err) {
      console.error('Error deleting bill:', err);
    }
  };

  // Calculate total amount
  const totalAmount = bills.reduce((sum, bill) => sum + Number(bill.amount), 0);

  return (
    <div className="bill-management">
      <div className="bill-management-header">
        <h2>💰 Bill Management</h2>
        <button
          className="btn-add-bill"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '➕ Submit My Bill'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bill-form admin-bill-form">
          <h3>Submit Your Bill</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Bill Name *</label>
              <input
                type="text"
                value={formData.bill_name}
                onChange={(e) => setFormData({ ...formData, bill_name: e.target.value })}
                placeholder="e.g., Shuttle cocks, Transport"
                disabled={submitting}
                required
              />
            </div>
            <div className="form-group">
              <label>Amount (SEK) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                disabled={submitting}
                required
              />
            </div>
            <div className="form-group">
              <label>Receipt/Invoice (PDF or Image)</label>
              <input
                type="file"
                id="admin-bill-file-input"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the expense..."
              disabled={submitting}
              rows={2}
            />
          </div>

          <button type="submit" className="btn-submit-bill" disabled={submitting}>
            {submitting ? 'Submitting...' : '📤 Submit Bill'}
          </button>
        </form>
      )}

      <div className="bill-filters">
        <div className="filter-group">
          <label>Filter by User:</label>
          <select
            value={filterTrainer}
            onChange={(e) => setFilterTrainer(e.target.value)}
          >
            <option value="">All Users</option>
            {trainers.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Filter by Month:</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        {(filterTrainer || filterMonth) && (
          <button className="btn-clear-filters" onClick={() => { setFilterTrainer(''); setFilterMonth(''); }}>
            ✕ Clear Filters
          </button>
        )}
      </div>

      <div className="bill-summary">
        <span>{bills.length} bill{bills.length !== 1 ? 's' : ''}</span>
        <span className="total-amount">Total: {totalAmount.toFixed(2)} SEK</span>
      </div>

      <div className="bill-history">
        {loading ? (
          <p>Loading...</p>
        ) : bills.length === 0 ? (
          <p className="no-bills">No bills found.</p>
        ) : (
          <div className="bill-table-wrapper">
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Bill Name</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>File</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.payment_date}</td>
                    <td>{bill.trainer_name}</td>
                    <td>{bill.bill_name}</td>
                    <td className="amount">{Number(bill.amount).toFixed(2)} SEK</td>
                    <td>{bill.description}</td>
                    <td>
                      {bill.has_file ? (
                        <button
                          className="btn-download"
                          onClick={() => handleDownload(bill.id, bill.file_name)}
                          title={bill.file_name}
                        >
                          📎 {bill.file_name.length > 15 ? bill.file_name.substring(0, 15) + '...' : bill.file_name}
                        </button>
                      ) : (
                        <span className="no-file">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-delete-bill"
                        onClick={() => handleDelete(bill.id)}
                        title="Delete bill"
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
      </div>
    </div>
  );
}

export default BillManagement;
