const path = require('path');
require('dotenv').config();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'studio-gfx.db');
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'studio-gfx-super-secure-offline-jwt-key-2026';

module.exports = {
  DATA_DIR,
  DB_PATH,
  PORT,
  JWT_SECRET
};
