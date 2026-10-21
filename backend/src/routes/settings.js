const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Public settings (branding, studio name, tagline, currency) for login screen & PWA shell
router.get('/public', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  });

  res.json({
    studio_name: settings.studio_name || 'STUDIO PHOTOGRAPHY',
    tagline: settings.tagline || 'Photography • Cinematography • Albums • Live Streaming',
    currency_symbol: settings.currency_symbol || '₹',
    currency_code: settings.currency_code || 'INR',
    city: settings.city || '',
    state: settings.state || '',
    phone: settings.phone || '',
    email: settings.email || '',
    logo: settings.logo || '/logo.jpg'
  });
});

router.use(authenticateToken);

// Get all settings (authenticated)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  });
  res.json({ settings });
});

// Update settings (Admin only)
router.put('/', requireAdmin, (req, res) => {
  const updateData = req.body;
  if (!updateData || typeof updateData !== 'object') {
    return res.status(400).json({ error: 'Valid settings object is required.' });
  }

  const transaction = db.transaction(() => {
    const upsert = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, val] of Object.entries(updateData)) {
      const serialized = typeof val === 'object' ? JSON.stringify(val) : String(val);
      upsert.run(key, serialized);
    }
  });

  transaction();
  logAudit(req.user, 'UPDATE_SETTINGS', 'settings', 'global', null, updateData, req.ip);

  res.json({ message: 'Studio settings updated successfully' });
});

module.exports = router;
