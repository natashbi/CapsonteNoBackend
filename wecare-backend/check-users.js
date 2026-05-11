// Quick helper to inspect users + members in the database.
// Usage:  node check-users.js
const pool = require('./src/config/database');

(async () => {
  try {
    const rows = await pool.query(`
      SELECT
        u.id          AS user_id,
        u.username,
        u.email,
        u.role,
        u.active,
        u.created_at,
        m.id          AS member_id,
        m.name        AS member_name,
        m.phone,
        m.department,
        m.approval_status
      FROM users u
      LEFT JOIN members m ON u.member_id = m.id
      ORDER BY u.created_at DESC
      LIMIT 20
    `);

    console.log('\n=== Latest 20 users (newest first) ===\n');
    rows.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.username}  [${r.role}]`);
      console.log(`   email   : ${r.email}`);
      console.log(`   active  : ${r.active}`);
      console.log(`   created : ${r.created_at}`);
      if (r.member_id) {
        console.log(`   member  : ${r.member_name} (${r.member_id})`);
        console.log(`   phone   : ${r.phone || '—'}`);
        console.log(`   dept    : ${r.department || '—'}`);
        console.log(`   status  : ${r.approval_status}`);
      } else {
        console.log(`   (staff account — no member profile)`);
      }
      console.log('');
    });

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)   AS total_users,
        (SELECT COUNT(*) FROM members) AS total_members,
        (SELECT COUNT(*) FROM members WHERE approval_status = 'Pending')  AS pending,
        (SELECT COUNT(*) FROM members WHERE approval_status = 'Approved') AS approved
    `);
    const c = counts.rows[0];
    console.log('=== Totals ===');
    console.log(`Users    : ${c.total_users}`);
    console.log(`Members  : ${c.total_members}  (Pending: ${c.pending}, Approved: ${c.approved})\n`);
  } catch (e) {
    console.error('Query error:', e.message);
  } finally {
    await pool.end();
  }
})();
