const express = require('express');
const pool = require('../config/database');
const { generateId, generateSerialNo, logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all consultations
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM consultations
      ORDER BY date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create consultation
router.post('/', verifyToken, authorizeRoles('admin', 'coordinator', 'member'), async (req, res) => {
  try {
    const { memberId, dependentId, date, patientType, chiefComplaints, peFindings, plan, diagnosis, physician, requestedBy } = req.body;

    // Members may only request consultations for their own member account
    if (req.user.role === 'member' && memberId !== req.user.memberId) {
      return res.status(403).json({ error: 'You can only request consultations for your own account.' });
    }

    // Get existing consultations to generate serial number
    const existingResult = await pool.query(
      'SELECT serial_no FROM consultations ORDER BY created_at DESC LIMIT 100'
    );

    const serialNo = generateSerialNo('C', existingResult.rows);
    const consultationId = generateId('C');

    await pool.query(
      `INSERT INTO consultations (id, serial_no, member_id, dependent_id, date, patient_type, chief_complaints, pe_findings, plan, diagnosis, physician, status, requested_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [consultationId, serialNo, memberId, dependentId || null, date, patientType, chiefComplaints, peFindings, plan, diagnosis, physician, 'Pending', requestedBy]
    );

    await logAudit(pool, req.user.id, 'Consultation created', 'consultations', consultationId, { memberId, serialNo });

    const newConsult = await pool.query(
      'SELECT * FROM consultations WHERE id = $1',
      [consultationId]
    );

    res.status(201).json(newConsult.rows[0]);
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update consultation
router.put('/:id', verifyToken, authorizeRoles('admin', 'coordinator', 'member'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Load the existing consultation so we can enforce member ownership and
    // protect privileged fields from member-initiated edits.
    const existing = await pool.query('SELECT * FROM consultations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }
    const current = existing.rows[0];

    if (req.user.role === 'member') {
      if (current.member_id !== req.user.memberId) {
        return res.status(403).json({ error: 'You can only update your own consultations.' });
      }
    }

    // Members may only set the document fields; everything else stays as-is.
    // Staff (admin/coordinator) may update everything, with sensible fallbacks
    // to the existing row when a field is omitted from the payload.
    const isMember = req.user.role === 'member';
    const next = {
      date:               isMember ? current.date              : (body.date              ?? current.date),
      patientType:        isMember ? current.patient_type      : (body.patientType       ?? current.patient_type),
      chiefComplaints:    isMember ? current.chief_complaints  : (body.chiefComplaints   ?? current.chief_complaints),
      peFindings:         isMember ? current.pe_findings       : (body.peFindings        ?? current.pe_findings),
      plan:               isMember ? current.plan              : (body.plan              ?? current.plan),
      diagnosis:          isMember ? current.diagnosis         : (body.diagnosis         ?? current.diagnosis),
      status:             isMember ? current.status            : (body.status            ?? current.status),
      physician:          isMember ? current.physician         : (body.physician         ?? current.physician),
      documentUploaded:   body.documentUploaded ?? current.document_uploaded,
      documentName:       body.documentName     ?? current.document_name,
    };

    await pool.query(
      `UPDATE consultations SET date = $1, patient_type = $2, chief_complaints = $3, pe_findings = $4, plan = $5, diagnosis = $6, status = $7, physician = $8, document_uploaded = $9, document_name = $10, updated_at = NOW()
       WHERE id = $11`,
      [next.date, next.patientType, next.chiefComplaints, next.peFindings, next.plan, next.diagnosis, next.status, next.physician, next.documentUploaded, next.documentName, id]
    );

    await logAudit(pool, req.user.id, 'Consultation updated', 'consultations', id);

    const updated = await pool.query('SELECT * FROM consultations WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete consultation
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM consultations WHERE id = $1', [id]);
    await logAudit(pool, req.user.id, 'Consultation deleted', 'consultations', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve consultation
router.post('/:id/approve', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE consultations SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user.name, id]
    );

    await logAudit(pool, req.user.id, 'Consultation approved', 'consultations', id);

    const updated = await pool.query('SELECT * FROM consultations WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Approve consultation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
