const express = require('express');
const pool = require('../config/database');
const { generateId, logAudit } = require('../utils/helpers');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET — include attached documents + JSON fields so the frontend can render them
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', d.id,
            'name', d.file_name,
            'fileType', d.file_type,
            'fileSize', d.file_size,
            'description', d.description,
            'data', d.data,
            'createdAt', d.created_at
          ))
          FROM soa_documents d WHERE d.soa_id = s.id),
          '[]'::json
        ) AS documents
      FROM soas s
      ORDER BY s.uploaded_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get SOAs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recompute the total deterministically from breakdown so the client can't drift.
const computeTotal = ({ laboratory = 0, xray = 0, medicines = 0, others = 0, professionalFee = 0 }) =>
  Number(laboratory) + Number(xray) + Number(medicines) + Number(others) + Number(professionalFee);

router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      memberId, loaId,
      laboratory = 0, xray = 0, medicines = 0, others = 0, professionalFee = 0,
      remarks,
      documents = [],
      fileDescriptions = [],
      incompleteItems = [],
      lineItems = [],
      dateUploaded,
    } = req.body;

    const total = computeTotal({ laboratory, xray, medicines, others, professionalFee });
    const soaId = generateId('SOA');

    await client.query(
      `INSERT INTO soas (id, member_id, loa_id, laboratory, xray, medicines, others, professional_fee, total, remarks, status, uploaded_by, uploaded_at, incomplete_items, line_items, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13::date, NOW()), $14::jsonb, $15::jsonb, NOW())`,
      [
        soaId, memberId, loaId || null,
        laboratory, xray, medicines, others, professionalFee, total,
        remarks || null, 'Pending', req.user.name,
        dateUploaded || null,
        JSON.stringify(incompleteItems),
        JSON.stringify(lineItems),
      ]
    );

    // Persist each uploaded document with its matching description
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc) continue;
      const docId = generateId('SDOC');
      await client.query(
        `INSERT INTO soa_documents (id, soa_id, file_name, file_type, file_size, description, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          docId, soaId,
          doc.name || `document_${i + 1}`,
          doc.fileType || null,
          doc.fileSize || null,
          fileDescriptions[i] || null,
          doc.data || null,
        ]
      );
    }

    await logAudit(client, req.user.id, 'SOA created', 'soas', soaId, { memberId, documentCount: documents.length });
    await client.query('COMMIT');

    // Return the SOA together with its documents so the client can immediately render them
    const result = await pool.query(`
      SELECT s.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', d.id, 'name', d.file_name, 'description', d.description, 'data', d.data
          ))
          FROM soa_documents d WHERE d.soa_id = s.id),
          '[]'::json
        ) AS documents
      FROM soas s WHERE s.id = $1
    `, [soaId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create SOA error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      laboratory, xray, medicines, others, professionalFee, remarks, status,
      incompleteItems, lineItems,
    } = req.body;
    const total = computeTotal({ laboratory, xray, medicines, others, professionalFee });

    await pool.query(
      `UPDATE soas SET
         laboratory = $1, xray = $2, medicines = $3, others = $4, professional_fee = $5,
         total = $6, remarks = $7, status = $8,
         incomplete_items = COALESCE($9::jsonb, incomplete_items),
         line_items = COALESCE($10::jsonb, line_items),
         updated_at = NOW()
       WHERE id = $11`,
      [
        laboratory, xray, medicines, others, professionalFee,
        total, remarks, status,
        incompleteItems ? JSON.stringify(incompleteItems) : null,
        lineItems ? JSON.stringify(lineItems) : null,
        id,
      ]
    );

    await logAudit(pool, req.user.id, 'SOA updated', 'soas', id);

    const updated = await pool.query('SELECT * FROM soas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update SOA error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/approve', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE soas SET status = 'Reviewed', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user.name, id]
    );

    await logAudit(pool, req.user.id, 'SOA reviewed', 'soas', id);

    const updated = await pool.query('SELECT * FROM soas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reject', verifyToken, authorizeRoles('admin', 'coordinator'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE soas SET status = 'Rejected', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await logAudit(pool, req.user.id, 'SOA rejected', 'soas', id);

    const updated = await pool.query('SELECT * FROM soas WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
