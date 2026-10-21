const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.cwd(), process.env.DATA_DIR)
  : path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(DATA_DIR, 'studio-gfx.db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const DATABASE_URL = process.env.DATABASE_URL || null;

module.exports = {
  PORT,
  DATA_DIR,
  DB_PATH,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
