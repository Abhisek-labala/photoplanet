const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);
router.use(requireAdmin);

// List users
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, username, mobile, role, active, created_at, updated_at
    FROM users
    ORDER BY role ASC, name ASC
  `).all();
  res.json({ users });
});

// Create new user
router.post('/', (req, res) => {
  const { name, username, mobile, password, role } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Name, username, password, and role are required.' });
  }

  if (!['ADMIN', 'QUOTATION_STAFF'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either ADMIN or QUOTATION_STAFF.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (existing) {
    return res.status(400).json({ error: 'A user with this username already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const insert = db.prepare(`
    INSERT INTO users (name, username, mobile, password_hash, role, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const result = insert.run(name, username, mobile || null, passwordHash, role);

  logAudit(req.user, 'CREATE_USER', 'users', result.lastInsertRowid, null, { name, username, role }, req.ip);

  res.status(201).json({
    message: 'User created successfully',
    user: { id: result.lastInsertRowid, name, username, mobile, role, active: 1 }
  });
});

// Update user
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, mobile, role, active, password } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent deactivating own account
  if (req.user.id === parseInt(id, 10) && active === 0) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  let updateFields = ['name = ?', 'mobile = ?', 'role = ?', 'active = ?', 'updated_at = CURRENT_TIMESTAMP'];
  let params = [
    name || existing.name,
    mobile !== undefined ? mobile : existing.mobile,
    role || existing.role,
    active !== undefined ? (active ? 1 : 0) : existing.active
  ];

  if (password && password.trim().length > 0) {
    const hash = bcrypt.hashSync(password, 10);
    updateFields.push('password_hash = ?');
    params.push(hash);
  }

  params.push(id);

  db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

  logAudit(req.user, 'UPDATE_USER', 'users', id, existing, { name, mobile, role, active }, req.ip);

  res.json({ message: 'User updated successfully' });
});

// Delete user
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (req.user.id === parseInt(id, 10)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Soft delete / disable
  db.prepare('UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(req.user, 'DEACTIVATE_USER', 'users', id, existing, { active: 0 }, req.ip);

  res.json({ message: 'User account deactivated successfully' });
});

module.exports = router;
