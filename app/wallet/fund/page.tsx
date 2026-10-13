'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function FundWallet() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const naira = Number(amount);
    if (!naira || naira < 100) {
      setError('Enter an amount of at least ₦100.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: naira }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || 'Could not start payment.');
        return;
      }
      if (d.demo) {
        router.push(`/wallet/fund/verify?reference=${d.reference}&demo=1`);
      } else if (d.authorization_url) {
        window.location.href = d.authorization_url;
      } else {
        setError('Unexpected response from payment server.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">FIST <span>DATA</span></div>
        <div className="navlinks">
          <a href="/dashboard">Dashboard</a>
          <a href="/wallet">Wallet</a>
        </div>
      </nav>
      <div className="auth card">
        <h1>Fund Wallet</h1>
        <p className="muted">Add money to your wallet using Paystack. Minimum ₦100.</p>
        <form onSubmit={submit} className="form">
          <label>
            Amount (₦)
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              min="100"
              required
            />
          </label>
          <div className="quick-amounts">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                className="btn"
                onClick={() => setAmount(String(a))}
              >
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" disabled={loading}>
            {loading ? 'Starting payment...' : 'Pay with Paystack'}
          </button>
        </form>
        <p><a href="/wallet">Back to wallet</a></p>
      </div>
    </main>
  );
}
