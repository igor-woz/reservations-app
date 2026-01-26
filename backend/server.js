/**
 * Main Express Server for Reservations Application
 * 
 * This server provides RESTful API endpoints for:
 * - User authentication (registration and login)
 * - Service management (viewing available services)
 * - Booking management (creating, viewing, and canceling bookings)
 * 
 * All data is persisted in PostgreSQL database.
 */

// Import required dependencies
const express = require('express');        // Web framework for Node.js
const cors = require('cors');               // Cross-Origin Resource Sharing middleware
const jwt = require('jsonwebtoken');        // JSON Web Token for authentication
const bcrypt = require('bcryptjs');         // Password hashing library
require('dotenv').config();                 // Load environment variables from .env file

// Import custom modules
const { query } = require('./config/database');  // Database query helper
const { runMigrations } = require('./db/migrate'); // Database migration runner

// Initialize Express application
const app = express();

/**
 * CORS Configuration
 * Allows the frontend application to make requests to this API
 * from the specified origin (default: http://localhost:3000)
 */
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Frontend URL
  credentials: true,        // Allow cookies/credentials to be sent
  optionsSuccessStatus: 200, // Status code for preflight requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed request headers
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Parse JSON request bodies (allows reading req.body in JSON format)
app.use(express.json());

// ============= AUTHENTICATION ROUTES =============

/**
 * POST /api/auth/register
 * 
 * User Registration Endpoint
 * 
 * Creates a new user account with the provided email, password, and name.
 * The password is hashed using bcrypt before storing in the database.
 * 
 * Request Body:
 *   - email: User's email address (must be unique and valid format)
 *   - password: User's password (will be hashed)
 *   - name: User's full name
 * 
 * Response:
 *   - 201: User created successfully (returns user object without password)
 *   - 400: Validation error or user already exists
 *   - 500: Server error
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    // Extract registration data from request body
    const { email, password, name } = req.body;

    // Input validation: Check if all required fields are provided
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email format validation using regex pattern
    // Pattern checks for: characters before @, @ symbol, domain name, dot, top-level domain
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user with this email already exists in database
    // Using parameterized query ($1) to prevent SQL injection
    const existingUserResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    // If user exists, return error (don't allow duplicate emails)
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password using bcrypt with salt rounds of 10
    // This ensures passwords are never stored in plain text
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database
    // RETURNING clause returns the created user data (excluding password)
    const result = await query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );

    // Extract the newly created user from query result
    const newUser = result.rows[0];

    // Return success response with user data (password is not included)
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });
  } catch (err) {
    console.error('Registration error:', err);
    // Handle PostgreSQL unique constraint violation (duplicate email)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'User already exists' });
    }
    // Generic server error response
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * 
 * User Login Endpoint
 * 
 * Authenticates a user by verifying their email and password.
 * If credentials are valid, returns a JWT token for subsequent authenticated requests.
 * 
 * Request Body:
 *   - email: User's email address
 *   - password: User's plain text password
 * 
 * Response:
 *   - 200: Login successful (returns JWT token and user data)
 *   - 400: Missing email or password
 *   - 401: Invalid credentials (wrong email or password)
 *   - 500: Server error
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    // Extract login credentials from request body
    const { email, password } = req.body;

    // Validate that both email and password are provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email using parameterized query to prevent SQL injection
    // Include password field to verify it later
    const result = await query(
      'SELECT id, email, password, name FROM users WHERE email = $1',
      [email]
    );

    // If no user found with this email, return authentication error
    // Use generic message to prevent email enumeration attacks
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user data from query result
    const user = result.rows[0];

    // Verify password by comparing plain text password with hashed password in database
    // bcrypt.compare handles the comparison securely
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Return same generic error message for security (don't reveal if email exists)
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token containing user ID and email
    // Token expires in 24 hours - client must use this token for authenticated requests
    const token = jwt.sign(
      { id: user.id, email: user.email },  // Payload (data stored in token)
      process.env.JWT_SECRET,                // Secret key for signing (from .env)
      { expiresIn: '24h' }                   // Token expiration time
    );

    // Return success response with token and user data (without password)
    res.json({
      message: 'Login successful',
      token,  // JWT token to be stored by client
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVICES ROUTES =============

/**
 * GET /api/services
 * 
 * Get All Services Endpoint
 * 
 * Returns a list of all available services that users can book.
 * This endpoint is public (no authentication required).
 * 
 * Response:
 *   - 200: Array of service objects with id, name, description, price, duration
 *   - 500: Server error
 */
