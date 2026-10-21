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
  // Date format conversion
  pgSql = pgSql.replace(/strftime\(['"]%Y-%m['"],\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')");
  pgSql = pgSql.replace(/strftime\(['"]%Y['"],\s*([^)]+)\)/gi, "to_char($1, 'YYYY')");
  // Case insensitivity
  pgSql = pgSql.replace(/COLLATE\s+NOCASE/gi, '');
  return pgSql;
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
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await pool.query(pgSql, flat);
    return {
      changes: res.rowCount,
      lastInsertRowid: isInsert && res.rows.length > 0 ? (res.rows[0].id || res.rows[0].ID) : null
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
        if (isInsert && !/RETURNING/i.test(pgSql)) {
          pgSql += ' RETURNING id';
        }
        const res = await pool.query(pgSql, flat);
        return {
          changes: res.rowCount,
          lastInsertRowid: isInsert && res.rows.length > 0 ? (res.rows[0].id || res.rows[0].ID) : null
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
              if (isInsert && !/RETURNING/i.test(pgSql)) {
                pgSql += ' RETURNING id';
              }
              const res = await client.query(pgSql, flat);
              return {
                changes: res.rowCount,
                lastInsertRowid: isInsert && res.rows.length > 0 ? (res.rows[0].id || res.rows[0].ID) : null
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

  let row = await db.prepare('SELECT current_number FROM quotation_sequence WHERE year = ?').get(currentYear);
  let nextNum = 1;
  if (!row) {
    const startNumRow = await db.prepare("SELECT value FROM settings WHERE key = 'quotation_start_number'").get();
    const startNum = startNumRow ? parseInt(startNumRow.value, 10) : 1;
    nextNum = Math.max(startNum, 1);
    await db.prepare('INSERT INTO quotation_sequence (year, current_number) VALUES (?, ?) ON CONFLICT (year) DO NOTHING').run(currentYear, nextNum);
  } else {
    nextNum = Number(row.current_number) + 1;
    await db.prepare('UPDATE quotation_sequence SET current_number = ? WHERE year = ?').run(nextNum, currentYear);
  }
  const padded = String(nextNum).padStart(4, '0');
  return `${prefix}-${currentYear}-${padded}`;
}

// Generate client code atomically
async function getNextClientCode() {
  const currentYear = new Date().getFullYear();
  const row = await db.prepare("SELECT COUNT(*) as count FROM clients WHERE client_code LIKE ?").get(`CL-${currentYear}-%`);
  const nextNum = (row ? Number(row.count) : 0) + 1;
  return `CL-${currentYear}-${String(nextNum).padStart(4, '0')}`;
}

console.log('[PostgreSQL] Database module initialized. Connected to:', pgUrl.replace(/:[^:@]+@/, ':****@'));

module.exports = {
  db,
  pool,
  getNextQuotationNumber,
  getNextClientCode
};
