const express = require('express');
const pool = require('../config/database');
const { generateId, generateSerialNo, logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loas ORDER BY date_issued DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { memberId, consultationId, hospital, procedures, dateIssued, validity, requestingDoctor, approvedAmount, rbPerDay, mbl } = req.body;

    const existingResult = await pool.query('SELECT serial_no FROM loas ORDER BY created_at DESC LIMIT 100');
    const serialNo = generateSerialNo('LOA', existingResult.rows);
    const loaId = generateId('LOA');

    await pool.query(
      `INSERT INTO loas (id, serial_no, member_id, consultation_id, hospital, procedures, date_issued, validity, requesting_doctor, approved_amount, rb_per_day, mbl, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [loaId, serialNo, memberId, consultationId || null, hospital, procedures, dateIssued, validity || 7, requestingDoctor, approvedAmount || 0, rbPerDay || null, mbl || null, 'Pending']
    );

    await logAudit(pool, req.user.id, 'LOA created', 'loas', loaId, { memberId, serialNo });

    const newLoa = await pool.query('SELECT * FROM loas WHERE id = $1', [loaId]);
    res.status(201).json(newLoa.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hospital, procedures, dateIssued, validity, requestingDoctor, approvedAmount, rbPerDay, mbl, status } = req.body;

    await pool.query(
      `UPDATE loas SET hospital = $1, procedures = $2, date_issued = $3, validity = $4, requesting_doctor = $5, approved_amount = $6, rb_per_day = $7, mbl = $8, status = $9, updated_at = NOW()
       WHERE id = $10`,
      [hospital, procedures, dateIssued, validity, requestingDoctor, approvedAmount, rbPerDay, mbl, status, id]
    );

    await logAudit(pool, req.user.id, 'LOA updated', 'loas', id);

    const updated = await pool.query('SELECT * FROM loas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/approve', verifyToken, authorizeRoles('admin', 'coordinator', 'director'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE loas SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user.name, id]
    );

    await logAudit(pool, req.user.id, 'LOA approved', 'loas', id);

    const updated = await pool.query('SELECT * FROM loas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reject', verifyToken, authorizeRoles('admin', 'coordinator', 'director'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      `UPDATE loas SET status = 'Rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason || '', id]
    );

    await logAudit(pool, req.user.id, 'LOA rejected', 'loas', id);

    const updated = await pool.query('SELECT * FROM loas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/record-visit', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { visitDate, doctorSeen, visitNotes } = req.body;

    await pool.query(
      `UPDATE loas SET status = 'Used', visit_date = $1, doctor_seen = $2, visit_notes = $3, updated_at = NOW()
       WHERE id = $4`,
      [visitDate, doctorSeen, visitNotes, id]
    );

    await logAudit(pool, req.user.id, 'LOA visit recorded', 'loas', id);

    const updated = await pool.query('SELECT * FROM loas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
