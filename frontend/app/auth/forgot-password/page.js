'use client';

import { useState } from 'react';
import { authAPI } from '@/lib/api';

/**
 * Forgot Password Page
 *
 * User enters their email; if an account exists, they receive a password reset link.
 * API always returns success message to avoid email enumeration.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form">
        <h1>Check Your Email</h1>
        <p style={{ marginBottom: 20 }}>
          If an account exists for <strong>{email}</strong>, you will receive a
          password reset link shortly. The link expires in 1 hour.
        </p>
        <p>
          <a href="/auth/login">Back to Sign In</a>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h1>Forgot Password</h1>
      <p style={{ marginBottom: 20, color: '#666' }}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p>
        <a href="/auth/login">Back to Sign In</a>
      </p>
    </div>
  );
}
