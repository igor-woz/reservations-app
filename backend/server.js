const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { query } = require('./config/database');
const { runMigrations } = require('./db/migrate');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json());

// ============= AUTHENTICATION ROUTES =============

// Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Input validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if the email was used for registration before
    const existingUserResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    // New user creation
    const result = await query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Paprameterized 
    const result = await query(
      'SELECT id, email, password, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Bcrypt comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT token creation
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVICES ROUTES =============

app.get('/api/services', async (req, res) => {
  try {
    const result = await query('SELECT id, name, description, price, duration FROM services ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    
    const result = await query(
      'SELECT id, name, description, price, duration FROM services WHERE id = $1',
      [serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get service error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= AUTHENTICATION MIDDLEWARE =============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = decoded.id;
    next();
  });
};

// ============= BOOKINGS ROUTES =============

// Pobranie rezerwacji użytkownika
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // BEZPIECZEŃSTWO: Użytkownik widzi tylko swoje rezerwacje
    const result = await query(
      `SELECT id, user_id as "userId", service_id as "serviceId", service_name as "serviceName", 
       date, time, status, created_at as "createdAt"
       FROM bookings 
       WHERE user_id = $1 
       ORDER BY date DESC, time DESC`,
      [req.userId]
    );
    
    // Convert date and time to strings for JSON response
    const bookings = result.rows.map(booking => ({
      ...booking,
      date: booking.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      time: booking.time, // Keep time as string
      createdAt: booking.createdAt.toISOString()
    }));
    
    res.json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stworzenie nowej rezerwacji
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { serviceId, date, time } = req.body;

    // Walidacja
    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // BEZPIECZEŃSTWO: Sprawdzenie czy usługa istnieje
    const serviceResult = await query(
      'SELECT id, name FROM services WHERE id = $1',
      [parseInt(serviceId)]
    );
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = serviceResult.rows[0];

    // BEZPIECZEŃSTWO: Date validation
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (bookingDate < new Date()) {
      return res.status(400).json({ error: 'Cannot book past dates' });
    }

    // Tworzenie rezerwacji
    const result = await query(
      `INSERT INTO bookings (user_id, service_id, service_name, date, time, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id as "userId", service_id as "serviceId", 
                 service_name as "serviceName", date, time, status, created_at as "createdAt"`,
      [req.userId, parseInt(serviceId), service.name, date, time, 'confirmed']
    );

    const newBooking = result.rows[0];
    
    // Format response
    const bookingResponse = {
      id: newBooking.id,
      userId: newBooking.userId,
      serviceId: newBooking.serviceId,
      serviceName: newBooking.serviceName,
      date: newBooking.date.toISOString().split('T')[0],
      time: newBooking.time,
      createdAt: newBooking.createdAt.toISOString(),
      status: newBooking.status
    };

    res.status(201).json({
      message: 'Booking created successfully',
      booking: bookingResponse
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Anulowanie rezerwacji
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    // BEZPIECZEŃSTWO: Sprawdzenie czy rezerwacja istnieje i należy do użytkownika
    const bookingResult = await query(
      'SELECT id, user_id FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // BEZPIECZEŃSTWO: Użytkownik może usunąć tylko swoje rezerwacje
    if (booking.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVER START =============

const PORT = process.env.PORT || 5001;

// Start server after database is ready
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });