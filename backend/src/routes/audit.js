const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const { limit = 50, entity, search } = req.query;
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (entity) {
    query += ' AND entity = ?';
    params.push(entity);
  }

  if (search && search.trim()) {
    query += ' AND (action LIKE ? OR username LIKE ? OR entity_id LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit) || 50);

  const logs = db.prepare(query).all(...params);
  res.json({ logs });
});

module.exports = router;
