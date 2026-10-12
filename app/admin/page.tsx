export default function Admin(){
  return <main className="wrap">
    <nav className="nav"><div className="brand">FIST <span>DATA</span> ADMIN</div><a className="btn" href="/">Exit</a></nav>
    <h1>Admin Dashboard</h1>
    <div className="notice">Admin authentication, user management, plans, transaction controls and audit logs will be connected to the database in the next build stage.</div>
    <div className="grid">
      <div className="card"><div className="muted">Users</div><div className="balance">0</div></div>
      <div className="card"><div className="muted">Transactions</div><div className="balance">0</div></div>
      <div className="card"><div className="muted">Revenue</div><div className="balance">₦0</div></div>
    </div>
  </main>
}
