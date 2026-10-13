import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Wallet() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: wallet } = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: recentFunding } = await db
    .from('transactions')
    .select('reference, amount, status, created_at')
    .eq('user_id', user.id)
    .eq('transaction_type', 'wallet_funding')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">FIST <span>DATA</span></div>
        <div className="navlinks">
          <a href="/dashboard">Dashboard</a>
          <a href="/transactions">Transactions</a>
        </div>
      </nav>
      <h1>Wallet</h1>
      <div className="card">
        <div className="muted">Available balance</div>
        <div className="balance">₦{Number(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div className="actions">
          <a className="btn primary" href="/wallet/fund">Fund Wallet</a>
        </div>
      </div>

      {recentFunding && recentFunding.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Recent funding</h3>
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recentFunding.map((r: any) => (
                <tr key={r.reference}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>₦{Number(r.amount).toLocaleString()}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="notice">
        Wallet funding uses Paystack for secure Nigerian Naira payments.
        {process.env.PAYSTACK_SECRET_KEY
          ? ' Paystack is configured and ready.'
          : ' Add your Paystack secret key to enable live payments.'}
      </div>
    </main>
  );
}
