const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const generateId = (prefix) => `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateSerialNo = (prefix, existingItems) => {
  const lastSerial = existingItems
    .map(item => parseInt(item.serial_no))
    .filter(num => !isNaN(num))
    .sort((a, b) => b - a)[0] || 0;

  return String(lastSerial + 1).padStart(6, '0');
};

const logAudit = async (pool, userId, action, entityType = null, entityId = null, details = {}) => {
  const auditId = generateId('A');
  try {
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [auditId, userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

module.exports = {
  generateId,
  hashPassword,
  comparePassword,
  generateToken,
  generateSerialNo,
  logAudit
};
