/**
 * Authentication Utility Functions
 * 
 * This module provides helper functions for managing authentication state
 * in the browser. It handles JWT token and user data storage in localStorage.
 * 
 * All functions are SSR-safe (check for window object before accessing localStorage).
 */

/**
 * Save JWT Token to LocalStorage
 * 
 * Stores the authentication token in the browser's localStorage.
 * This token is used for authenticated API requests.
 * 
 * @param {string} token - JWT token received from login/register
 */
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

/**
 * Get JWT Token from LocalStorage
 * 
 * Retrieves the stored authentication token.
 * Returns null if no token exists or if running on server (SSR).
 * 
 * @returns {string|null} JWT token or null if not found/SSR
 */
export const getToken = () => {
  // Check if running in browser (not during server-side rendering)
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Clear Authentication Data
 * 
 * Removes both the JWT token and user data from localStorage.
 * Used when user logs out.
 */
export const clearToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Check if User is Authenticated
 * 
 * Determines if a user is currently logged in by checking for a token.
 * 
 * @returns {boolean} True if token exists, false otherwise
 */
export const isAuthenticated = () => {
  // Double negation converts truthy/falsy to boolean
  return !!getToken();
};

/**
 * Save User Data to LocalStorage
 * 
 * Stores user information (name, email, id) in localStorage.
 * This allows components to display user info without making API calls.
 * 
 * @param {Object} user - User object with id, email, name properties
 */
export const saveUser = (user) => {
  // Convert user object to JSON string for storage
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Get User Data from LocalStorage
 * 
 * Retrieves stored user information from localStorage.
 * Returns null if no user data exists or if running on server (SSR).
 * 
 * @returns {Object|null} User object or null if not found/SSR
 */
export const getUser = () => {
  // Check if running in browser (not during server-side rendering)
  if (typeof window === 'undefined') return null;
  
  // Get user data string from localStorage
  const user = localStorage.getItem('user');
  
  // Parse JSON string back to object, or return null if not found
  return user ? JSON.parse(user) : null;
};