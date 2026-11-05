const { Pool, types } = require('pg');
// Automatically parse NUMERIC/DECIMAL as float
types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

const { DATABASE_URL } = require('./config');

const pgUrl = DATABASE_URL || 'postgresql://postgres:abhisek@localhost:5432/photoplanet';

const pool = new Pool({
  connectionString: pgUrl,
  ssl: pgUrl.includes('localhost') || pgUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

// Convert SQLite SQL syntax into PostgreSQL syntax
function convertSql(sql) {
  let idx = 1;
  let pgSql = sql.replace(/\?/g, () => `$${idx++}`);
  // Date format conversion (supports both text and timestamp columns)
  pgSql = pgSql.replace(/strftime\(['"]%Y-%m['"],\s*([^)]+)\)/gi, "SUBSTR($1::text, 1, 7)");
  pgSql = pgSql.replace(/strftime\(['"]%Y['"],\s*([^)]+)\)/gi, "SUBSTR($1::text, 1, 4)");
  // Case insensitivity
  pgSql = pgSql.replace(/COLLATE\s+NOCASE/gi, '');
  return pgSql;
}

// Check if RETURNING id should be appended
function shouldAppendReturningId(sql) {
  if (!/^\s*INSERT\s+INTO/i.test(sql)) return false;
  if (/RETURNING/i.test(sql)) return false;
  const match = /^\s*INSERT\s+INTO\s+([^\s(]+)/i.exec(sql);
  if (match) {
    const table = match[1].replace(/["`]/g, '').toLowerCase().split('.').pop();
    if (['quotation_sequence', 'settings'].includes(table)) {
      return false;
    }
  }
  return true;
}

const db = {
  pool,

  async query(sql, params = []) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return pool.query(convertSql(sql), flat);
  },

  async all(sql, params = []) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const res = await pool.query(convertSql(sql), flat);
    return res.rows;
  },

  async get(sql, params = []) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const res = await pool.query(convertSql(sql), flat);
    return res.rows[0] || null;
  },

  async run(sql, params = []) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    let pgSql = convertSql(sql);
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
    if (shouldAppendReturningId(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await pool.query(pgSql, flat);
    return {
      changes: res.rowCount,
      lastInsertRowid: isInsert && res.rows && res.rows.length > 0 && res.rows[0].id != null ? res.rows[0].id : null
    };
  },

  prepare(sql) {
    return {
      async all(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(convertSql(sql), flat);
        return res.rows;
      },
      async get(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = await pool.query(convertSql(sql), flat);
        return res.rows[0] || null;
      },
      async run(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        let pgSql = convertSql(sql);
        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
        if (shouldAppendReturningId(pgSql)) {
          pgSql += ' RETURNING id';
        }
        const res = await pool.query(pgSql, flat);
        return {
          changes: res.rowCount,
          lastInsertRowid: isInsert && res.rows && res.rows.length > 0 && res.rows[0].id != null ? res.rows[0].id : null
        };
      }
    };
  },

  // Transaction support for PostgreSQL
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txDb = {
        async query(sql, params = []) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return client.query(convertSql(sql), flat);
        },
        async all(sql, params = []) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await client.query(convertSql(sql), flat);
          return res.rows;
        },
        async get(sql, params = []) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await client.query(convertSql(sql), flat);
          return res.rows[0] || null;
        },
        async run(sql, params = []) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          let pgSql = convertSql(sql);
          const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
          if (shouldAppendReturningId(pgSql)) {
            pgSql += ' RETURNING id';
          }
          const res = await client.query(pgSql, flat);
          return {
            changes: res.rowCount,
            lastInsertRowid: isInsert && res.rows && res.rows.length > 0 && res.rows[0].id != null ? res.rows[0].id : null
          };
        },
        prepare(sql) {
          return {
            async all(...params) {
              const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
              const res = await client.query(convertSql(sql), flat);
              return res.rows;
            },
            async get(...params) {
              const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
              const res = await client.query(convertSql(sql), flat);
              return res.rows[0] || null;
            },
            async run(...params) {
              const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
              let pgSql = convertSql(sql);
              const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
              if (shouldAppendReturningId(pgSql)) {
                pgSql += ' RETURNING id';
              }
              const res = await client.query(pgSql, flat);
              return {
                changes: res.rowCount,
                lastInsertRowid: isInsert && res.rows && res.rows.length > 0 && res.rows[0].id != null ? res.rows[0].id : null
              };
            }
          };
        }
      };
      const result = await fn(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

// Generate atomic next quotation number
async function getNextQuotationNumber() {
  const currentYear = new Date().getFullYear();
  const prefixRow = await db.prepare("SELECT value FROM settings WHERE key = 'quotation_prefix'").get();
  const prefix = prefixRow ? prefixRow.value : 'SGFX';

  const startNumRow = await db.prepare("SELECT value FROM settings WHERE key = 'quotation_start_number'").get();
  const startNum = startNumRow ? parseInt(startNumRow.value, 10) : 1;

  // Find highest existing quotation number for this year to prevent collision
  const highestRow = await pool.query(`
    SELECT quotation_number FROM quotations 
    WHERE quotation_number LIKE $1 
    ORDER BY id DESC LIMIT 20
  `, [`%-${currentYear}-%`]);

  let maxExisting = 0;
  for (const r of highestRow.rows) {
    const parts = (r.quotation_number || '').split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxExisting) {
      maxExisting = num;
    }
  }

  const initialNum = Math.max(startNum, maxExisting + 1, 1);

  // Check if sequence row exists
  const seqRes = await pool.query('SELECT current_number FROM quotation_sequence WHERE year = $1', [currentYear]);

  let nextNum;
  if (seqRes.rows.length === 0) {
    const insRes = await pool.query(`
      INSERT INTO quotation_sequence (year, current_number)
      VALUES ($1, $2)
      ON CONFLICT (year) DO UPDATE
      SET current_number = GREATEST(quotation_sequence.current_number + 1, $2)
      RETURNING current_number
    `, [currentYear, initialNum]);
    nextNum = insRes.rows[0].current_number;
  } else {
    const updRes = await pool.query(`
      UPDATE quotation_sequence
      SET current_number = GREATEST(current_number + 1, $2)
      WHERE year = $1
      RETURNING current_number
    `, [currentYear, initialNum]);
    nextNum = updRes.rows[0].current_number;
  }

  const padded = String(nextNum).padStart(4, '0');
  return `${prefix}-${currentYear}-${padded}`;
}

// Generate client code atomically
async function getNextClientCode() {
  const currentYear = new Date().getFullYear();
  const highestRow = await pool.query(`
    SELECT client_code FROM clients 
    WHERE client_code LIKE $1 
    ORDER BY id DESC LIMIT 50
  `, [`CL-${currentYear}-%`]);

  let maxNum = 0;
  for (const r of highestRow.rows) {
    const parts = (r.client_code || '').split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `CL-${currentYear}-${String(nextNum).padStart(4, '0')}`;
}

console.log('[PostgreSQL] Database module initialized. Connected to:', pgUrl.replace(/:[^:@]+@/, ':****@'));

// Ensure two_factor columns and table updates exist in database individually
async function runAutoMigrations() {
  const migrations = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT DEFAULT NULL',
    `CREATE TABLE IF NOT EXISTS service_event_prices (
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
      price NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (service_id, event_type_id)
    )`
  ];
  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn('[PostgreSQL Migration Warning]:', err.message);
    }
  }
}
runAutoMigrations();

module.exports = {
  db,
  pool,
  getNextQuotationNumber,
  getNextClientCode
};
