const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const QRCode = require('qrcode');
const { db } = require('../db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // If user has Google Authenticator 2FA enabled, issue a temporary 2FA token
  if (user.two_factor_enabled && user.two_factor_secret) {
    const tempToken = jwt.sign(
      { id: user.id, username: user.username, type: '2fa_pending' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({
      require2fa: true,
      tempToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username
      }
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN || '7d' }
  );

  await logAudit(user, 'LOGIN', 'users', user.id, null, 'User logged in', req.ip);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      two_factor_enabled: Number(user.two_factor_enabled || 0)
    }
  });
});

// Verify Google Authenticator 2FA code during login
router.post('/verify-2fa', async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ error: '2FA session token and verification code are required.' });
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: '2FA verification session has expired. Please sign in again.' });
  }

  if (!payload || payload.type !== '2fa_pending' || !payload.id) {
    return res.status(401).json({ error: 'Invalid 2FA session token.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!user || !user.active) {
    return res.status(401).json({ error: 'User account not found or inactive.' });
  }

  if (!user.two_factor_enabled || !user.two_factor_secret) {
    return res.status(400).json({ error: 'Google Authenticator 2FA is not enabled for this account.' });
  }

  const cleanCode = String(code).trim().replace(/\s+/g, '');
  const result = otplib.verifySync({
    token: cleanCode,
    secret: user.two_factor_secret,
    epochTolerance: 30
  });

  if (!result || !result.valid) {
    return res.status(400).json({ error: 'Invalid Google Authenticator code. Please check your authenticator app and try again.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN || '7d' }
  );

  await logAudit(user, 'LOGIN_2FA', 'users', user.id, null, 'User logged in with Google Authenticator', req.ip);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      two_factor_enabled: 1
    }
  });
});

// Setup Google Authenticator 2FA (Generates secret and QR code)
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = otplib.generateSecret();

    const studioRow = await db.prepare("SELECT value FROM settings WHERE key = 'studio_name'").get();
    let studioName = 'Photo Planet';
    if (studioRow && studioRow.value) {
      try {
        studioName = JSON.parse(studioRow.value);
      } catch {
        studioName = studioRow.value;
      }
    }

    const otpauth = otplib.generateURI({
      issuer: studioName || 'Photo Planet',
      label: user.username,
      secret
    });

    const qrCode = await QRCode.toDataURL(otpauth, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256
    });

    res.json({
      secret,
      qrCode,
      otpauth
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate 2FA setup details: ' + err.message });
  }
});

// Confirm and Enable Google Authenticator 2FA
router.post('/2fa/enable', authenticateToken, async (req, res) => {
  const { secret, code } = req.body;
  if (!secret || !code) {
    return res.status(400).json({ error: 'Secret and verification code are required.' });
  }

  const cleanCode = String(code).trim().replace(/\s+/g, '');
  const result = otplib.verifySync({
    token: cleanCode,
    secret,
    epochTolerance: 30
  });

  if (!result || !result.valid) {
    return res.status(400).json({ error: 'Invalid verification code. Please check the code in your Google Authenticator app and try again.' });
  }

  await db.prepare('UPDATE users SET two_factor_enabled = 1, two_factor_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(secret, req.user.id);

  await logAudit(req.user, 'ENABLE_2FA', 'users', req.user.id, null, 'Google Authenticator 2FA enabled', req.ip);

  res.json({
    message: 'Google Authenticator enabled successfully.',
    two_factor_enabled: 1
  });
});

// Disable Google Authenticator 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  const { password, code } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let verified = false;
  if (password) {
    verified = bcrypt.compareSync(password, user.password_hash);
  } else if (code && user.two_factor_secret) {
    const cleanCode = String(code).trim().replace(/\s+/g, '');
    const result = otplib.verifySync({
      token: cleanCode,
      secret: user.two_factor_secret,
      epochTolerance: 30
    });
    verified = !!(result && result.valid);
  }

  if (!verified) {
    return res.status(400).json({ error: 'Incorrect password or invalid authenticator code.' });
  }

  await db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);

  await logAudit(req.user, 'DISABLE_2FA', 'users', req.user.id, null, 'Google Authenticator 2FA disabled', req.ip);

  res.json({
    message: 'Google Authenticator disabled successfully.',
    two_factor_enabled: 0
  });
});

// Current user profile
router.get('/me', authenticateToken, async (req, res) => {
  const user = await db.prepare('SELECT id, name, username, mobile, role, active, two_factor_enabled, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.two_factor_enabled = Number(user.two_factor_enabled || 0);
  res.json({ user });
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  await logAudit(req.user, 'LOGOUT', 'users', req.user.id, null, 'User logged out', req.ip);
  res.json({ message: 'Logged out successfully' });
});

// Change Password
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

  await logAudit(req.user, 'CHANGE_PASSWORD', 'users', req.user.id, null, 'Password updated', req.ip);
  res.json({ message: 'Password changed successfully.' });
});

// Forgot Password (Reset via username and registered mobile number verification)
router.post('/forgot-password', async (req, res) => {
  const { username, mobile, newPassword } = req.body;
  if (!username || !mobile || !newPassword) {
    return res.status(400).json({ error: 'Username, registered mobile number, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!user || !user.active) {
    return res.status(404).json({ error: 'No active account found with this username.' });
  }

  const cleanDbMobile = (user.mobile || '').replace(/\D/g, '');
  const cleanInputMobile = String(mobile).replace(/\D/g, '');

  if (!cleanDbMobile || cleanDbMobile !== cleanInputMobile) {
    return res.status(400).json({ error: 'The mobile number does not match our records for this username.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, user.id);

  await logAudit(user, 'RESET_PASSWORD', 'users', user.id, null, 'Password reset via mobile verification', req.ip);

  res.json({ message: 'Password reset successfully! You can now sign in with your new password.' });
});

module.exports = router;
