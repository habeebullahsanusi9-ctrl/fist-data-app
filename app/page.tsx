const plans = [
  ["MTN", "1GB", "₦350"], ["MTN", "2GB", "₦700"],
  ["Airtel", "1GB", "₦350"], ["Glo", "1GB", "₦300"],
  ["9mobile", "1GB", "₦300"], ["Airtel", "3GB", "₦1,000"]
];

export default function Home() {
  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">FIST <span>DATA</span></div>
        <div className="navlinks">
          <a href="/dashboard">Dashboard</a>
          <a href="/buy-data">Buy Data</a>
          <a href="/wallet">Wallet</a>
          <a href="/login">Log in</a>
        </div>
      </nav>
      <section className="hero">
        <div className="eyebrow">NIGERIAN DATA RESELLING PLATFORM</div>
        <h1>Buy data.<br />Stay connected.</h1>
        <p>FIST DATA makes mobile data purchases simple, fast and affordable across MTN, Airtel, Glo and 9mobile.</p>
        <div className="actions">
          <a className="btn primary" href="/buy-data">Buy Data</a>
          <a className="btn" href="/dashboard">Open Dashboard</a>
        </div>
      </section>
      <section>
        <h2>Popular plans</h2>
        <div className="grid">
          {plans.map(([n, d, p]) => (
            <div className="card" key={n + d}>
              <div className="network">{n}</div>
              <div className="price">{d}</div>
              <p className="muted">Starting from</p>
              <strong>{p}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="notice">Secure wallet funding via Paystack. Data delivery confirmed by telecom provider.</div>
      <footer className="footer">© 2026 FIST DATA · Built for Nigeria</footer>
    </main>
  );
}
