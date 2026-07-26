import { Link } from 'react-router-dom';

export default function GroupCard({ group }) {
  return (
    <Link
      to={`/groups/${group._id}`}
      className="card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{group.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </div>
        </div>
        <span className="badge">open</span>
      </div>
    </Link>
  );
}
