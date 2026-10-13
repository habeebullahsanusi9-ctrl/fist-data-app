import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Transactions() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: rows } = await db
    .from('transactions')
    .select('reference, transaction_type, amount, status, created_at, description')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">FIST <span>DATA</span></div>
        <div className="navlinks">
          <a href="/dashboard">Dashboard</a>
          <a href="/buy-data">Buy Data</a>
        </div>
      </nav>
      <h1>Transactions</h1>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows && rows.length ? (
              rows.map((r: any) => (
                <tr key={r.reference}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.description}</td>
                  <td>₦{Number(r.amount).toLocaleString()}</td>
                  <td>{r.status}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4}>No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
