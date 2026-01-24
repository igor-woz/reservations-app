'use client';

export default function HomePage() {
  return (
    <div className="page">
      <h1>Welcome to Service Booking Application</h1>
      <p>Sign in or create an account to book services.</p>

      <div className="action-buttons">
        <a href="/auth/login" className="btn btn-primary">Sign In</a>
        <a href="/auth/register" className="btn btn-secondary">Sign Up</a>
      </div>

      <section className="info-section">
        <h2>Available Services</h2>
        <ul>
          <li>✂️ Haircut - from $50</li>
          <li>💅 Manicure - from $30</li>
          <li>🧘 Massage - from $80</li>
        </ul>
      </section>
    </div>
  );
}