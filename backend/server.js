const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ============= CORS CONFIGURATION =============
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json());

// ============= IN-MEMORY DATABASE =============
// W produkcji: PostgreSQL + Prisma ORM

let users = [
  {
    id: 1,
    email: 'test@example.com',
    password: '$2a$10$...',  // bcrypt hash
    name: 'Test User'
  }
];

let services = [
  { id: 1, name: 'Haircut', description: 'Professional haircut', price: 50, duration: 60 },
  { id: 2, name: 'Manicure', description: 'Nail care service', price: 30, duration: 45 },
  { id: 3, name: 'Massage', description: 'Relaxing massage', price: 80, duration: 90 }
];

let bookings = [];

// ============= AUTHENTICATION ROUTES =============

// Rejestracja
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Walidacja
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // BEZPIECZEŃSTWO: Sprawdzenie czy user już istnieje (SQL Injection prevention)
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // BEZPIECZEŃSTWO: Hashing hasła
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tworzenie nowego użytkownika
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name
    };

    users.push(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logowanie
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // BEZPIECZEŃSTWO: Parametrized lookup (nie raw SQL)
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // BEZPIECZEŃSTWO: Bcrypt comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // BEZPIECZEŃSTWO: JWT token creation
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
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVICES ROUTES =============

app.get('/api/services', (req, res) => {
  try {
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/services/:id', (req, res) => {
  try {
    // BEZPIECZEŃSTWO: parseInt to prevent injection
    const serviceId = parseInt(req.params.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (err) {
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
app.get('/api/bookings', authenticateToken, (req, res) => {
  try {
    // BEZPIECZEŃSTWO: Użytkownik widzi tylko swoje rezerwacje
    const userBookings = bookings.filter(b => b.userId === req.userId);
    res.json(userBookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Stworzenie nowej rezerwacji
app.post('/api/bookings', authenticateToken, (req, res) => {
  try {
    const { serviceId, date, time } = req.body;

    // Walidacja
    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // BEZPIECZEŃSTWO: Sprawdzenie czy usługa istnieje
    const service = services.find(s => s.id === parseInt(serviceId));
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // BEZPIECZEŃSTWO: Date validation
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (bookingDate < new Date()) {
      return res.status(400).json({ error: 'Cannot book past dates' });
    }

    // Tworzenie rezerwacji
    const newBooking = {
      id: bookings.length + 1,
      userId: req.userId,
      serviceId: parseInt(serviceId),
      serviceName: service.name,
      date,
      time,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };

    bookings.push(newBooking);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Anulowanie rezerwacji
app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // BEZPIECZEŃSTWO: Użytkownik może usunąć tylko swoje rezerwacje
    if (booking.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    bookings = bookings.filter(b => b.id !== bookingId);

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= SERVER START =============

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api\n`);
});