const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);

// Get event types
router.get('/', (req, res) => {
  const { all } = req.query;
  let query = 'SELECT * FROM event_types';
  if (all !== 'true') {
    query += ' WHERE active = 1';
  }
  query += ' ORDER BY sort_order ASC, name ASC';
  const eventTypes = db.prepare(query).all();
  res.json({ eventTypes });
});

// Create event type (Admin only)
router.post('/', requireAdmin, (req, res) => {
  const { name, description, sort_order } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Event type name is required.' });
  }

  const existing = db.prepare('SELECT id FROM event_types WHERE name = ? COLLATE NOCASE').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'An event type with this name already exists.' });
  }

  const result = db.prepare(`
    INSERT INTO event_types (name, description, sort_order)
    VALUES (?, ?, ?)
  `).run(name.trim(), description || null, sort_order || 0);

  logAudit(req.user, 'CREATE_EVENT_TYPE', 'event_types', result.lastInsertRowid, null, { name, description }, req.ip);

  res.status(201).json({
    message: 'Event type created successfully',
    eventType: { id: result.lastInsertRowid, name: name.trim(), description, active: 1, sort_order: sort_order || 0 }
  });
});

// Update event type (Admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, active, sort_order } = req.body;

  const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Event type not found.' });
  }

  db.prepare(`
    UPDATE event_types SET
      name = ?,
      description = ?,
      active = ?,
      sort_order = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : existing.name,
    description !== undefined ? description : existing.description,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    sort_order !== undefined ? sort_order : existing.sort_order,
    id
  );

  logAudit(req.user, 'UPDATE_EVENT_TYPE', 'event_types', id, existing, { name, description, active, sort_order }, req.ip);

  res.json({ message: 'Event type updated successfully' });
});

// Delete event type (Admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const inUse = db.prepare('SELECT COUNT(*) as count FROM events WHERE event_type_id = ?').get(id);
  if (inUse.count > 0) {
    // Soft disable instead of delete
    db.prepare('UPDATE event_types SET active = 0 WHERE id = ?').run(id);
    return res.json({ message: 'Event type is in use by events. It has been deactivated instead of deleted.' });
  }

  db.prepare('DELETE FROM event_types WHERE id = ?').run(id);
  logAudit(req.user, 'DELETE_EVENT_TYPE', 'event_types', id, null, null, req.ip);
  res.json({ message: 'Event type deleted successfully' });
});

module.exports = router;
