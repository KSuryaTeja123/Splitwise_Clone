export default function BalanceTable({ balances, currentUserId }) {
  if (!balances || balances.length === 0) {
    return <p style={{ color: 'var(--ink-soft)' }}>No balances yet.</p>;
  }

  return (
    <div className="card">
      {balances.map((b) => {
        const isYou = b.userId === currentUserId;
        const cls = b.balance > 0.01 ? 'owed' : b.balance < -0.01 ? 'owes' : 'neutral';
        const label =
          b.balance > 0.01
            ? 'is owed'
            : b.balance < -0.01
            ? 'owes the group'
            : 'is settled up';

        return (
          <div className="ledger-row" key={b.userId}>
            <div className="who">
              <span className="name">
                {b.name} {isYou && <span className="badge">you</span>}
              </span>
              <span className="meta">{label}</span>
            </div>
            <span className={`amount ${cls}`}>
              ₹{Math.abs(b.balance).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
