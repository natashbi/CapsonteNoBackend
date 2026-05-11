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
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.DB_PORT || 5432}`);
    console.log(`Database: ${process.env.DB_NAME || 'wecare_db'}`);
    console.log(`User: ${process.env.DB_USER || 'postgres'}`);
    console.log('');

    const result = await pool.query('SELECT NOW(), version()');
    console.log('✓ Connection successful!');
    console.log(`Current time: ${result.rows[0].now}`);
    console.log(`PostgreSQL version: ${result.rows[0].version}`);

    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n✓ Found ${tableCheck.rows.length} tables:`);
    tableCheck.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    await pool.end();
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('PostgreSQL server is not running on localhost:5432');
    }
    process.exit(1);
  }
}

testConnection();
