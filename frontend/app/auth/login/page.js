/**
 * Login Page Component
 * 
 * This is a client-side component that handles user authentication.
 * Users can log in with their email and password to access the application.
 * 
 * Features:
 * - Email and password input validation
 * - Error message display
 * - Loading state during authentication
 * - Automatic redirect to profile page on success
 * - Link to registration page for new users
 */

'use client';  // Next.js directive: This component runs only in the browser

// Import React hooks for state management
import { useState } from 'react';
// Import Next.js router for navigation
import { useRouter } from 'next/navigation';
// Import API client for authentication
import { authAPI } from '@/lib/api';
// Import auth utilities for token/user storage
import { saveToken, saveUser } from '@/lib/auth';

/**
 * Login Page Component
 * 
 * Renders a login form and handles user authentication.
 */
export default function LoginPage() {
  // Form state: email input value
  const [email, setEmail] = useState('');
  // Form state: password input value
  const [password, setPassword] = useState('');
  // Error message to display if login fails
  const [error, setError] = useState('');
  // Loading state: true while authentication request is in progress
  const [loading, setLoading] = useState(false);
  // Next.js router for programmatic navigation
  const router = useRouter();

  /**
   * Handle Form Submission
   * 
   * Processes the login form when user submits it.
   * 
   * Process:
   * 1. Prevents default form submission behavior
   * 2. Clears any previous error messages
   * 3. Sets loading state to show spinner/disabled button
   * 4. Sends login request to API
   * 5. On success: saves token and user data, redirects to profile
   * 6. On error: displays error message to user
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();  // Prevent page reload on form submit
    setError('');        // Clear any previous errors
    setLoading(true);    // Show loading state

    try {
      // Send login request to backend API
      // Note: Password is sent in plain text over HTTPS (secure in production)
      // The backend will hash and compare it securely
      const response = await authAPI.login(email, password);
      
      // Save authentication token to localStorage
      // This token will be used for all subsequent authenticated API requests
      saveToken(response.token);
      
      // Save user data to localStorage
      // This allows components to display user info without API calls
      saveUser(response.user);

      // Redirect to profile page after successful login
      router.push('/profile');
    } catch (err) {
      // Display error message to user (e.g., "Invalid credentials")
      setError(err.message);
    } finally {
      // Always clear loading state, even if request fails
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h1>Sign In</h1>

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

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p>
        Don't have an account? <a href="/auth/register">Sign Up</a>
      </p>
    </div>
  );
}