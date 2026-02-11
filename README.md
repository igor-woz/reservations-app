# Reservations App

A full-stack web application for booking services with time slot management. Users can register, browse services, book appointments from predefined time slots, and manage their bookings. Includes email confirmations and a secure password reset flow.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)
![Express](https://img.shields.io/badge/Express-4.18-gray)

## Features

- **User authentication** – Register, login, and JWT-based sessions
- **Password reset** – Secure forgot-password flow with email link (token expires in 1 hour)
- **Services** – Browse available services with descriptions, prices, and durations
- **Time slot booking** – Predefined timeslots per service; only available slots can be selected
- **No double booking** – Database and API enforce one booking per slot
- **Profile** – Dashboard with account info, booking summary, and upcoming appointments
- **Bookings** – View, create, and cancel bookings
- **Email** – Confirmation emails for registration and booking; password reset link via email
- **Responsive UI** – Works on desktop and mobile

## Tech Stack

| Layer    | Technologies |
|----------|--------------|
| Frontend | Next.js 14 (App Router), React 18, CSS3 |
| Backend  | Node.js, Express.js |
| Database | PostgreSQL |
| Auth     | JWT, bcryptjs |
| Email    | Nodemailer (SMTP) |

## Prerequisites

- **Node.js** v14+
- **PostgreSQL** v12+
- **npm** (included with Node.js)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/reservations-app.git
cd reservations-app
```

### 2. Database setup

Create a PostgreSQL database:

```bash
createdb reservations_db
# Or with psql:
# psql -U your_username -c "CREATE DATABASE reservations_db;"
```

### 3. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see **Environment variables** below). Example:

```env
PORT=5001
JWT_SECRET=your_secret_key_change_in_production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=reservations_db
DB_USER=your_username
DB_PASSWORD=your_password

# Optional: email (SMTP). If omitted, confirmations are logged to console.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=Reservations App
EMAIL_APP_NAME=Reservations App
```

On macOS with Homebrew PostgreSQL, `DB_USER` is often your system username (`whoami`).

### 4. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 5. Run the application

**Terminal 1 – backend**

```bash
cd backend
npm run dev
```

Runs on `http://localhost:5001`. Migrations run automatically on startup.

**Terminal 2 – frontend**

```bash
cd frontend
npm run dev
```

Runs on `http://localhost:3000`.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project structure

```
reservations-app/
├── backend/
│   ├── config/database.js    # PostgreSQL pool and query helper
│   ├── db/
│   │   ├── migrate.js        # Runs migrations on startup
│   │   └── migrations/       # SQL schema
│   ├── services/email.js     # Registration, booking, password-reset emails
│   ├── server.js             # Express app and API routes
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── auth/             # login, register, forgot-password, reset-password
│   │   ├── profile/          # User profile and booking summary
│   │   ├── bookings/         # List and cancel bookings
│   │   ├── services/         # Browse services and book
│   │   └── page.js           # Home
│   ├── components/           # Header, BookingForm
│   ├── lib/                  # api.js, auth.js
│   └── package.json
└── README.md
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/register` | Register |
| POST   | `/api/auth/login` | Login |
| POST   | `/api/auth/forgot-password` | Request password reset email |
| POST   | `/api/auth/reset-password` | Reset password with token |
| GET    | `/api/services` | List services |
| GET    | `/api/services/:id` | Get one service |
| GET    | `/api/services/:id/timeslots?date=YYYY-MM-DD` | Available timeslots |
| GET    | `/api/bookings` | User’s bookings (auth) |
| POST   | `/api/bookings` | Create booking (auth) |
| DELETE | `/api/bookings/:id` | Cancel booking (auth) |

## Environment variables

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `5001`) |
| `JWT_SECRET` | Secret for signing JWTs |
| `FRONTEND_URL` | Frontend origin for CORS and reset links |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional; for sending email |
| `EMAIL_FROM_NAME`, `EMAIL_APP_NAME` | Optional; used in emails |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:5001`) |

## Security

- Passwords hashed with bcrypt
- JWT for authenticated routes
- Password reset: one-time token (SHA-256 stored), 1-hour expiry
- No email enumeration on forgot-password
- Parameterized DB queries
- CORS restricted to `FRONTEND_URL`

## Deployment

- **Frontend**: e.g. Vercel – set `NEXT_PUBLIC_API_URL` to your backend URL.
- **Backend**: e.g. Railway, Render – set `FRONTEND_URL` and DB/email env vars.
- Ensure `FRONTEND_URL` matches the deployed frontend so password reset links work.

## License

ISC.
