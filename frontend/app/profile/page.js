'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const userData = getUser();
    setUser(userData);
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await bookingsAPI.cancel(id);
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!getToken()) return null;

  // Calculate booking statistics
  const now = new Date();
  now.setSeconds(0, 0); // Reset seconds and milliseconds for accurate comparison
  
  const upcomingBookings = bookings.filter(booking => {
    try {
      const bookingDate = new Date(`${booking.date}T${booking.time}`);
      bookingDate.setSeconds(0, 0);
      return bookingDate >= now && booking.status === 'confirmed';
    } catch (e) {
      return false;
    }
  });

  const pastBookings = bookings.filter(booking => {
    try {
      const bookingDate = new Date(`${booking.date}T${booking.time}`);
      bookingDate.setSeconds(0, 0);
      return bookingDate < now || booking.status !== 'confirmed';
    } catch (e) {
      return true; // Treat invalid dates as past
    }
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

  // Sort upcoming bookings by date
  upcomingBookings.sort((a, b) => {
    try {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    } catch (e) {
      return 0;
    }
  });

  return (
    <div className="page">
      <h1>My Profile</h1>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading profile...</p>
      ) : (
        <>
          {/* User Information Section */}
          <div className="profile-section">
            <div className="profile-card">
              <h2>Account Information</h2>
              <div className="profile-info">
                <div className="info-row">
                  <strong>Name:</strong>
                  <span>{user?.name || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <strong>Email:</strong>
                  <span>{user?.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Statistics */}
          <div className="profile-section">
            <h2>Booking Summary</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{totalBookings}</div>
                <div className="stat-label">Total Bookings</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{upcomingBookings.length}</div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{confirmedBookings}</div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{pastBookings.length}</div>
                <div className="stat-label">Past</div>
              </div>
            </div>
          </div>

          {/* Upcoming Bookings Section */}
          <div className="profile-section">
            <h2>Upcoming Bookings</h2>
            {upcomingBookings.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming bookings scheduled.</p>
                <a href="/services" className="btn btn-primary">
                  Book a Service
                </a>
              </div>
            ) : (
              <div className="bookings-list">
                {upcomingBookings.map((booking) => {
                  let bookingDate;
                  let isToday = false;
                  try {
                    bookingDate = new Date(`${booking.date}T${booking.time}`);
                    const today = new Date();
                    isToday = bookingDate.toDateString() === today.toDateString();
                  } catch (e) {
                    bookingDate = new Date(booking.date);
                  }
                  
                  return (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <h3>{booking.serviceName}</h3>
                        <span className={`status-badge status-${booking.status}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="booking-details">
                        <div className="detail-item">
                          <strong>📅 Date:</strong>
                          <span>
                            {isToday ? 'Today' : bookingDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="detail-item">
                          <strong>🕐 Time:</strong>
                          <span>{booking.time}</span>
                        </div>
                        <div className="detail-item">
                          <strong>📝 Status:</strong>
                          <span className={`status-badge status-${booking.status}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      <div className="booking-actions">
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="btn btn-danger"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="profile-section">
            <div className="quick-actions">
              <a href="/services" className="btn btn-primary">
                Book New Service
              </a>
              <a href="/bookings" className="btn btn-secondary">
                View All Bookings
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
