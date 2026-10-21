const express = require('express');
const router = express.Router();
const { db, getNextClientCode } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);

// Search & List clients
router.get('/', (req, res) => {
  const { search, includeArchived } = req.query;
  let query = `
    SELECT c.*, 
      (SELECT COUNT(*) FROM events e WHERE e.client_id = c.id) as events_count,
      (SELECT COUNT(*) FROM quotations q WHERE q.client_id = c.id) as quotations_count
    FROM clients c
    WHERE 1=1
  `;
  const params = [];

  if (includeArchived !== 'true') {
    query += ' AND c.archived = 0';
  }

  if (search && search.trim()) {
    query += ` AND (c.name LIKE ? OR c.mobile LIKE ? OR c.client_code LIKE ? OR c.city LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY c.created_at DESC';

  const clients = db.prepare(query).all(...params);
  res.json({ clients });
});

// Check if mobile number already exists (duplicate mobile warning check)
router.get('/check-mobile', (req, res) => {
  const { mobile, excludeId } = req.query;
  if (!mobile) {
    return res.json({ exists: false });
  }

  let query = 'SELECT id, client_code, name, mobile, city FROM clients WHERE mobile = ?';
  const params = [mobile.trim()];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const existing = db.prepare(query).get(...params);
  if (existing) {
    return res.json({
      exists: true,
      message: `A client with this mobile number already exists: ${existing.name} (${existing.client_code})`,
      client: existing
    });
  }
  res.json({ exists: false });
});

// Get single client details with events and quotations
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const events = db.prepare(`
    SELECT e.*, et.name as event_type_name 
    FROM events e 
    LEFT JOIN event_types et ON e.event_type_id = et.id 
    WHERE e.client_id = ? 
    ORDER BY e.event_date ASC
  `).all(id);

  const quotations = db.prepare(`
    SELECT q.*, u.name as created_by_name 
    FROM quotations q 
    LEFT JOIN users u ON q.created_by = u.id 
    WHERE q.client_id = ? 
    ORDER BY q.created_at DESC
  `).all(id);

  res.json({ client, events, quotations });
});

// Create client
router.post('/', (req, res) => {
  const { name, mobile, alternate_mobile, email, address, city, state, pincode, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Primary mobile number is required.' });
  }

  const clientCode = getNextClientCode();

  const insert = db.prepare(`
    INSERT INTO clients (client_code, name, mobile, alternate_mobile, email, address, city, state, pincode, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    clientCode,
    name.trim(),
    mobile.trim(),
    alternate_mobile ? alternate_mobile.trim() : null,
    email ? email.trim() : null,
    address || null,
    city || null,
    state || null,
    pincode || null,
    notes || null
  );

  const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user, 'CREATE_CLIENT', 'clients', result.lastInsertRowid, null, newClient, req.ip);

  res.status(201).json({
    message: 'Client created successfully',
    client: newClient
  });
});

// Update client
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, mobile, alternate_mobile, email, address, city, state, pincode, notes } = req.body;

  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Primary mobile number is required.' });
  }

  db.prepare(`
    UPDATE clients SET 
      name = ?, mobile = ?, alternate_mobile = ?, email = ?, 
      address = ?, city = ?, state = ?, pincode = ?, notes = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name.trim(),
    mobile.trim(),
    alternate_mobile ? alternate_mobile.trim() : null,
    email ? email.trim() : null,
    address || null,
    city || null,
    state || null,
    pincode || null,
    notes || null,
    id
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  logAudit(req.user, 'UPDATE_CLIENT', 'clients', id, existing, updated, req.ip);

  res.json({ message: 'Client updated successfully', client: updated });
});

// Archive client (soft delete)
router.post('/:id/archive', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  db.prepare('UPDATE clients SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(req.user, 'ARCHIVE_CLIENT', 'clients', id, existing, { archived: 1 }, req.ip);

  res.json({ message: 'Client archived successfully' });
});

// Restore client
router.post('/:id/restore', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  db.prepare('UPDATE clients SET archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(req.user, 'RESTORE_CLIENT', 'clients', id, existing, { archived: 0 }, req.ip);

  res.json({ message: 'Client restored successfully' });
});

module.exports = router;
