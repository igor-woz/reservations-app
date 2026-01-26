/**
 * Database Configuration Module
 * 
 * This module sets up and manages the PostgreSQL database connection pool.
 * It provides helper functions for executing queries and managing database connections.
 * 
 * Features:
 * - Connection pooling for efficient database access
 * - Query execution with logging and error handling
 * - Client management for transactions
 * - Automatic connection error handling
 */

// Import PostgreSQL client library
const { Pool } = require('pg');
// Load environment variables from .env file
require('dotenv').config();

/**
 * PostgreSQL Connection Pool
 * 
 * A connection pool manages multiple database connections, allowing the application
 * to reuse connections instead of creating a new one for each query.
 * This improves performance and reduces database load.
 * 
 * Configuration:
 * - host: Database server address (from environment or default: localhost)
 * - port: Database server port (from environment or default: 5432)
 * - database: Database name (from environment or default: reservations_db)
 * - user: Database user (from environment or default: postgres)
 * - password: Database password (from environment or default: postgres)
 * - max: Maximum number of clients in the pool (20)
 * - idleTimeoutMillis: Close idle clients after 30 seconds
 * - connectionTimeoutMillis: Timeout for new connections (2 seconds)
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',           // Database host address
  port: process.env.DB_PORT || 5432,                   // Database port number
  database: process.env.DB_NAME || 'reservations_db',  // Database name
  user: process.env.DB_USER || 'postgres',             // Database username
  password: process.env.DB_PASSWORD || 'postgres',     // Database password
  max: 20,                                              // Maximum number of clients in pool
  idleTimeoutMillis: 30000,                            // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000,                       // Timeout for new connections (2 seconds)
});

/**
 * Connection Event Handlers
 * These handlers monitor the connection pool for events
 */

// Fired when a new client connects to the database
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Fired when an error occurs on an idle client
// This typically indicates a database connection issue
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);  // Exit the application if database connection fails
});

/**
 * Query Helper Function
 * 
 * Executes a SQL query using the connection pool.
 * Includes logging for debugging and performance monitoring.
 * 
 * @param {string} text - SQL query string (can use $1, $2, etc. for parameters)
 * @param {Array} params - Array of parameter values for parameterized queries
 * @returns {Promise<Object>} Query result object with rows and rowCount
 * 
 * Example:
 *   await query('SELECT * FROM users WHERE id = $1', [123])
 */
const query = async (text, params) => {
  const start = Date.now();  // Record start time for performance measurement
  
  try {
    // Execute the query using the connection pool
    // params array is used for parameterized queries (prevents SQL injection)
    const res = await pool.query(text, params);
    
    // Calculate query execution time
    const duration = Date.now() - start;
    
    // Log query execution details for debugging
    console.log('Executed query', { text, duration, rows: res.rowCount });
    
    // Return the query result
    return res;
  } catch (error) {
    // Log database errors for debugging
    console.error('Database query error:', error);
    // Re-throw error so calling code can handle it
    throw error;
  }
};

/**
 * Get Client from Pool (for Transactions)
 * 
 * Retrieves a single client from the pool for use in transactions.
 * Transactions require a single client connection to ensure atomicity.
 * 
 * Features:
 * - Tracks query execution time to detect long-running queries
 * - Automatically releases client back to pool after use
 * - Logs warnings if client is held for more than 5 seconds
 * 
 * @returns {Promise<Object>} Database client object
 * 
 * Example:
 *   const client = await getClient();
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...');
 *   await client.query('COMMIT');
 *   client.release();
 */
const getClient = async () => {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  // Store original methods before monkey-patching
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout to detect if client is held too long (potential connection leak)
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);
  
  // Monkey-patch the query method to track the last executed query
  // This helps with debugging if a client is held too long
  client.query = (...args) => {
    client.lastQuery = args;  // Store query for debugging
    return query(...args);     // Execute the original query method
  };
  
  // Monkey-patch the release method to clean up the timeout
  client.release = () => {
    clearTimeout(timeout);     // Clear the warning timeout
    client.query = query;      // Restore original query method
    client.release = release;  // Restore original release method
    return release();          // Release client back to pool
  };
  
  return client;
};

// Export functions and pool for use in other modules
module.exports = {
  query,      // Query helper function
  getClient,  // Client getter for transactions
  pool        // Connection pool (for advanced usage)
};