app.get('/api/services', async (req, res) => {
  try {
    // Query all services from database, ordered by ID
    // Only select necessary fields (exclude internal fields like created_at)
    const result = await query('SELECT id, name, description, price, duration FROM services ORDER BY id');
    
    // Return all services as JSON array
    res.json(result.rows);
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/services/:id
 * 
 * Get Single Service Endpoint
 * 
 * Returns details of a specific service by its ID.
 * This endpoint is public (no authentication required).
 * 
 * URL Parameters:
 *   - id: Service ID (integer)
 * 
 * Response:
 *   - 200: Service object with id, name, description, price, duration
 *   - 404: Service not found
 *   - 500: Server error
 */
app.get('/api/services/:id', async (req, res) => {
  try {
    // Parse service ID from URL parameter and convert to integer
    // This prevents SQL injection by ensuring it's a number
    const serviceId = parseInt(req.params.id);
    
    // Query database for service with matching ID
    // Using parameterized query ($1) for security
    const result = await query(
      'SELECT id, name, description, price, duration FROM services WHERE id = $1',
      [serviceId]
    );

    // If no service found, return 404 error
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Return the service data
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get service error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/services/:id/timeslots
 * 
 * Get Available Timeslots for a Service on a Specific Date
 * 
 * Returns all available timeslots for a service on a given date.
 * Filters out timeslots that are already booked.
 * 
 * Query Parameters:
 *   - date: string (required, YYYY-MM-DD format)
 * 
 * URL Parameters:
 *   - id: Service ID (integer)
 * 
 * Response:
 *   - 200: Array of available timeslot objects with start_time and end_time
 *   - 400: Missing or invalid date parameter
 *   - 404: Service not found
 *   - 500: Server error
 * 
 * Timeslot Object Structure:
 *   - start_time: string (HH:MM format)
 *   - end_time: string (HH:MM format)
 *   - is_available: boolean (always true in response, false timeslots are filtered out)
 */
app.get('/api/services/:id/timeslots', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { date } = req.query;

    // Validate date parameter
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD format)' });
    }

    // Validate date format
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = bookingDate.getDay();

    // Verify service exists
    const serviceResult = await query(
      'SELECT id FROM services WHERE id = $1',
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get all timeslots for this service on this day of week
    const timeslotsResult = await query(
      `SELECT start_time, end_time 
       FROM service_timeslots 
       WHERE service_id = $1 
         AND day_of_week = $2 
         AND is_available = true
       ORDER BY start_time`,
      [serviceId, dayOfWeek]
    );

    // Get all existing bookings for this service on this date
    // Only count confirmed bookings (cancelled bookings free up the slot)
    const bookingsResult = await query(
      `SELECT time 
       FROM bookings 
       WHERE service_id = $1 
         AND date = $2 
         AND status = 'confirmed'`,
      [serviceId, date]
    );

    // Create a set of booked times for quick lookup
    const bookedTimes = new Set(
      bookingsResult.rows.map(row => row.time.toString())
    );

    // Filter out booked timeslots
    const availableTimeslots = timeslotsResult.rows
      .filter(slot => {
        const startTime = slot.start_time.toString();
        return !bookedTimes.has(startTime);
      })
      .map(slot => ({
        start_time: slot.start_time.toString().substring(0, 5), // Format as HH:MM
        end_time: slot.end_time.toString().substring(0, 5),     // Format as HH:MM
        is_available: true
      }));

    res.json(availableTimeslots);
  } catch (err) {
    console.error('Get timeslots error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= AUTHENTICATION MIDDLEWARE =============

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from Authorization header and extracts user ID.
 * This middleware is used to protect routes that require authentication.
 * 
 * How it works:
 * 1. Extracts token from "Authorization: Bearer <token>" header
 * 2. Verifies token signature using JWT_SECRET
 * 3. If valid, attaches userId to request object and calls next()
 * 4. If invalid or missing, returns 401/403 error
 * 
 * Usage: Add as middleware to routes: app.get('/route', authenticateToken, handler)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
  // Extract Authorization header from request
  const authHeader = req.headers['authorization'];
  
  // Parse token from "Bearer <token>" format
  // Split by space and take second element (the actual token)
  const token = authHeader && authHeader.split(' ')[1];

  // If no token provided, return 401 Unauthorized
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify token signature and expiration
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    // If token is invalid, expired, or tampered with
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Token is valid - attach user ID to request object
    // This allows route handlers to know which user made the request
    req.userId = decoded.id;
    
    // Call next middleware/route handler
    next();
  });
};

// ============= BOOKINGS ROUTES =============

/**
 * GET /api/bookings
 * 
 * Get User's Bookings Endpoint
 * 
 * Returns all bookings for the authenticated user.
 * Requires authentication (JWT token in Authorization header).
 * 
 * Security: Users can only see their own bookings (filtered by user_id from token).
 * 
 * Response:
 *   - 200: Array of booking objects for the authenticated user
 *   - 401: Missing or invalid authentication token
 *   - 500: Server error
 */
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // Query bookings from database, filtered by user ID from authenticated token
    // Security: Using req.userId ensures users can only see their own bookings
    // Aliases (as "userId") convert snake_case to camelCase for frontend
    const result = await query(
      `SELECT id, user_id as "userId", service_id as "serviceId", service_name as "serviceName", 
       date, time, status, created_at as "createdAt"
       FROM bookings 
       WHERE user_id = $1 
       ORDER BY date DESC, time DESC`,  // Most recent bookings first
      [req.userId]  // User ID from authenticated token
    );
    
    // Format database results for JSON response
    // Convert PostgreSQL date objects to ISO strings for frontend compatibility
    const bookings = result.rows.map(booking => ({
      ...booking,
      date: booking.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      time: booking.time, // Keep time as string (already in HH:MM format)
      createdAt: booking.createdAt.toISOString() // Full ISO timestamp
    }));
    
    // Return formatted bookings array
    res.json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/bookings
 * 
 * Create New Booking
 * Allows authenticated users to create a new booking for a service.
 * 
 * Security:
 * - Requires authentication (uses authenticateToken middleware)
 * - Validates all required fields
 * - Verifies that the service exists before creating booking
 * - Validates date format and prevents booking past dates
 * - Uses parameterized queries to prevent SQL injection
 * 
 * Request Body:
 *   - serviceId: number (required, ID of the service to book)
 *   - date: string (required, YYYY-MM-DD format)
 *   - time: string (required, HH:MM format)
 * 
 * Response:
 *   - 201: Booking created successfully (returns booking object)
 *   - 400: Missing fields, invalid date format, or past date
 *   - 401: Not authenticated
 *   - 404: Service not found
 *   - 500: Server error
 */
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // Extract booking data from request body
    const { serviceId, date, time } = req.body;

    // Validate that all required fields are provided
    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify that the service exists before creating booking
    // This prevents booking non-existent services
    const serviceResult = await query(
      'SELECT id, name FROM services WHERE id = $1',
      [parseInt(serviceId)]
    );
    
    // If service doesn't exist, return 404 error
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Extract service data
    const service = serviceResult.rows[0];

    // Validate date format
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Prevent booking dates in the past
    if (bookingDate < new Date()) {
      return res.status(400).json({ error: 'Cannot book past dates' });
    }

    // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = bookingDate.getDay();

    // Validate that the requested time is a valid timeslot for this service
    // Check if the service has a timeslot for this day and time
    const timeslotResult = await query(
      `SELECT id FROM service_timeslots 
       WHERE service_id = $1 
         AND day_of_week = $2 
         AND start_time = $3 
         AND is_available = true`,
      [parseInt(serviceId), dayOfWeek, time]
    );

    if (timeslotResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'This time slot is not available for this service on the selected day' 
      });
    }

    // Check if this timeslot is already booked (double booking prevention)
    // The unique constraint will also prevent this, but we check first for better error message
    const existingBooking = await query(
      `SELECT id FROM bookings 
       WHERE service_id = $1 
         AND date = $2 
         AND time = $3 
         AND status = 'confirmed'`,
      [parseInt(serviceId), date, time]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({ 
        error: 'This time slot is already booked. Please select another time.' 
      });
    }

    // Create new booking in database
    // Stores user_id from authenticated token, service details, and booking time
    // Status is set to 'confirmed' by default
    // The unique constraint on (service_id, date, time, status) prevents double booking
    const result = await query(
      `INSERT INTO bookings (user_id, service_id, service_name, date, time, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id as "userId", service_id as "serviceId", 
                 service_name as "serviceName", date, time, status, created_at as "createdAt"`,
      [req.userId, parseInt(serviceId), service.name, date, time, 'confirmed']
    );

    // Extract the newly created booking
    const newBooking = result.rows[0];
    
    // Format booking response for JSON
    const bookingResponse = {
      id: newBooking.id,
      userId: newBooking.userId,
      serviceId: newBooking.serviceId,
      serviceName: newBooking.serviceName,
      date: newBooking.date.toISOString().split('T')[0],  // Format date as YYYY-MM-DD
      time: newBooking.time,                               // Time remains as string
      createdAt: newBooking.createdAt.toISOString(),       // Format timestamp
      status: newBooking.status
    };

    // Return success response with booking data
    res.status(201).json({
      message: 'Booking created successfully',
      booking: bookingResponse
    });
  } catch (err) {
    console.error('Create booking error:', err);
    
    // Handle unique constraint violation (double booking attempt)
    if (err.code === '23505') {
      return res.status(409).json({ 
        error: 'This time slot is already booked. Please select another time.' 
      });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/bookings/:id
 * 
 * Cancel Booking
 * Allows authenticated users to cancel their own bookings.
 * 
 * Security:
 * - Requires authentication (uses authenticateToken middleware)
 * - Verifies booking exists before attempting deletion
 * - Ensures users can only cancel their own bookings (authorization check)
 * - Uses parameterized queries to prevent SQL injection
 * 
 * URL Parameters:
 *   - id: number (booking ID to cancel)
 * 
 * Response:
 *   - 200: Booking cancelled successfully
 *   - 401: Not authenticated
 *   - 403: Unauthorized (trying to cancel someone else's booking)
 *   - 404: Booking not found
 *   - 500: Server error
 */
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    // Parse booking ID from URL parameter
    const bookingId = parseInt(req.params.id);
    
    // First, verify that the booking exists and get its owner
    // This prevents attempting to delete non-existent bookings
    const bookingResult = await query(
      'SELECT id, user_id FROM bookings WHERE id = $1',
      [bookingId]
    );

    // If booking doesn't exist, return 404
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Extract booking data
    const booking = bookingResult.rows[0];

    // Authorization check: Ensure user can only cancel their own bookings
    // req.userId comes from the JWT token (set by authenticateToken middleware)
    if (booking.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete the booking from database
    // Only reaches here if booking exists and belongs to the user
    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    // Return success response
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVER START =============

/**
 * Server Initialization
 * 
 * Starts the Express server after ensuring the database is properly set up.
 * Runs database migrations before starting the server to ensure all tables exist.
 * 
 * Process:
 * 1. Run database migrations (create tables if they don't exist)
 * 2. If migrations succeed, start the Express server
 * 3. If migrations fail, exit the process with error code 1
 */

// Get port from environment variable or use default (5001)
const PORT = process.env.PORT || 5001;

// Run database migrations first, then start the server
// This ensures all required database tables exist before handling requests
runMigrations()
  .then(() => {
    // Migrations completed successfully - start the server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api\n`);
    });
  })
  .catch((err) => {
    // Migration failed - log error and exit
    console.error('Failed to start server:', err);
    process.exit(1);  // Exit with error code 1
  });