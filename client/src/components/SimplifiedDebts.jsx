export default function SimplifiedDebts({ transactions, currentUserId, onSettle }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="card empty-state">
        <p>Everyone's settled up. Nothing to pay.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {transactions.map((t, i) => {
        const involvesYou = t.from.userId === currentUserId || t.to.userId === currentUserId;
        return (
          <div className="ledger-row" key={i}>
            <div className="who">
              <span className="name">
                {t.from.name} → {t.to.name}
                {involvesYou && <span className="badge" style={{ marginLeft: 8 }}>you</span>}
              </span>
              <span className="meta">Settles part of the group's balance</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="amount neutral">₹{t.amount.toFixed(2)}</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => onSettle(t)}
              >
                Mark paid
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
