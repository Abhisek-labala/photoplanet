const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DB_PATH, DATA_DIR } = require('./config');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      mobile TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'QUOTATION_STAFF')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alternate_mobile TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      event_type_id INTEGER,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      end_date TEXT,
      venue TEXT,
      city TEXT,
      requirements TEXT,
      special_instructions TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Enquiry',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS service_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL DEFAULT 'Event',
      price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      quotation_date TEXT NOT NULL,
      valid_until TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      additional_charges REAL NOT NULL DEFAULT 0,
      tax_enabled INTEGER NOT NULL DEFAULT 0,
      tax_percentage REAL NOT NULL DEFAULT 18,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT,
      terms TEXT,
      created_by INTEGER,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      event_id INTEGER,
      event_date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      venue TEXT,
      requirements TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      quotation_event_id INTEGER,
      service_id INTEGER,
      service_name_snapshot TEXT NOT NULL,
      description_snapshot TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'Event',
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (quotation_event_id) REFERENCES quotation_events(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_payment_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      milestone TEXT NOT NULL,
      percentage REAL NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotation_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      user_id INTEGER,
      username TEXT,
      old_status TEXT,
      new_status TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotation_sequence (
      year INTEGER PRIMARY KEY,
      current_number INTEGER NOT NULL DEFAULT 0
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync('ChangeMe123!', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (name, username, mobile, password_hash, role, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertUser.run('Studio Administrator', 'admin', '9876543210', passwordHash, 'ADMIN');
    insertUser.run('Quotation Staff', 'quotation', '9876543211', passwordHash, 'QUOTATION_STAFF');
    console.log('Seeded initial users: admin & quotation (Password: ChangeMe123!)');
  }

  // Seed Event Types
  const eventTypeCount = db.prepare('SELECT COUNT(*) as count FROM event_types').get().count;
  if (eventTypeCount === 0) {
    const eventTypes = [
      'Godumari',
      'Muhurtham / Ratha',
      'Wedding',
      'Engagement',
      'Reception',
      'Pre-Wedding',
      'Birthday',
      'Half Saree',
      'Baby Shoot',
      'Maternity',
      'Corporate Event',
      'Other'
    ];
    const insertEventType = db.prepare(`
      INSERT INTO event_types (name, description, sort_order) VALUES (?, ?, ?)
    `);
    eventTypes.forEach((name, idx) => {
      insertEventType.run(name, `${name} event coverage`, idx + 1);
    });
    console.log('Seeded event types');
  }

  // Seed Service Categories & Services
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM service_categories').get().count;
  if (categoryCount === 0) {
    const categoriesData = [
      {
        name: 'PHOTOGRAPHY',
        description: 'Still photography services',
        sort: 1,
        services: [
          { name: 'Traditional Photography', unit: 'Event', price: 15000, desc: 'Full event traditional still coverage' },
          { name: 'Candid Photography', unit: 'Event', price: 25000, desc: 'Artistic candid moments capture with prime lenses' },
          { name: 'Extra Photographer', unit: 'Day', price: 8000, desc: 'Additional candid/traditional photographer' },
          { name: 'Extra Photo Camera', unit: 'Day', price: 5000, desc: 'Extra camera body & dedicated optics' }
        ]
      },
      {
        name: 'VIDEOGRAPHY',
        description: 'Cinematography & video documentation',
        sort: 2,
        services: [
          { name: 'Traditional Videography', unit: 'Event', price: 18000, desc: 'Full length high-definition traditional video' },
          { name: 'Candid Video', unit: 'Event', price: 30000, desc: 'Cinematic angles, gimbal moves, high framerate' },
          { name: 'Extra Videographer', unit: 'Day', price: 9000, desc: 'Additional cinematic videographer' },
          { name: 'Extra Video Camera', unit: 'Day', price: 6000, desc: 'Secondary cinema camera setup' }
        ]
      },
      {
        name: 'DRONE',
        description: 'Aerial perspectives and sweeps',
        sort: 3,
        services: [
          { name: 'Drone Shoot', unit: 'Event', price: 12000, desc: 'Licensed drone operator with 4K aerial shots' },
          { name: 'Drone Cinematography', unit: 'Day', price: 18000, desc: 'Complex aerial sweeps and dynamic tracking' }
        ]
      },
      {
        name: 'LIVE STREAMING',
        description: 'Multi-cam broadcast and online streaming',
        sort: 4,
        services: [
          { name: 'YouTube Live', unit: 'Event', price: 15000, desc: 'Full HD multi-cam live stream to YouTube channel' },
          { name: 'Facebook Live', unit: 'Event', price: 15000, desc: 'Live broadcast to Facebook page' },
          { name: 'Live Streaming Setup', unit: 'Day', price: 20000, desc: 'Bonded internet switcher + 2 wireless cameras' }
        ]
      },
      {
        name: 'PRE-WEDDING',
        description: 'Outdoor and indoor couple sessions',
        sort: 5,
        services: [
          { name: 'Pre-Wedding Photography', unit: 'Session', price: 20000, desc: 'Full day creative couple portraits' },
          { name: 'Pre-Wedding Video', unit: 'Session', price: 28000, desc: 'Cinematic music video pre-wedding shoot' },
          { name: 'Pre-Wedding Photo + Video', unit: 'Package', price: 42000, desc: 'Combined photo & cinematic video package' },
          { name: 'Cinematic Pre-Wedding', unit: 'Session', price: 35000, desc: 'Story-driven pre-wedding film' },
          { name: 'Pre-Wedding Teaser', unit: 'Video', price: 8000, desc: '1-minute fast-paced social media reel' }
        ]
      },
      {
        name: 'EDITING',
        description: 'Post-production, grading & assembly',
        sort: 6,
        services: [
          { name: 'Photo Editing', unit: 'Event', price: 7000, desc: 'Color correction, skin retouching on select images' },
          { name: 'Video Editing', unit: 'Event', price: 10000, desc: 'Standard multi-cam ceremony cut' },
          { name: 'Highlight Video', unit: 'Video', price: 12000, desc: '3-5 minute emotional highlight film' },
          { name: 'Wedding Teaser', unit: 'Video', price: 6000, desc: '60 second Instagram reel / WhatsApp teaser' },
          { name: 'Cinematic Wedding Film', unit: 'Video', price: 25000, desc: '15-25 minute signature cinematic documentary' },
          { name: 'Full Wedding Video', unit: 'Package', price: 15000, desc: 'Complete traditional full length ceremony video' }
        ]
      },
      {
        name: 'ALBUM',
        description: 'Flush-mount luxury photo books',
        sort: 7,
        services: [
          { name: 'Standard Album', unit: 'Album', price: 12000, desc: '30 sheets high quality matte / gloss album' },
          { name: 'Premium Album', unit: 'Album', price: 20000, desc: 'Metallic / Velvet finish luxury acrylic box album' },
          { name: '30 Sheet Album', unit: 'Album', price: 14000, desc: '30 sheets / 60 pages flush mount' },
          { name: '40 Sheet Album', unit: 'Album', price: 18000, desc: '40 sheets / 80 pages flush mount' },
          { name: '50 Sheet Album', unit: 'Album', price: 22000, desc: '50 sheets / 100 pages flush mount' },
          { name: 'Additional Album Sheet', unit: 'Sheet', price: 600, desc: 'Extra double-sided printed page' }
        ]
      },
      {
        name: 'OTHER',
        description: 'Logistics, overtime & custom additions',
        sort: 8,
        services: [
          { name: 'Travel Charge', unit: 'Package', price: 5000, desc: 'Outstation team travel & accommodation allowance' },
          { name: 'Extra Hours', unit: 'Hour', price: 3000, desc: 'Per hour crew overtime beyond schedule' },
          { name: 'Extra Day', unit: 'Day', price: 20000, desc: 'Full additional crew shoot day' },
          { name: 'Additional Editing', unit: 'Session', price: 4000, desc: 'Additional revision rounds or custom color pass' },
          { name: 'Custom Service', unit: 'Package', price: 10000, desc: 'Bespoke requirements as agreed' }
        ]
      }
    ];

    const insertCat = db.prepare(`
      INSERT INTO service_categories (name, description, sort_order) VALUES (?, ?, ?)
    `);
    const insertSvc = db.prepare(`
      INSERT INTO services (category_id, name, description, unit, price, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const cat of categoriesData) {
      const catResult = insertCat.run(cat.name, cat.description, cat.sort);
      const catId = catResult.lastInsertRowid;
      cat.services.forEach((s, idx) => {
        insertSvc.run(catId, s.name, s.desc, s.unit, s.price, idx + 1);
      });
    }
    console.log('Seeded service categories & master services');
  }

  // Seed default settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    const defaultSettings = {
      studio_name: 'PHOTO PLANET STUDIO',
      tagline: 'Photography • Cinematography • Albums • Live Streaming',
      address: 'Shop 12-14, Central Studio Avenue, Opp. Metro Station',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      phone: '+91 98765 43210',
      alternate_phone: '+91 98765 01234',
      email: 'contact@studiogfx.com',
      website: 'www.studiogfx.com',
      gst_number: '36AABCS1429B1Z8',
      instagram: '@studiogfx_official',
      facebook: 'fb.com/studiogfx',
      youtube: 'youtube.com/@studiogfx',
      quotation_prefix: 'SGFX',
      quotation_start_number: 1,
      quotation_validity_days: 15,
      currency_symbol: '₹',
      currency_code: 'INR',
      tax_enabled: 0,
      tax_percentage: 18,
      allow_staff_custom_price: 1,
      default_payment_schedule: JSON.stringify([
        { milestone: 'Booking Token', percentage: 20 },
        { milestone: 'Advance Before Shoot', percentage: 30 },
        { milestone: 'Event Day Completion', percentage: 30 },
        { milestone: 'After Editing Approval', percentage: 10 },
        { milestone: 'Final Album Delivery', percentage: 10 }
      ]),
      default_terms: `1. Quotation Validity: This quotation is valid for 15 days from the date of issue.
2. Booking Confirmation: Dates will be exclusively blocked only upon receipt of the 20% booking token.
3. Payment Schedule: Payments must strictly follow the agreed milestones before delivery of final deliverables.
4. Raw Footage & Photos: Unedited raw photos are shared in web preview within 7 working days.
5. Delivery Timeline: Edited photos in 3 weeks, cinematic teaser in 4 weeks, full film and luxury album in 6-8 weeks.
6. Travel & Accommodation: Outstation travel and hotel accommodations are to be arranged or reimbursed by the client.
7. Overtime: Coverage exceeding 10 continuous hours per day will attract overtime crew charges.
8. Copyright & Promotion: Studio GFX reserves artistic copyright and rights to display select images in portfolio and studio awards.`
    };

    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(defaultSettings)) {
      insertSetting.run(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
    console.log('Seeded default settings');
  }

  // Seed sample client & event if none exist
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  if (clientCount === 0) {
    const insertClient = db.prepare(`
      INSERT INTO clients (client_code, name, mobile, alternate_mobile, email, address, city, state, pincode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const cRes = insertClient.run(
      'CL-2026-0001',
      'Ravi Kumar',
      '9849012345',
      '9849054321',
      'ravi.kumar@example.com',
      'Villa 42, Green Meadows',
      'Hyderabad',
      'Telangana',
      '500084',
      'VIP Wedding Client. Prefers candid cinematography and luxury velvet album.'
    );

    const weddingTypeId = db.prepare("SELECT id FROM event_types WHERE name = 'Wedding'").get()?.id || 1;
    const insertEvent = db.prepare(`
      INSERT INTO events (client_id, event_type_id, event_name, event_date, end_date, venue, city, requirements, special_instructions, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEvent.run(
      cRes.lastInsertRowid,
      weddingTypeId,
      'Ravi & Sneha Wedding Grand Ceremony',
      '2026-12-26',
      '2026-12-26',
      'Taj Krishna Ballroom',
      'Hyderabad',
      '2 Traditional Photographers, 2 Candid Photographers, 1 Drone, 1 Candid Video, 40 Sheet Album',
      'Bride entry requires spotlight tracking and slow motion cinematic shots.',
      'Family coordinated coverage',
      'Quotation Sent'
    );
    console.log('Seeded sample client Ravi Kumar and wedding event');
  }
}

// Generate atomic next quotation number
function getNextQuotationNumber() {
  const currentYear = new Date().getFullYear();
  const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'quotation_prefix'").get();
  const prefix = prefixRow ? prefixRow.value : 'SGFX';

  const transaction = db.transaction(() => {
    let row = db.prepare('SELECT current_number FROM quotation_sequence WHERE year = ?').get(currentYear);
    let nextNum = 1;
    if (!row) {
      const startNumRow = db.prepare("SELECT value FROM settings WHERE key = 'quotation_start_number'").get();
      const startNum = startNumRow ? parseInt(startNumRow.value, 10) : 1;
      nextNum = Math.max(startNum, 1);
      db.prepare('INSERT INTO quotation_sequence (year, current_number) VALUES (?, ?)').run(currentYear, nextNum);
    } else {
      nextNum = row.current_number + 1;
      db.prepare('UPDATE quotation_sequence SET current_number = ? WHERE year = ?').run(nextNum, currentYear);
    }
    const padded = String(nextNum).padStart(4, '0');
    return `${prefix}-${currentYear}-${padded}`;
  });

  return transaction();
}

// Generate client code atomically
function getNextClientCode() {
  const currentYear = new Date().getFullYear();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM clients WHERE client_code LIKE ?
  `).get(`CL-${currentYear}-%`);
  const nextNum = (row ? row.count : 0) + 1;
  return `CL-${currentYear}-${String(nextNum).padStart(4, '0')}`;
}

initSchema();

module.exports = {
  db,
  getNextQuotationNumber,
  getNextClientCode
};
