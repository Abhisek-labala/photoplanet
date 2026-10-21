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

// Download backup
router.get('/download', async (req, res) => {
  try {
    const tables = [
      'users', 'clients', 'event_types', 'events', 'service_categories',
      'services', 'quotations', 'quotation_events', 'quotation_items',
      'quotation_payment_terms', 'quotation_status_history', 'settings', 'quotation_sequence'
    ];

    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      database: 'postgresql',
      data: {}
    };

    for (const tableName of tables) {
      try {
        exportData.data[tableName] = await db.prepare(`SELECT * FROM ${tableName}`).all();
      } catch (err) {
        exportData.data[tableName] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=photoplanet-backup-${timestamp}.json`);

    await logAudit(req.user, 'BACKUP_DOWNLOAD', 'database', 'json', null, null, req.ip);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

// Export all data as JSON
router.get('/export-json', async (req, res) => {
  try {
    const tables = [
      'users', 'clients', 'event_types', 'events', 'service_categories',
      'services', 'quotations', 'quotation_events', 'quotation_items',
      'quotation_payment_terms', 'quotation_status_history', 'settings', 'quotation_sequence'
    ];

    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      database: 'postgresql',
      data: {}
    };

    for (const tableName of tables) {
      try {
        exportData.data[tableName] = await db.prepare(`SELECT * FROM ${tableName}`).all();
      } catch (err) {
        exportData.data[tableName] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=photoplanet-export-${timestamp}.json`);

    await logAudit(req.user, 'EXPORT_JSON', 'database', 'json', null, null, req.ip);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// Restore database from uploaded JSON
router.post('/restore', upload.single('backupFile'), async (req, res) => {
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
      await db.transaction(async (tx) => {
        // Clean existing tables in reverse foreign-key order
        const clearTables = [
          'quotation_payment_terms', 'quotation_items', 'quotation_events',
          'quotation_status_history', 'quotations', 'events', 'clients',
          'services', 'service_categories', 'event_types', 'quotation_sequence', 'settings'
        ];
        for (const t of clearTables) {
          await tx.prepare(`DELETE FROM ${t}`).run();
        }

        // Restore each table
        for (const [table, rows] of Object.entries(parsed.data)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          if (table === 'users' || table === 'audit_logs') continue; // Preserve credentials & audit safety

          const sample = rows[0];
          const cols = Object.keys(sample);
          const placeholders = cols.map(() => '?').join(', ');
          const insertStmt = tx.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);

          for (const row of rows) {
            await insertStmt.run(...cols.map(c => row[c]));
          }
        }
      });

      await logAudit(req.user, 'RESTORE_JSON', 'database', 'json', null, { originalName }, req.ip);

      // Clean up uploaded file
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.json({ message: 'Database successfully restored from JSON backup.' });
    } else {
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({ error: 'PostgreSQL database only supports JSON backup restore (.json file).' });
    }
  } catch (err) {
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

module.exports = router;
