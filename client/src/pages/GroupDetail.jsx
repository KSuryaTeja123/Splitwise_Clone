import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import BalanceTable from '../components/BalanceTable';
import SimplifiedDebts from '../components/SimplifiedDebts';
import ActivityFeed from '../components/ActivityFeed';
import AddMemberForm from '../components/AddMemberForm';

const TABS = ['Balances', 'Settle up', 'Activity'];

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [tab, setTab] = useState('Balances');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupRes, balancesRes, simplifyRes, activityRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/balances`),
        api.get(`/groups/${id}/simplify`),
        api.get(`/groups/${id}/activity`),
      ]);
      setGroup(groupRes.data.group);
      setBalances(balancesRes.data.balances);
      setTransactions(simplifyRes.data.transactions);
      setActivity(activityRes.data.activity);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSettle = async (txn) => {
    try {
      await api.post(`/groups/${id}/settle`, {
        from: txn.from.userId,
        to: txn.to.userId,
        amount: txn.amount,
      });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record settlement');
    }
  };

  if (loading && !group) {
    return (
      <div className="container">
        <p style={{ color: 'var(--ink-soft)', marginTop: 40 }}>Loading…</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="container">
        <div className="error-banner" style={{ marginTop: 40 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Group</span>
          <h1 style={{ fontSize: 28 }}>{group.name}</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowExpenseForm((s) => !s)}>
          {showExpenseForm ? 'Cancel' : '+ Add expense'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showExpenseForm && (
        <ExpenseForm
          group={group}
          currentUserId={user.id}
          onCreated={() => loadAll()}
          onClose={() => setShowExpenseForm(false)}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 13 }}
          onClick={() => setShowAddMember((s) => !s)}
        >
          {showAddMember ? 'Hide' : 'Invite member'}
        </button>
        {showAddMember && (
          <AddMemberForm groupId={id} onAdded={(g) => setGroup(g)} />
        )}
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Balances' && <BalanceTable balances={balances} currentUserId={user.id} />}
      {tab === 'Settle up' && (
        <SimplifiedDebts
          transactions={transactions}
          currentUserId={user.id}
          onSettle={handleSettle}
        />
      )}
      {tab === 'Activity' && <ActivityFeed activity={activity} />}
    </div>
  );
}
