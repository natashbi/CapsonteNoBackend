const express = require('express');
const pool = require('../config/database');
const { generateId, hashPassword, comparePassword, generateToken, logAudit } = require('../utils/helpers');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE (username = $1 OR email = $1)',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password. Please check your credentials.' });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact IT Administrator.' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password. Please check your credentials.' });
    }

    // Check member approval status if role is member
    if (user.role === 'member' && user.member_id) {
      const memberResult = await pool.query(
        'SELECT approval_status FROM members WHERE id = $1',
        [user.member_id]
      );

      if (memberResult.rows.length === 0 || memberResult.rows[0].approval_status !== 'Approved') {
        return res.status(403).json({ error: 'Your account is awaiting approval. Please wait for Coordinator approval before logging in.' });
      }
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = generateToken({
      id: user.id,
      role: user.role,
      name: user.name,
      memberId: user.member_id
    });

    await logAudit(pool, user.id, 'User login', 'users', user.id, { username });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        memberId: user.member_id,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, email, phone, employeeId, department, age, gender, civilStatus, password, photo, dependents } = req.body;

    // Check if user/email exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [email.split('@')[0], email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Username or email already exists.');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (phone lives on the members table, not users)
    const userId = generateId('U');
    await client.query(
      'INSERT INTO users (id, name, username, email, password, role, photo, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
      [userId, name, email.split('@')[0], email, hashedPassword, 'member', photo || null, true]
    );

    // Create member profile
    const memberId = generateId('M');
    await client.query(
      'INSERT INTO members (id, employee_id, name, email, phone, department, age, gender, civil_status, status, photo, approval_status, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())',
      [memberId, employeeId, name, email, phone, department, age, gender, civilStatus || 'Single', 'Permanent', photo || null, 'Pending', true]
    );

    // Insert dependents if provided
    if (Array.isArray(dependents) && dependents.length > 0) {
      for (const dep of dependents) {
        const depId = generateId('D');
        await client.query(
          'INSERT INTO dependents (id, member_id, name, relationship, age, photo, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [depId, memberId, dep.name, dep.relationship || null, dep.age || null, dep.photo || null]
        );
      }
    }

    // Link user to member
    await client.query(
      'UPDATE users SET member_id = $1 WHERE id = $2',
      [memberId, userId]
    );

    await logAudit(client, userId, 'User registration', 'members', memberId, { email, memberId });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Registration successful. Awaiting coordinator approval.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await comparePassword(currentPassword, result.rows[0].password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );

    await logAudit(pool, userId, 'Password changed', 'users', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update profile photo
router.post('/update-photo', verifyToken, async (req, res) => {
  try {
    const { photo } = req.body;
    const userId = req.user.id;

    await pool.query(
      'UPDATE users SET photo = $1, updated_at = NOW() WHERE id = $2',
      [photo, userId]
    );

    // Also update member photo if member
    if (req.user.memberId) {
      await pool.query(
        'UPDATE members SET photo = $1, updated_at = NOW() WHERE id = $2',
        [photo, req.user.memberId]
      );
    }

    await logAudit(pool, userId, 'Profile photo updated', 'users', userId);

    res.json({ photo });
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
