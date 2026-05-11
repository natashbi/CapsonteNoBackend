const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const pool = require('./config/database');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/loas', require('./routes/loas'));
app.use('/api/soas', require('./routes/soas'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit', require('./routes/audit'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('ERROR: PostgreSQL server is not running or not accessible at localhost:5432');
      console.error('Make sure PostgreSQL is running and accessible before starting the server.');
    } else if (err.code === '3D000') {
      console.error('ERROR: Database "wecare_db" does not exist. Run: npm run setup');
    } else if (err.code === '28P01') {
      console.error('ERROR: Invalid database credentials. Check .env file for correct DB_USER and DB_PASSWORD.');
    }
  } else {
    console.log('✓ Database connected successfully');
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
