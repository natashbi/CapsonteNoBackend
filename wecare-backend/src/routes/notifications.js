const express = require('express');
const pool = require('../config/database');
const { generateId } = require('../utils/helpers');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, message, type, userId, recipientRole } = req.body;

    // Resolve target user IDs in priority order:
    //   recipientRole → fan out to every active user holding that role
    //   userId        → single specific user
    //   neither       → falls back to the creator (legacy behavior)
    let targetUserIds = [];
    if (recipientRole) {
      const result = await pool.query(
        `SELECT id FROM users WHERE role = $1 AND active = true`,
        [recipientRole]
      );
      targetUserIds = result.rows.map(r => r.id);
      if (targetUserIds.length === 0) {
        return res.status(404).json({ error: `No active users found with role '${recipientRole}'.` });
      }
    } else if (userId) {
      targetUserIds = [userId];
    } else {
      targetUserIds = [req.user.id];
    }

    // One row per recipient — keeps the per-user read state simple.
    const created = [];
    for (const targetId of targetUserIds) {
      const notifId = generateId('N');
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
         VALUES ($1, $2, $3, $4, $5, false, NOW())`,
        [notifId, targetId, title, message, type || null]
      );
      created.push(notifId);
    }

    res.status(201).json({
      success: true,
      created: created.length,
      ids: created,
      recipientRole: recipientRole || null,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/mark-read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET read = true, updated_at = NOW() WHERE id = $1',
      [id]
    );

    const updated = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = true, updated_at = NOW() WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
