const express = require('express');
const pool = require('../config/database');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin', 'director'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        al.id,
        al.user_id,
        u.name as user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.timestamp
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 1000
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
