const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateId, logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all members
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, json_agg(json_build_object(
        'id', d.id,
        'name', d.name,
        'relationship', d.relationship,
        'age', d.age,
        'photo', d.photo
      )) FILTER (WHERE d.id IS NOT NULL) as dependents
      FROM members m
      LEFT JOIN dependents d ON m.id = d.member_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create member
router.post('/', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, employeeId, department, email, phone, age, gender, civilStatus, status, photo, dateHired, password, dependents } = req.body;
    const memberId = generateId('M');

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await client.query(
      `INSERT INTO members (id, employee_id, name, email, phone, department, age, gender, civil_status, status, photo, date_hired, active, approval_status, password, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
      [memberId, employeeId, name, email, phone, department, age, gender, civilStatus || 'Single', status || 'Permanent', photo || null, dateHired || null, true, 'Approved', hashedPassword]
    );

    // Add dependents if provided
    if (dependents && Array.isArray(dependents)) {
      for (const dep of dependents) {
        const depId = generateId('D');
        await client.query(
          `INSERT INTO dependents (id, member_id, name, relationship, age, photo, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [depId, memberId, dep.name, dep.relationship, dep.age || null, dep.photo || null]
        );
      }
    }

    await logAudit(client, req.user.id, 'Member created', 'members', memberId, { name, employeeId });
    await client.query('COMMIT');

    const newMember = await pool.query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    res.status(201).json(newMember.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create member error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update member
router.put('/:id', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, department, email, phone, age, gender, civilStatus, status, photo, dateHired, dependents } = req.body;

    await client.query(
      `UPDATE members SET name = $1, department = $2, email = $3, phone = $4, age = $5, gender = $6, civil_status = $7, status = $8, photo = $9, date_hired = $10, updated_at = NOW()
       WHERE id = $11`,
      [name, department, email, phone, age, gender, civilStatus, status, photo, dateHired, id]
    );

    // Update dependents
    if (dependents && Array.isArray(dependents)) {
      // Remove old dependents
      await client.query('DELETE FROM dependents WHERE member_id = $1', [id]);

      // Add new dependents
      for (const dep of dependents) {
        const depId = dep.id?.startsWith('D') ? dep.id : generateId('D');
        await client.query(
          `INSERT INTO dependents (id, member_id, name, relationship, age, photo, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [depId, id, dep.name, dep.relationship, dep.age || null, dep.photo || null]
        );
      }
    }

    await logAudit(client, req.user.id, 'Member updated', 'members', id, { name });
    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update member error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Delete member
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM members WHERE id = $1', [id]);
    await logAudit(pool, req.user.id, 'Member deleted', 'members', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve member
router.post('/:id/approve', verifyToken, authorizeRoles('admin', 'coordinator', 'director'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Get member details
    const memberResult = await client.query('SELECT * FROM members WHERE id = $1', [id]);
    if (memberResult.rows.length === 0) {
      throw new Error('Member not found');
    }
    const member = memberResult.rows[0];

    // Update member approval status
    await client.query(
      `UPDATE members SET approval_status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user.name, id]
    );

    // Check if user account already exists
    const existingUser = await client.query('SELECT id FROM users WHERE member_id = $1', [id]);

    if (existingUser.rows.length === 0) {
      // Create user account with email as username and stored password
      const userId = generateId('U');
      const hashedPassword = member.password || await bcrypt.hash('member123', 10);

      await client.query(
        `INSERT INTO users (id, name, username, email, password, role, member_id, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, member.name, member.email, member.email, hashedPassword, 'member', id, true]
      );
    }

    await logAudit(client, req.user.id, 'Member approved', 'members', id);
    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve member error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Reject member
router.post('/:id/reject', verifyToken, authorizeRoles('admin', 'coordinator', 'director'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      `UPDATE members SET approval_status = 'Rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason || '', id]
    );

    await logAudit(pool, req.user.id, 'Member rejected', 'members', id, { reason });

    const updated = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
