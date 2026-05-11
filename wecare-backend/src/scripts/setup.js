// Database setup script — works for both local PostgreSQL and hosted DBs (Supabase, Neon, etc.).
//
// Local Postgres: connects to the maintenance `postgres` DB to CREATE DATABASE
// (skipped if it already exists), then switches to it to run schema.sql.
//
// Hosted Postgres: the database is provisioned by the provider, so the
// CREATE DATABASE step is best-effort — we skip it on permission errors and
// run the schema directly against the configured DB_NAME.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const isHosted = process.env.DB_HOST?.includes('supabase')
  || process.env.DB_HOST?.includes('neon')
  || process.env.DB_HOST?.includes('render')
  || process.env.DB_HOST?.includes('railway');

const sslConfig = isHosted ? { rejectUnauthorized: false } : false;

const targetDb = process.env.DB_NAME || 'wecare_db';

async function tryCreateDatabase() {
  // Hosted providers don't allow CREATE DATABASE — skip entirely.
  if (isHosted) {
    console.log(`Hosted provider detected — using existing database "${targetDb}".`);
    return;
  }

  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    ssl: sslConfig,
  });

  const client = await adminPool.connect();
  try {
    console.log('Creating database...');
    try {
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`✓ Database "${targetDb}" created`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`✓ Database "${targetDb}" already exists`);
      } else if (error.code === '42501') {
        console.log(`! Skipping CREATE DATABASE (permission denied) — assuming "${targetDb}" exists`);
      } else {
        throw error;
      }
    }
  } finally {
    client.release();
    await adminPool.end();
  }
}

async function applySchema() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: targetDb,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    ssl: sslConfig,
  });

  const client = await pool.connect();
  try {
    console.log('Applying schema.sql...');
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Run as a single statement so dollar-quoted blocks (none here yet) survive,
    // but plain semicolons in the file split fine for our schema.
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log('✓ Schema applied');

    // Default settings — only insert if the table is empty so we don't duplicate.
    const settingsCount = await client.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCount.rows[0].count, 10) === 0) {
      console.log('Inserting default settings...');
      await client.query(`
        INSERT INTO settings (coverage_limit, member_consult_limit, dependent_consult_limit, loa_validity_days, low_balance_threshold, program_year_start, org_name, primary_contact, primary_email, auto_logout, strong_passwords, audit_all_actions, updated_at)
        VALUES (150000, 24, 4, 7, 30000, 'January', 'Wesleyan University — Philippines', 'Maria Santos', 'wecare@wup.edu.ph', true, true, true, NOW())
      `);
      console.log('✓ Default settings inserted');
    } else {
      console.log('✓ Settings already present — skipping');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

(async () => {
  try {
    console.log(`\nSetting up WeCare Database (${isHosted ? 'hosted' : 'local'})...\n`);
    await tryCreateDatabase();
    await applySchema();
    console.log('\n✅ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('  npm run seed   # populate demo users + members');
    console.log('  npm run dev    # start the API server');
  } catch (error) {
    console.error('\n❌ Setup error:', error.message);
    process.exit(1);
  }
})();
