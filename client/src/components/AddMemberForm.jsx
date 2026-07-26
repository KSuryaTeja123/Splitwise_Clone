import { useState } from 'react';
import api from '../api/axios';

export default function AddMemberForm({ groupId, onAdded }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post(`/groups/${groupId}/members`, { email });
      onAdded(data.group);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <input
        type="email"
        placeholder="friend@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--rule)', borderRadius: 6 }}
        required
      />
      <button type="submit" className="btn btn-secondary" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && <span style={{ color: 'var(--red)', fontSize: 13, alignSelf: 'center' }}>{error}</span>}
    </form>
  );
}
