'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';

/**
 * Reset Password Page
 *
 * User lands here from the email link (?token=...). They enter a new password;
 * token is validated and password is updated on submit.
 */
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <h1>Password Reset</h1>
        <p style={{ marginBottom: 20 }}>
          Your password has been reset. You can now sign in with your new password.
        </p>
        <a href="/auth/login" className="btn btn-primary">
          Sign In
        </a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-form">
        <h1>Invalid Link</h1>
        {error && <div className="error-message">{error}</div>}
        <p>
          <a href="/auth/forgot-password">Request a new reset link</a>
        </p>
        <p>
          <a href="/auth/login">Back to Sign In</a>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h1>Set New Password</h1>
      <p style={{ marginBottom: 20, color: '#666' }}>
        Enter your new password below.
      </p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm">Confirm Password:</label>
          <input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p>
        <a href="/auth/login">Back to Sign In</a>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-form"><p>Loading...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
