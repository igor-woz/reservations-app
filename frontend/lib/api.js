/**
 * API Client Library
 * 
 * This module provides a centralized API client for making HTTP requests
 * to the backend server. It handles authentication, error handling, and
 * provides convenient methods for all API endpoints.
 * 
 * Features:
 * - Automatic JWT token injection for authenticated requests
 * - Consistent error handling
 * - Type-safe API method definitions
 * - Server-side rendering (SSR) safe (checks for window object)
 */

// Get API base URL from environment variables
// NEXT_PUBLIC_ prefix makes it available in the browser
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Generic API Call Function
 * 
 * A helper function that wraps the native fetch API with:
 * - Automatic JWT token injection from localStorage
 * - Consistent error handling
 * - JSON request/response handling
 * - SSR safety (checks for window object)
 * 
 * @param {string} endpoint - API endpoint path (e.g., '/api/auth/login')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Parsed JSON response data
 * @throws {Error} If the API request fails or returns an error
 * 
 * Example:
 *   const data = await apiCall('/api/services', { method: 'GET' });
 */
export const apiCall = async (endpoint, options = {}) => {
  // Get JWT token from localStorage (only in browser, not during SSR)
  // typeof window check ensures this works during server-side rendering
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Make HTTP request to the API
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,  // Spread any provided options (method, body, etc.)
    headers: {
      'Content-Type': 'application/json',  // Always send JSON
      // Include Authorization header with Bearer token if token exists
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers  // Allow custom headers to override defaults
    }
  });

  // Parse JSON response
  // Note: In production, you might want to check Content-Type header first
  const data = await response.json();

  // Check if the response indicates an error
  if (!response.ok) {
    // Throw an error with the error message from the API
    // This allows components to catch and display user-friendly error messages
    throw new Error(data.error || 'API error');
  }

  // Return the parsed response data
  return data;
};

/**
 * Authentication API Methods
 * 
 * Provides methods for user authentication operations.
 */
export const authAPI = {
  /**
   * Register a new user account
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password (plain text, will be hashed on server)
   * @param {string} name - User's full name
   * @returns {Promise<Object>} Response with user data (no password)
   * @throws {Error} If registration fails (e.g., email already exists)
   */
  register: (email, password, name) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    }),

  /**
   * Login with email and password
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} Response with JWT token and user data
   * @throws {Error} If login fails (invalid credentials)
   */
  login: (email, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
};

/**
 * Services API Methods
 * 
 * Provides methods for retrieving service information.
 * These endpoints are public (no authentication required).
 */
export const servicesAPI = {
  /**
   * Get all available services
   * 
   * @returns {Promise<Array>} Array of service objects
   * @throws {Error} If the request fails
   */
  getAll: () => apiCall('/api/services', { method: 'GET' }),
  
  /**
   * Get a specific service by ID
   * 
   * @param {number} id - Service ID
   * @returns {Promise<Object>} Service object with details
   * @throws {Error} If service not found or request fails
   */
  getById: (id) => apiCall(`/api/services/${id}`, { method: 'GET' })
};

/**
 * Bookings API Methods
 * 
 * Provides methods for managing user bookings.
 * All endpoints require authentication (JWT token).
 */
export const bookingsAPI = {
  /**
   * Get all bookings for the authenticated user
   * 
   * @returns {Promise<Array>} Array of booking objects
   * @throws {Error} If not authenticated or request fails
   */
  getAll: () => apiCall('/api/bookings', { method: 'GET' }),
  
  /**
   * Create a new booking
   * 
   * @param {number} serviceId - ID of the service to book
   * @param {string} date - Booking date in YYYY-MM-DD format
   * @param {string} time - Booking time in HH:MM format
   * @returns {Promise<Object>} Created booking object
   * @throws {Error} If booking fails (e.g., invalid date, service not found)
   */
  create: (serviceId, date, time) =>
    apiCall('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ serviceId, date, time })
    }),
  
  /**
   * Cancel a booking
   * 
   * @param {number} id - Booking ID to cancel
   * @returns {Promise<Object>} Success message
   * @throws {Error} If booking not found, not authorized, or request fails
   */
  cancel: (id) =>
    apiCall(`/api/bookings/${id}`, { method: 'DELETE' })
};