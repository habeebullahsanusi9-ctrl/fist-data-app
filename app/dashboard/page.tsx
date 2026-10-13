import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: wallet } = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const { count } = await db
    .from('data_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">FIST <span>DATA</span></div>
        <div className="navlinks">
          <a href="/buy-data">Buy Data</a>
          <a href="/wallet">Wallet</a>
          <a href="/transactions">Transactions</a>
          {user.role === 'admin' && <a href="/admin">Admin</a>}
        </div>
      </nav>
      <div className="dashhead">
        <div>
          <div className="muted">Welcome, {user.full_name}</div>
          <h1>Dashboard</h1>
        </div>
        <a className="btn primary" href="/buy-data">Buy Data</a>
      </div>
      <div className="grid">
        <div className="card">
          <div className="muted">Wallet balance</div>
          <div className="balance">₦{Number(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card">
          <div className="muted">Data purchases</div>
          <div className="balance">{count ?? 0}</div>
        </div>
        <div className="card">
          <div className="muted">Account</div>
          <div className="balance">Active</div>
          <p className="muted">{user.phone}</p>
        </div>
      </div>
      <div className="notice">Your account and wallet are connected to the database. Fund your wallet to start buying data.</div>
    </main>
  );
}
