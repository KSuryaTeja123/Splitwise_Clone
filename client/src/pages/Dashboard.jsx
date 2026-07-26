import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import GroupCard from '../components/GroupCard';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [emails, setEmails] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/groups');
      setGroups(data.groups);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const memberEmails = emails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { data } = await api.post('/groups', { name, memberEmails });
      setName('');
      setEmails('');
      setShowForm(false);
      navigate(`/groups/${data.group._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Your groups</span>
          <h1 style={{ fontSize: 28 }}>Dashboard</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New group'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 24 }}>
          <div className="field">
            <label htmlFor="groupName">Group name</label>
            <input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goa Trip, Flat 3B, Office Lunch…"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="emails">Add members by email (comma-separated, optional)</label>
            <input
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="friend1@example.com, friend2@example.com"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div className="empty-state card">
          <p>No groups yet. Create one to start tracking shared expenses.</p>
        </div>
      ) : (
        groups.map((g) => <GroupCard key={g._id} group={g} />)
      )}
    </div>
  );
}
