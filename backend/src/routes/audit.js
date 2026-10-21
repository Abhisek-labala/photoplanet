const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
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

    const logs = await db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) {
    console.error('Audit route error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs', details: err.message });
  }
});

module.exports = router;
