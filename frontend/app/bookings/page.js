'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function BookingsPage() {
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

  return (
    <div className="page">
      <h1>My Bookings</h1>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings yet. <a href="/services">Book a service</a></p>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <h3>{booking.serviceName}</h3>
              <p>
                <strong>Date:</strong> {new Date(booking.date).toLocaleDateString('en-US')}
              </p>
              <p>
                <strong>Time:</strong> {booking.time}
              </p>
              <p>
                <strong>Status:</strong> <span className="status-badge">{booking.status}</span>
              </p>

              <button
                onClick={() => handleCancel(booking.id)}
                className="btn btn-danger"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      <a href="/services" className="btn btn-secondary mt-20">
        Back to Services
      </a>
    </div>
  );
}