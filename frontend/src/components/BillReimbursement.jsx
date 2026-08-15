import React, { useState, useEffect } from 'react';
import '../styles/BillReimbursement.css';

function BillReimbursement({ currentTrainer }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const [formData, setFormData] = useState({
    bill_name: '',
    description: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    file: null
  });

  useEffect(() => {
    fetchBills();
  }, [currentTrainer]);

  const fetchBills = async () => {
    if (!currentTrainer?.name) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('trainerToken') || localStorage.getItem('adminToken');
      const response = await fetch(`/api/bills?trainer=${encodeURIComponent(currentTrainer.name)}`, {
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
      const token = localStorage.getItem('trainerToken') || localStorage.getItem('adminToken');

      const data = new FormData();
      data.append('trainer_name', currentTrainer.name);
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
        // Clear file input
        const fileInput = document.getElementById('bill-file-input');
        if (fileInput) fileInput.value = '';
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
      // Allow PDF and images
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
      const token = localStorage.getItem('trainerToken') || localStorage.getItem('adminToken');
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
      const token = localStorage.getItem('trainerToken') || localStorage.getItem('adminToken');
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

  return (
    <div className="bill-reimbursement">
      <h2>💰 Bill Reimbursement</h2>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bill-form">
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
              id="bill-file-input"
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

      <div className="bill-history">
        <h3>📋 My Bills</h3>
        {loading ? (
          <p>Loading...</p>
        ) : bills.length === 0 ? (
          <p className="no-bills">No bills submitted yet.</p>
        ) : (
          <div className="bill-table-wrapper">
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Date</th>
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

export default BillReimbursement;
