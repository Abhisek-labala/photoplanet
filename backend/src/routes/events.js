const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);

// List events with filter
router.get('/', (req, res) => {
  const { clientId, status, upcoming, search } = req.query;
  let query = `
    SELECT e.*, c.name as client_name, c.mobile as client_mobile, c.client_code, et.name as event_type_name
    FROM events e
    JOIN clients c ON e.client_id = c.id
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE 1=1
  `;
  const params = [];

  if (clientId) {
    query += ' AND e.client_id = ?';
    params.push(clientId);
  }

  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  }

  if (upcoming === 'true') {
    const today = new Date().toISOString().split('T')[0];
    query += ' AND e.event_date >= ?';
    params.push(today);
  }

  if (search && search.trim()) {
    query += ' AND (e.event_name LIKE ? OR e.venue LIKE ? OR e.city LIKE ? OR c.name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY e.event_date ASC';

  const events = db.prepare(query).all(...params);
  res.json({ events });
});

// Get single event
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const event = db.prepare(`
    SELECT e.*, c.name as client_name, c.mobile as client_mobile, c.client_code, et.name as event_type_name
    FROM events e
    JOIN clients c ON e.client_id = c.id
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.id = ?
  `).get(id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Also fetch related quotations
  const quotations = db.prepare(`
    SELECT q.* FROM quotations q
    JOIN quotation_events qe ON qe.quotation_id = q.id
    WHERE qe.event_id = ?
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all(id);

  res.json({ event, quotations });
});

// Create event
router.post('/', (req, res) => {
  const {
    client_id, event_type_id, event_name, event_date, end_date,
    venue, city, requirements, special_instructions, notes, status
  } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'Client is required.' });
  }
  if (!event_date) {
    return res.status(400).json({ error: 'Event date is required.' });
  }
  if (!event_name || !event_name.trim()) {
    return res.status(400).json({ error: 'Event name is required.' });
  }

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
  if (!client) {
    return res.status(400).json({ error: 'Selected client does not exist.' });
  }

  const insert = db.prepare(`
    INSERT INTO events (
      client_id, event_type_id, event_name, event_date, end_date,
      venue, city, requirements, special_instructions, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    client_id,
    event_type_id || null,
    event_name.trim(),
    event_date,
    end_date || null,
    venue || null,
    city || null,
    requirements || null,
    special_instructions || null,
    notes || null,
    status || 'Enquiry'
  );

  const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user, 'CREATE_EVENT', 'events', result.lastInsertRowid, null, newEvent, req.ip);

  res.status(201).json({
    message: 'Event created successfully',
    event: newEvent
  });
});

// Update event
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    event_type_id, event_name, event_date, end_date,
    venue, city, requirements, special_instructions, notes, status
  } = req.body;

  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  db.prepare(`
    UPDATE events SET
      event_type_id = ?,
      event_name = ?,
      event_date = ?,
      end_date = ?,
      venue = ?,
      city = ?,
      requirements = ?,
      special_instructions = ?,
      notes = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    event_type_id !== undefined ? event_type_id : existing.event_type_id,
    event_name ? event_name.trim() : existing.event_name,
    event_date || existing.event_date,
    end_date !== undefined ? end_date : existing.end_date,
    venue !== undefined ? venue : existing.venue,
    city !== undefined ? city : existing.city,
    requirements !== undefined ? requirements : existing.requirements,
    special_instructions !== undefined ? special_instructions : existing.special_instructions,
    notes !== undefined ? notes : existing.notes,
    status || existing.status,
    id
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  logAudit(req.user, 'UPDATE_EVENT', 'events', id, existing, updated, req.ip);

  res.json({ message: 'Event updated successfully', event: updated });
});

// Delete event
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  logAudit(req.user, 'DELETE_EVENT', 'events', id, existing, null, req.ip);
  res.json({ message: 'Event deleted successfully' });
});

module.exports = router;
