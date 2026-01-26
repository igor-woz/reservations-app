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
import { useState, useEffect } from 'react';
// Import API clients
import { bookingsAPI, servicesAPI } from '@/lib/api';

/**
 * Booking Form Component
 * 
 * Modal form component for creating a new booking.
 * Displays only available timeslots for the selected date.
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
  // Available timeslots for the selected date
  const [timeslots, setTimeslots] = useState([]);
  // Loading state for fetching timeslots
  const [loadingTimeslots, setLoadingTimeslots] = useState(false);
  // Error message to display if booking fails
  const [error, setError] = useState('');
  // Loading state: true while booking request is in progress
  const [loading, setLoading] = useState(false);

  /**
   * Effect Hook: Load Available Timeslots
   * 
   * Fetches available timeslots whenever the date changes.
   * Only fetches if a valid date is selected.
   */
  useEffect(() => {
    // Reset time selection when date changes
    setTime('');
    setError('');

    // Only fetch timeslots if a date is selected
    if (!date) {
      setTimeslots([]);
      return;
    }

    // Fetch available timeslots for the selected date
    const fetchTimeslots = async () => {
      setLoadingTimeslots(true);
      try {
        const availableSlots = await servicesAPI.getTimeslots(service.id, date);
        setTimeslots(availableSlots);
        
        // If no timeslots available, show message
        if (availableSlots.length === 0) {
          setError('No available timeslots for this date. Please select another date.');
        } else {
          setError('');
        }
      } catch (err) {
        setError(err.message || 'Failed to load available timeslots');
        setTimeslots([]);
      } finally {
        setLoadingTimeslots(false);
      }
    };

    fetchTimeslots();
  }, [date, service.id]);

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
      // Backend will validate that the timeslot is available and prevent double booking
      await bookingsAPI.create(service.id, date, time);
      
      // Call success callback (typically closes modal and refreshes bookings)
      onSuccess();
    } catch (err) {
      // Display error message from API (e.g., "This time slot is already booked")
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
            {loadingTimeslots ? (
              <div>Loading available timeslots...</div>
            ) : timeslots.length === 0 && date ? (
              <div className="error-message" style={{ marginTop: '10px' }}>
                No available timeslots for this date
              </div>
            ) : !date ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Please select a date first
              </div>
            ) : (
              <select
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="form-group input"
                style={{
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                <option value="">Select a time</option>
                {timeslots.map((slot, index) => (
                  <option key={index} value={slot.start_time}>
                    {slot.start_time} - {slot.end_time}
                  </option>
                ))}
              </select>
            )}
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