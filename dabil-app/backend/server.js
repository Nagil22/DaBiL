require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Make pool available to controllers
app.locals.db = pool;

// Middleware - UPDATED CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000'
];

// Add ngrok domains dynamically
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Allow any ngrok.io subdomain for development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(/\.ngrok\.io$/);
  allowedOrigins.push(/\.ngrok-free\.app$/);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/restaurants', require('./routes/restaurant'));
app.use('/api/sessions', require('./routes/session'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/staff', require('./routes/staff'));  
app.use('/api/manager', require('./routes/manager'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test database connection
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'Database connected', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed', 
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5004;

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    
    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Create super admin on initialization
    await createSuperAdmin();
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
      console.log(`✅ Database test: http://localhost:${PORT}/api/db-test`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

// Create super admin if doesn't exist
async function createSuperAdmin() {
  try {
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin'] // Check for existing admin role
    );
    
    if (existingAdmin.rows.length === 0) {
      const result = await pool.query(`
        INSERT INTO users (phone, email, name, phone_verified, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, ['+2348000000000', 'admin@dabil.com', 'Super Admin', true, 'admin']); // Use 'admin' role
      
      console.log('✅ Super Admin created:');
      console.log(`   Email: admin@dabil.com`);
      console.log(`   Phone: +2348000000000`);
      console.log(`   Role: admin`);
    } else {
      console.log('✅ Super Admin already exists');
    }
  } catch (error) {
    console.error('Failed to create super admin:', error);
  }
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});