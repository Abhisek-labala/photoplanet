const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require('../db');
const { DB_PATH, DATA_DIR } = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const upload = multer({ dest: path.join(DATA_DIR, 'temp-uploads') });

router.use(authenticateToken);
router.use(requireAdmin);

// Download SQLite DB file
router.get('/download', (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'Database file not found.' });
  }

  // Checkpoint WAL to flush all transactions into main DB file
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.warn('WAL checkpoint warning:', err.message);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `studio-gfx-backup-${timestamp}.db`;

  logAudit(req.user, 'BACKUP_DOWNLOAD', 'database', 'sqlite', null, { filename }, req.ip);

  res.download(DB_PATH, filename);
});

// Export all data as JSON
router.get('/export-json', (req, res) => {
  const tables = [
    'users', 'clients', 'event_types', 'events', 'service_categories',
    'services', 'quotations', 'quotation_events', 'quotation_items',
    'quotation_payment_terms', 'quotation_status_history', 'settings', 'quotation_sequence'
  ];

  const exportData = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    data: {}
  };

  tables.forEach(tableName => {
    try {
      exportData.data[tableName] = db.prepare(`SELECT * FROM ${tableName}`).all();
    } catch (err) {
      exportData.data[tableName] = [];
    }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=studio-gfx-export-${timestamp}.json`);

  logAudit(req.user, 'EXPORT_JSON', 'database', 'json', null, null, req.ip);

  res.send(JSON.stringify(exportData, null, 2));
});

// Restore database from uploaded JSON or .db file
router.post('/restore', upload.single('backupFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a backup file.' });
  }

  const uploadedPath = req.file.path;
  const originalName = req.file.originalname.toLowerCase();

  try {
    if (originalName.endsWith('.json')) {
      const fileContent = fs.readFileSync(uploadedPath, 'utf8');
      const parsed = JSON.parse(fileContent);

      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Invalid JSON backup file structure.');
      }

      // Perform restore in transaction
      const transaction = db.transaction(() => {
        // Clean existing tables in reverse foreign-key order
        const clearTables = [
          'quotation_payment_terms', 'quotation_items', 'quotation_events',
          'quotation_status_history', 'quotations', 'events', 'clients',
          'services', 'service_categories', 'event_types', 'quotation_sequence', 'settings'
        ];
        clearTables.forEach(t => db.prepare(`DELETE FROM ${t}`).run());

        // Restore each table
        for (const [table, rows] of Object.entries(parsed.data)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          if (table === 'users' || table === 'audit_logs') continue; // Preserve credentials & audit safety

          const sample = rows[0];
          const cols = Object.keys(sample);
          const placeholders = cols.map(() => '?').join(', ');
          const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);

          rows.forEach(row => {
            insertStmt.run(...cols.map(c => row[c]));
          });
        }
      });

      transaction();
      logAudit(req.user, 'RESTORE_JSON', 'database', 'json', null, { originalName }, req.ip);

      // Clean up uploaded file
      fs.unlinkSync(uploadedPath);
      return res.json({ message: 'Database successfully restored from JSON backup.' });
    } else if (originalName.endsWith('.db') || originalName.endsWith('.sqlite')) {
      // Create emergency snapshot of current DB before replacement
      const preRestoreBackup = path.join(DATA_DIR, `pre-restore-auto-${Date.now()}.db`);
      fs.copyFileSync(DB_PATH, preRestoreBackup);

      // Close current db WAL, copy new DB over
      db.pragma('wal_checkpoint(TRUNCATE)');
      fs.copyFileSync(uploadedPath, DB_PATH);
      fs.unlinkSync(uploadedPath);

      logAudit(req.user, 'RESTORE_DB', 'database', 'sqlite', { preRestoreBackup }, { originalName }, req.ip);
      return res.json({ message: 'Database restored successfully from .db file. Server reloaded.' });
    } else {
      fs.unlinkSync(uploadedPath);
      return res.status(400).json({ error: 'Unsupported file format. Please upload a .db, .sqlite or .json file.' });
    }
  } catch (err) {
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

module.exports = router;
