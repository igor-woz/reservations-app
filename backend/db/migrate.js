/**
 * Database Migration Module
 * 
 * This module handles database schema migrations - creating tables, indexes,
 * and initial data required for the application to function.
 * 
 * Migrations are run automatically when the server starts to ensure the database
 * schema is always up-to-date.
 */

// Import required modules
const fs = require('fs');                    // File system operations
const path = require('path');                // Path manipulation utilities
const { pool } = require('../config/database'); // Database connection pool

/**
 * Run Database Migrations
 * 
 * Creates all necessary database tables, indexes, and initial data.
 * This function is idempotent - it can be run multiple times safely.
 * 
 * Process:
 * 1. Creates users table (for user accounts)
 * 2. Creates services table (for available services)
 * 3. Creates bookings table (for user bookings)
 * 4. Creates indexes for better query performance
 * 5. Inserts initial service data
 * 
 * Error Handling:
 * - Ignores errors if tables/indexes already exist (code 42P07, 42710)
 * - Ignores duplicate data errors (code 23505)
 * - Throws other errors to prevent silent failures
 * 
 * @returns {Promise<void>} Resolves when migrations complete successfully
 */
async function runMigrations() {
  // Get a client from the connection pool for this migration session
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    
    // ============= CREATE TABLES =============
    
    /**
     * Create Users Table
     * 
     * Stores user account information including:
     * - id: Auto-incrementing primary key
     * - email: Unique email address (used for login)
     * - password: Bcrypt-hashed password
     * - name: User's full name
     * - created_at, updated_at: Timestamps for record tracking
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => {
      // Ignore error if table already exists (PostgreSQL error code 42P07)
      if (err.code !== '42P07') throw err;
    });
    console.log('✅ Users table created/verified');
    
    /**
     * Create Services Table
     * 
     * Stores available services that users can book:
     * - id: Auto-incrementing primary key
     * - name: Service name (unique)
     * - description: Service description
     * - price: Service price in dollars
     * - duration: Service duration in minutes
     * - created_at, updated_at: Timestamps
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => {
      if (err.code !== '42P07') throw err;
    });
    console.log('✅ Users table created/verified');
    
    // Create services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => {
      if (err.code !== '42P07') throw err;
    });
    console.log('✅ Services table created/verified');
    
    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        service_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => {
      if (err.code !== '42P07') throw err;
    });
    console.log('✅ Bookings table created/verified');
    
    // ============= CREATE INDEXES =============
    
    /**
     * Create Database Indexes
     * 
     * Indexes improve query performance by creating fast lookup structures.
     * They are especially important for frequently queried columns.
     */
    
    // Index on bookings.user_id - speeds up queries filtering by user
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)
    `).catch(err => {
      // Ignore error if index already exists (PostgreSQL error code 42710)
      if (err.code !== '42710') throw err;
    });
    
    // Index on bookings.service_id - speeds up queries filtering by service
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    
    // Index on bookings.date - speeds up date range queries and sorting
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    
    // Index on users.email - speeds up login queries (email lookup)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    console.log('✅ Indexes created/verified');
    
    // ============= INSERT INITIAL DATA =============
    
    /**
     * Insert Initial Services
     * 
     * Populates the services table with default services that users can book.
     * Uses ON CONFLICT DO NOTHING to prevent duplicate inserts on re-runs.
     */
    await client.query(`
      INSERT INTO services (name, description, price, duration) VALUES
        ('Haircut', 'Professional haircut', 50.00, 60),
        ('Manicure', 'Nail care service', 30.00, 45),
        ('Massage', 'Relaxing massage', 80.00, 90)
      ON CONFLICT (name) DO NOTHING
    `).catch(err => {
      if (err.code !== '23505') throw err;
    });
    console.log('✅ Initial services data inserted/verified');
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    // Log detailed error information for debugging
    console.error('❌ Migration error:', error.message);
    console.error('Error code:', error.code);
    // Re-throw error so calling code can handle it
    throw error;
  } finally {
    // Always release the client back to the pool, even if an error occurred
    // This prevents connection leaks
    client.release();
  }
}

/**
 * Direct Execution Handler
 * 
 * If this file is run directly (e.g., `node db/migrate.js`),
 * execute the migrations and exit with appropriate status code.
 * 
 * This allows migrations to be run manually for testing or troubleshooting.
 */
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);  // Exit with success code
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);  // Exit with error code
    });
}

// Export the runMigrations function for use in server.js
module.exports = { runMigrations };
