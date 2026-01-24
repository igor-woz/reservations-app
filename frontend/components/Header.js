'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, clearToken, isAuthenticated } from '@/lib/auth';
import { useState, useEffect } from 'react';

export default function Header() {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = isAuthenticated();
    setIsAuth(auth);
    if (auth) {
      setUser(getUser());
    }
  }, []);

  const handleLogout = () => {
    clearToken();
    setIsAuth(false);
    router.push('/');
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