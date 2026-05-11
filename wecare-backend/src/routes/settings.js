const express = require('express');
const pool = require('../config/database');
const { logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        coverageLimit: 150000,
        memberConsultLimit: 24,
        dependentConsultLimit: 4,
        loaValidityDays: 7,
        lowBalanceThreshold: 30000,
        programYearStart: 'January',
        orgName: 'Wesleyan University — Philippines',
        primaryContact: '',
        primaryEmail: '',
        requireMfa: false,
        autoLogout: true,
        strongPasswords: true,
        auditAllActions: true
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      coverageLimit, memberConsultLimit, dependentConsultLimit, loaValidityDays,
      lowBalanceThreshold, programYearStart, orgName, primaryContact, primaryEmail,
      requireMfa, autoLogout, strongPasswords, auditAllActions
    } = req.body;

    // Delete old settings and insert new one
    await pool.query('DELETE FROM settings');

    const result = await pool.query(
      `INSERT INTO settings (coverage_limit, member_consult_limit, dependent_consult_limit, loa_validity_days, low_balance_threshold, program_year_start, org_name, primary_contact, primary_email, require_mfa, auto_logout, strong_passwords, audit_all_actions, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [coverageLimit, memberConsultLimit, dependentConsultLimit, loaValidityDays, lowBalanceThreshold, programYearStart, orgName, primaryContact, primaryEmail, requireMfa, autoLogout, strongPasswords, auditAllActions]
    );

    await logAudit(pool, req.user.id, 'Settings updated', 'settings', 'settings');

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
