/**
 * Booking Form Component
 * 
 * Modal form component for creating a new booking.
 * Allows users to select a date and time for a service.
 * 
 * Features:
 * - Date and time input validation
 * - Prevents booking past dates
 * - Error message display
 * - Loading state during booking creation
 * - Modal overlay that closes on outside click
 */

'use client';  // Next.js directive: Client-side component

// Import React hooks for state management
import { useState } from 'react';
// Import bookings API client
import { bookingsAPI } from '@/lib/api';

/**
 * Booking Form Component
 * 
 * @param {Object} service - Service object to book (must have id and name)
 * @param {Function} onClose - Callback function called when modal is closed
 * @param {Function} onSuccess - Callback function called when booking is created successfully
 */
export default function BookingForm({ service, onClose, onSuccess }) {
  // Form state: selected booking date (YYYY-MM-DD format)
  const [date, setDate] = useState('');
  // Form state: selected booking time (HH:MM format)
  const [time, setTime] = useState('');
  // Error message to display if booking fails
  const [error, setError] = useState('');
  // Loading state: true while booking request is in progress
  const [loading, setLoading] = useState(false);

  /**
   * Handle Form Submission
   * 
   * Processes the booking form when user submits it.
   * 
   * Process:
   * 1. Prevents default form submission
   * 2. Validates that date and time are selected
   * 3. Sends booking request to API
   * 4. On success: calls onSuccess callback
   * 5. On error: displays error message
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();  // Prevent page reload
    setError('');       // Clear previous errors

    // Client-side validation: ensure both date and time are selected
    if (!date || !time) {
      setError('Please select date and time');
      return;
    }

    setLoading(true);  // Show loading state

    try {
      // Create booking via API
      // Backend will validate date format and prevent past dates
      await bookingsAPI.create(service.id, date, time);
      
      // Call success callback (typically closes modal and refreshes bookings)
      onSuccess();
    } catch (err) {
      // Display error message from API (e.g., "Cannot book past dates")
      setError(err.message);
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  // Calculate today's date in YYYY-MM-DD format
  // Used to set minimum date for date input (prevents booking past dates)
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