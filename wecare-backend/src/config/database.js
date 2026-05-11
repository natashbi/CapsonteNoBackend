const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wecare_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_HOST?.includes('supabase') ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('ERROR: PostgreSQL server is not running or not accessible at localhost:5432');
  } else if (err.code === '3D000') {
    console.error('ERROR: Database "wecare_db" does not exist. Run: npm run setup');
  } else if (err.code === '28P01') {
    console.error('ERROR: Invalid database credentials. Check .env file.');
  }
  process.exit(-1);
});

module.exports = pool;
