import { useState } from 'react';
import api from '../api/axios';

export default function ExpenseForm({ group, currentUserId, onCreated, onClose }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitType, setSplitType] = useState('equal');
  const [selected, setSelected] = useState(() => new Set(group.members.map((m) => m._id)));
  const [customValues, setCustomValues] = useState({}); // userId -> amount or percentage
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const toggleMember = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const participantIds = Array.from(selected);
      if (participantIds.length === 0) {
        throw new Error('Select at least one participant');
      }

      let participants;
      if (splitType === 'equal') {
        participants = participantIds.map((id) => ({ user: id }));
      } else if (splitType === 'unequal') {
        participants = participantIds.map((id) => ({
          user: id,
          amount: parseFloat(customValues[id] || 0),
        }));
      } else {
        participants = participantIds.map((id) => ({
          user: id,
          percentage: parseFloat(customValues[id] || 0),
        }));
      }

      const { data } = await api.post(`/groups/${group._id}/expenses`, {
        description,
        amount: parseFloat(amount),
        paidBy,
        splitType,
        participants,
      });

      onCreated(data.expense);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label htmlFor="description">What was it for?</label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dinner, cab fare, hotel booking…"
          required
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="paidBy">Paid by</label>
          <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {group.members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="splitType">Split type</label>
        <select id="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
          <option value="equal">Equal</option>
          <option value="unequal">Unequal (exact amounts)</option>
          <option value="percentage">Percentage</option>
        </select>
      </div>

      <div className="field">
        <label>Split between</label>
        {group.members.map((m) => (
          <div
            key={m._id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}
          >
            <input
              type="checkbox"
              checked={selected.has(m._id)}
              onChange={() => toggleMember(m._id)}
              id={`member-${m._id}`}
            />
            <label htmlFor={`member-${m._id}`} style={{ flex: 1, fontWeight: 400 }}>
              {m.name}
            </label>
            {splitType !== 'equal' && selected.has(m._id) && (
              <input
                type="number"
                step="0.01"
                placeholder={splitType === 'percentage' ? '%' : 'amount'}
                style={{ width: 100, padding: '6px 8px' }}
                value={customValues[m._id] || ''}
                onChange={(e) =>
                  setCustomValues((prev) => ({ ...prev, [m._id]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add expense'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
