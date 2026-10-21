const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user, 'LOGIN', 'users', user.id, null, 'User logged in', req.ip);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      mobile: user.mobile,
      role: user.role
    }
  });
});

// Current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, username, mobile, role, active, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  logAudit(req.user, 'LOGOUT', 'users', req.user.id, null, 'User logged out', req.ip);
  res.json({ message: 'Logged out successfully' });
});

// Change Password
router.put('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

  logAudit(req.user, 'CHANGE_PASSWORD', 'users', req.user.id, null, 'Password updated', req.ip);
  res.json({ message: 'Password changed successfully.' });
});

module.exports = router;
