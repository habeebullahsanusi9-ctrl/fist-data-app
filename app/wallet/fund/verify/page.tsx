'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params.get('reference') || '';
  const isDemo = params.get('demo') === '1';
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('Missing payment reference.');
      return;
    }

    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}${isDemo ? '&demo=1' : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStatus('success');
          setMessage(`Wallet credited with ₦${Number(d.amount).toLocaleString()}. New balance: ₦${Number(d.balance).toLocaleString()}.`);
        } else {
          setStatus('failed');
          setMessage(d.error || 'Payment verification failed.');
        }
      })
      .catch(() => {
        setStatus('failed');
        setMessage('Could not verify payment. If you were charged, contact support.');
      });
  }, [reference, isDemo]);

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
        {status === 'verifying' && <h1>Verifying payment...</h1>}
        {status === 'success' && <h1>Payment successful</h1>}
        {status === 'failed' && <h1>Payment verification</h1>}

        {status === 'verifying' && <p className="muted">Please wait while we confirm your payment.</p>}
        {status === 'success' && <div className="notice">{message}</div>}
        {status === 'failed' && <div className="error">{message}</div>}

        {status === 'success' && (
          <div className="actions" style={{ marginTop: '20px' }}>
            <Link className="btn primary" href="/wallet">Go to wallet</Link>
            <Link className="btn" href="/buy-data">Buy data</Link>
          </div>
        )}
        {status === 'failed' && (
          <div className="actions" style={{ marginTop: '20px' }}>
            <Link className="btn" href="/wallet/fund">Try again</Link>
            <Link className="btn" href="/wallet">Back to wallet</Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Loading...</p></main>}>
      <VerifyContent />
    </Suspense>
  );
}
