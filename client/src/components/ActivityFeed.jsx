function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ActivityFeed({ activity }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="card empty-state">
        <p>No activity yet. Add your first expense above.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {activity.map((item) => (
        <div className="ledger-row" key={item._id}>
          {item.type === 'expense' ? (
            <>
              <div className="who">
                <span className="name">{item.description}</span>
                <span className="meta">
                  {item.paidBy?.name} paid · {formatDate(item.createdAt)}
                </span>
              </div>
              <span className="amount neutral">₹{item.amount.toFixed(2)}</span>
            </>
          ) : (
            <>
              <div className="who">
                <span className="name">
                  {item.from?.name} paid {item.to?.name}
                </span>
                <span className="meta">Settlement · {formatDate(item.createdAt)}</span>
              </div>
              <span className="amount owed">₹{item.amount.toFixed(2)}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
