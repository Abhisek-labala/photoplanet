const { db } = require('../db');

async function logAudit(user, action, entity, entityId, oldValue, newValue, ip) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity, entity_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt.run(
      user ? user.id : null,
      user ? user.username : 'SYSTEM',
      action,
      entity,
      String(entityId || ''),
      typeof oldValue === 'object' ? JSON.stringify(oldValue) : (oldValue ? String(oldValue) : null),
      typeof newValue === 'object' ? JSON.stringify(newValue) : (newValue ? String(newValue) : null),
      ip || null
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
