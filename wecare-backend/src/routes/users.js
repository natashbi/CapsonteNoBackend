const express = require('express');
const pool = require('../config/database');
const { generateId, hashPassword, logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, username, email, role, active, last_login, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, username, email, role, password } = req.body;

    const hashedPassword = await hashPassword(password);
    const userId = generateId('U');

    await pool.query(
      `INSERT INTO users (id, name, username, email, password, role, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, name, username, email, hashedPassword, role, true]
    );

    await logAudit(pool, req.user.id, 'User created', 'users', userId, { username });

    const newUser = await pool.query(
      'SELECT id, name, username, email, role, active, created_at FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, active, password } = req.body;

    let query = 'UPDATE users SET name = $1, username = $2, email = $3, role = $4, active = $5, updated_at = NOW()';
    let params = [name, username, email, role, active, id];

    if (password) {
      const hashedPassword = await hashPassword(password);
      query = 'UPDATE users SET name = $1, username = $2, email = $3, role = $4, active = $5, password = $6, updated_at = NOW()';
      params = [name, username, email, role, active, hashedPassword, id];
    }

    query += ' WHERE id = $' + params.length;

    await pool.query(query, params);

    await logAudit(pool, req.user.id, 'User updated', 'users', id);

    const updated = await pool.query(
      'SELECT id, name, username, email, role, active, created_at FROM users WHERE id = $1',
      [id]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    await logAudit(pool, req.user.id, 'User deleted', 'users', id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/toggle-active', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query('SELECT active FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newActive = !userResult.rows[0].active;

    await pool.query(
      'UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2',
      [newActive, id]
    );

    await logAudit(pool, req.user.id, `User ${newActive ? 'enabled' : 'disabled'}`, 'users', id);

    const updated = await pool.query(
      'SELECT id, name, username, email, role, active FROM users WHERE id = $1',
      [id]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
