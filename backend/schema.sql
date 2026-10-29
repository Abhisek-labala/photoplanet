-- PHOTO PLANET STUDIO PostgreSQL Schema & Initial Seed Data

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('ADMIN', 'QUOTATION_STAFF')),
    active INTEGER NOT NULL DEFAULT 1,
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    alternate_mobile VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    notes TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Event Types Table
CREATE TABLE IF NOT EXISTS event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Events Table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50),
    venue TEXT,
    city VARCHAR(100),
    requirements TEXT,
    special_instructions TEXT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Enquiry',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Service Categories Table
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 6. Services Table
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'Event',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    quotation_date VARCHAR(50) NOT NULL,
    valid_until VARCHAR(50),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    additional_charges NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_enabled INTEGER NOT NULL DEFAULT 0,
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 18,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    notes TEXT,
    terms TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Quotation Events Table
CREATE TABLE IF NOT EXISTS quotation_events (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    event_date VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    venue TEXT,
    requirements TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 9. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    quotation_event_id INTEGER REFERENCES quotation_events(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    description_snapshot TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'Event',
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 10. Quotation Payment Terms Table
CREATE TABLE IF NOT EXISTS quotation_payment_terms (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    milestone VARCHAR(255) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 11. Quotation Status History Table
CREATE TABLE IF NOT EXISTS quotation_status_history (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    user_id INTEGER,
    username VARCHAR(100),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Quotation Sequence Table
CREATE TABLE IF NOT EXISTS quotation_sequence (
    year INTEGER PRIMARY KEY,
    current_number INTEGER NOT NULL DEFAULT 0
);

-- ==========================================
-- INITIAL SEED DATA
-- Default Password: ChangeMe123!
-- ==========================================

INSERT INTO users (name, username, mobile, password_hash, role, active)
VALUES 
('Studio Administrator', 'admin', '9876543210', '$2b$10$Hf2A231q3.5.pglaXXjWeOv3GqxUeC8Bp6UFG84YPXrkR0jOH8mDe', 'ADMIN', 1),
('Quotation Staff', 'quotation', '9876543211', '$2b$10$Hf2A231q3.5.pglaXXjWeOv3GqxUeC8Bp6UFG84YPXrkR0jOH8mDe', 'QUOTATION_STAFF', 1)
ON CONFLICT (username) DO NOTHING;

-- Seed Event Types
INSERT INTO event_types (name, description, sort_order)
VALUES 
('Godumari', 'Godumari event coverage', 1),
('Muhurtham / Ratha', 'Muhurtham / Ratha event coverage', 2),
('Wedding', 'Wedding event coverage', 3),
('Engagement', 'Engagement event coverage', 4),
('Reception', 'Reception event coverage', 5),
('Pre-Wedding', 'Pre-Wedding event coverage', 6),
('Birthday', 'Birthday event coverage', 7),
('Half Saree', 'Half Saree event coverage', 8),
('Baby Shoot', 'Baby Shoot event coverage', 9),
('Maternity', 'Maternity event coverage', 10),
('Corporate Event', 'Corporate Event event coverage', 11),
('Other', 'Other event coverage', 12)
ON CONFLICT (name) DO NOTHING;

-- Seed Service Categories
INSERT INTO service_categories (id, name, description, sort_order)
VALUES 
(1, 'PHOTOGRAPHY', 'Still photography services', 1),
(2, 'VIDEOGRAPHY', 'Cinematography & video documentation', 2),
(3, 'DRONE', 'Aerial perspectives and sweeps', 3),
(4, 'LIVE STREAMING', 'Multi-cam broadcast and online streaming', 4),
(5, 'PRE-WEDDING', 'Outdoor and indoor couple sessions', 5),
(6, 'EDITING', 'Post-production, grading & assembly', 6),
(7, 'ALBUM', 'Flush-mount luxury photo books', 7),
(8, 'OTHER', 'Logistics, overtime & custom additions', 8)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for service_categories if needed
SELECT setval(pg_get_serial_sequence('service_categories', 'id'), coalesce(max(id), 1)) FROM service_categories;

-- Seed Master Services
INSERT INTO services (category_id, name, description, unit, price, sort_order)
VALUES
(1, 'Traditional Photography', 'Full event traditional still coverage', 'Event', 15000, 1),
(1, 'Candid Photography', 'Artistic candid moments capture with prime lenses', 'Event', 25000, 2),
(1, 'Extra Photographer', 'Additional candid/traditional photographer', 'Day', 8000, 3),
(1, 'Extra Photo Camera', 'Extra camera body & dedicated optics', 'Day', 5000, 4),

(2, 'Traditional Videography', 'Full length high-definition traditional video', 'Event', 18000, 1),
(2, 'Candid Video', 'Cinematic angles, gimbal moves, high framerate', 'Event', 30000, 2),
(2, 'Extra Videographer', 'Additional cinematic videographer', 'Day', 9000, 3),
(2, 'Extra Video Camera', 'Secondary cinema camera setup', 'Day', 6000, 4),

(3, 'Drone Shoot', 'Licensed drone operator with 4K aerial shots', 'Event', 12000, 1),
(3, 'Drone Cinematography', 'Complex aerial sweeps and dynamic tracking', 'Day', 18000, 2),

(4, 'YouTube Live', 'Full HD multi-cam live stream to YouTube channel', 'Event', 15000, 1),
(4, 'Facebook Live', 'Live broadcast to Facebook page', 'Event', 15000, 2),
(4, 'Live Streaming Setup', 'Bonded internet switcher + 2 wireless cameras', 'Day', 20000, 3),

(5, 'Pre-Wedding Photography', 'Full day creative couple portraits', 'Session', 20000, 1),
(5, 'Pre-Wedding Video', 'Cinematic music video pre-wedding shoot', 'Session', 28000, 2),
(5, 'Pre-Wedding Photo + Video', 'Combined photo & cinematic video package', 'Package', 42000, 3),
(5, 'Cinematic Pre-Wedding', 'Story-driven pre-wedding film', 'Session', 35000, 4),
(5, 'Pre-Wedding Teaser', '1-minute fast-paced social media reel', 'Video', 8000, 5),

(6, 'Photo Editing', 'Color correction, skin retouching on select images', 'Event', 7000, 1),
(6, 'Video Editing', 'Standard multi-cam ceremony cut', 'Event', 10000, 2),
(6, 'Highlight Video', '3-5 minute emotional highlight film', 'Video', 12000, 3),
(6, 'Wedding Teaser', '60 second Instagram reel / WhatsApp teaser', 'Video', 6000, 4),
(6, 'Cinematic Wedding Film', '15-25 minute signature cinematic documentary', 'Video', 25000, 5),
(6, 'Full Wedding Video', 'Complete traditional full length ceremony video', 'Package', 15000, 6),

(7, 'Standard Album', '30 sheets high quality matte / gloss album', 'Album', 12000, 1),
(7, 'Premium Album', 'Metallic / Velvet finish luxury acrylic box album', 'Album', 20000, 2),
(7, '30 Sheet Album', '30 sheets / 60 pages flush mount', 'Album', 14000, 3),
(7, '40 Sheet Album', '40 sheets / 80 pages flush mount', 'Album', 18000, 4),
(7, '50 Sheet Album', '50 sheets / 100 pages flush mount', 'Album', 22000, 5),
(7, 'Additional Album Sheet', 'Extra double-sided printed page', 'Sheet', 600, 6),

(8, 'Travel Charge', 'Outstation team travel & accommodation allowance', 'Package', 5000, 1),
(8, 'Extra Hours', 'Per hour crew overtime beyond schedule', 'Hour', 3000, 2),
(8, 'Extra Day', 'Full additional crew shoot day', 'Day', 20000, 3),
(8, 'Additional Editing', 'Additional revision rounds or custom color pass', 'Session', 4000, 4),
(8, 'Custom Service', 'Bespoke requirements as agreed', 'Package', 10000, 5);

-- Seed Settings
INSERT INTO settings (key, value) VALUES
('studio_name', 'PHOTO PLANET STUDIO'),
('tagline', 'Photography • Cinematography • Albums • Live Streaming'),
('address', 'Shop 12-14, Central Studio Avenue, Opp. Metro Station'),
('city', 'Hyderabad'),
('state', 'Telangana'),
('pincode', '500001'),
('phone', '+91 98765 43210'),
('alternate_phone', '+91 98765 01234'),
('email', 'contact@photoplanet.in'),
('website', 'www.photoplanet.in'),
('gst_number', '36AABCS1429B1Z8'),
('instagram', '@photoplanet_official'),
('facebook', 'fb.com/photoplanet'),
('youtube', 'youtube.com/@photoplanet'),
('quotation_prefix', 'SGFX'),
('quotation_start_number', '1'),
('quotation_validity_days', '15'),
('currency_symbol', '₹'),
('currency_code', 'INR'),
('tax_enabled', '0'),
('tax_percentage', '18'),
('allow_staff_custom_price', '1'),
('default_payment_schedule', '[{"milestone":"Booking Token","percentage":20},{"milestone":"Advance Before Shoot","percentage":30},{"milestone":"Event Day Completion","percentage":30},{"milestone":"After Editing Approval","percentage":10},{"milestone":"Final Album Delivery","percentage":10}]'),
('default_terms', '1. Quotation Validity: This quotation is valid for 15 days from the date of issue.
2. Booking Confirmation: Dates will be exclusively blocked only upon receipt of the 20% booking token.
3. Payment Schedule: Payments must strictly follow the agreed milestones before delivery of final deliverables.
4. Raw Footage & Photos: Unedited raw photos are shared in web preview within 7 working days.
5. Delivery Timeline: Edited photos in 3 weeks, cinematic teaser in 4 weeks, full film and luxury album in 6-8 weeks.
6. Travel & Accommodation: Outstation travel and hotel accommodations are to be arranged or reimbursed by the client.
7. Overtime: Coverage exceeding 10 continuous hours per day will attract overtime crew charges.
8. Copyright & Promotion: PHOTO PLANET STUDIO reserves artistic copyright and rights to display select images in portfolio and studio awards.')
ON CONFLICT (key) DO NOTHING;

