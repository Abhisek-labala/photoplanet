const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);
router.use(requireAdmin);

// List users
router.get('/', async (req, res) => {
  const users = await db.prepare(`
    SELECT id, name, username, mobile, role, active, two_factor_enabled, created_at, updated_at
    FROM users
    ORDER BY role ASC, name ASC
  `).all();
  res.json({ users: users.map(u => ({ ...u, two_factor_enabled: Number(u.two_factor_enabled || 0) })) });
});

// Create new user
router.post('/', async (req, res) => {
  const { name, username, mobile, password, role } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Name, username, password, and role are required.' });
  }

  if (!['ADMIN', 'QUOTATION_STAFF'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either ADMIN or QUOTATION_STAFF.' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this username already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const insert = db.prepare(`
    INSERT INTO users (name, username, mobile, password_hash, role, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const result = await insert.run(name.trim(), username.trim(), mobile || null, passwordHash, role);

  await logAudit(req.user, 'CREATE_USER', 'users', result.lastInsertRowid, null, { name, username, role }, req.ip);

  res.status(201).json({
    message: 'User created successfully',
    user: { id: result.lastInsertRowid, name, username, mobile, role, active: 1 }
  });
});

// Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, mobile, role, active, password } = req.body;

  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
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

  await db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

  await logAudit(req.user, 'UPDATE_USER', 'users', id, existing, { name, mobile, role, active }, req.ip);

  res.json({ message: 'User updated successfully' });
});

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (req.user.id === parseInt(id, 10)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Soft delete / disable
  await db.prepare('UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  await logAudit(req.user, 'DEACTIVATE_USER', 'users', id, existing, { active: 0 }, req.ip);

  res.json({ message: 'User account deactivated successfully' });
});

// Admin reset Google Authenticator 2FA for a user
router.post('/:id/reset-2fa', async (req, res) => {
  const { id } = req.params;
  const targetUser = await db.prepare('SELECT id, name, username FROM users WHERE id = ?').get(id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  await db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  await logAudit(req.user, 'ADMIN_RESET_2FA', 'users', id, null, `Admin reset 2FA for user ${targetUser.username}`, req.ip);

  res.json({ message: `Google Authenticator reset successfully for ${targetUser.username}.` });
});

module.exports = router;
