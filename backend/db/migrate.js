const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute statements one by one, handling multi-line SQL properly
    // First, let's execute the CREATE TABLE statements explicitly
    
    // Create users table
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
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `).catch(err => {
      if (err.code !== '42710') throw err;
    });
    console.log('✅ Indexes created/verified');
    
    // Insert initial services data
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
    console.error('❌ Migration error:', error.message);
    console.error('Error code:', error.code);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
