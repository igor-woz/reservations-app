'use client';

import { useState } from 'react';
import { bookingsAPI } from '@/lib/api';

export default function BookingForm({ service, onClose, onSuccess }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // BEZPIECZEŃSTWO: Validation
    if (!date || !time) {
      setError('Please select date and time');
      return;
    }

    setLoading(true);

    try {
      await bookingsAPI.create(service.id, date, time);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // BEZPIECZEŃSTWO: Min date is today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Book Service: {service.name}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">Time:</label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="modal-buttons">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}