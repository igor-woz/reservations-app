/**
 * Header Component
 * 
 * Navigation header that appears on all pages. Displays different navigation
 * links based on authentication status.
 * 
 * Features:
 * - Shows user name when authenticated
 * - Displays different navigation links for authenticated vs. unauthenticated users
 * - Handles user logout
 * - Responsive navigation menu
 */

'use client';  // Next.js directive: Client-side component

// Import Next.js Link component for client-side navigation
import Link from 'next/link';
// Import Next.js router for programmatic navigation
import { useRouter } from 'next/navigation';
// Import authentication utilities
import { getUser, clearToken, isAuthenticated } from '@/lib/auth';
// Import React hooks
import { useState, useEffect } from 'react';

/**
 * Header Component
 * 
 * Renders the application header with navigation links.
 * Adapts based on user authentication status.
 */
export default function Header() {
  // Store current user data (name, email, id)
  const [user, setUser] = useState(null);
  // Track authentication status
  const [isAuth, setIsAuth] = useState(false);
  // Next.js router for navigation
  const router = useRouter();

  /**
   * Effect Hook: Check Authentication on Mount
   * 
   * Runs once when component mounts to:
   * 1. Check if user is authenticated
   * 2. Load user data if authenticated
   * 
   * This ensures the header displays the correct navigation links
   * based on the user's authentication status.
   */
  useEffect(() => {
    // Check if user has a valid authentication token
    const auth = isAuthenticated();
    setIsAuth(auth);
    
    // If authenticated, load user data from localStorage
    if (auth) {
      setUser(getUser());
    }
  }, []);  // Empty dependency array: run only on mount

  /**
   * Handle Logout
   * 
   * Logs the user out by:
   * 1. Clearing authentication token and user data from localStorage
   * 2. Updating component state
   * 3. Redirecting to home page
   */
  const handleLogout = () => {
    clearToken();      // Remove token and user data from localStorage
    setIsAuth(false);  // Update authentication state
    router.push('/');  // Redirect to home page
  };

  return (
    <header className="header">
      <nav className="navbar">
        <Link href="/" className="logo">
          📅 BookingApp
        </Link>

        <div className="nav-links">
          {isAuth ? (
            <>
              <span className="user-name">Welcome, {user?.name}</span>
              <Link href="/profile">Profile</Link>
              <Link href="/services">Services</Link>
              <Link href="/bookings">My Bookings</Link>
              <button onClick={handleLogout} className="btn btn-logout">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login">Sign In</Link>
              <Link href="/auth/register">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}