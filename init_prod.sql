-- Admins
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trucks
CREATE TABLE IF NOT EXISTS trucks (
    id TEXT PRIMARY KEY,
    plate TEXT NOT NULL,
    alias TEXT,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    axles INTEGER,
    max_weight REAL,
    color TEXT,
    has_crane BOOLEAN,
    has_jib BOOLEAN,
    is_box_body BOOLEAN,
    max_length REAL,
    current_location TEXT,
    default_driver_id TEXT,
    itv_expiration TEXT,
    next_maintenance TEXT,
    display_order INTEGER DEFAULT 0
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    display_id INTEGER,
    name TEXT NOT NULL,
    nif TEXT,
    phone TEXT,
    email TEXT,
    billing_address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT,
    payment_method TEXT,
    locations TEXT,
    notes TEXT,
    reliability INTEGER,
    image_128 TEXT,
    map_location TEXT,
    company_description TEXT
);

-- Driver Leaves
CREATE TABLE IF NOT EXISTS driver_leaves (
    id SERIAL PRIMARY KEY,
    driver_id TEXT,
    type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING',
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Route Cache
CREATE TABLE IF NOT EXISTS route_cache (
    route_key TEXT PRIMARY KEY,
    origin_full TEXT,
    dest_full TEXT,
    distance_km REAL,
    duration_mins REAL,
    polyline TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Admins
-- Hash for 'TorreControl2026'
INSERT INTO admins (username, password_hash, role) 
VALUES 
('eduardo.marquinez@gmail.com', '$pbkdf2-sha256$29000$RAiB8F6r1ZrTeq.1lhKilA$TtIIP1Evzo9263/eAg1mNQ4w446VIWGzfJgecOZD50k4', 'SUPER_ADMIN'),
('transporteszerain@gmail.com', '$pbkdf2-sha256$29000$RAiB8F6r1ZrTeq.1lhKilA$TtIIP1Evzo9263/eAg1mNQ4w446VIWGzfJgecOZD50k4', 'SUPER_ADMIN'),
('gerencia', '$pbkdf2-sha256$29000$RAiB8F6r1ZrTeq.1lhKilA$TtIIP1Evzo9263/eAg1mNQ4w446VIWGzfJgecOZD50k4', 'SUPER_ADMIN'),
('trafico', '$pbkdf2-sha256$29000$RAiB8F6r1ZrTeq.1lhKilA$TtIIP1Evzo9263/eAg1mNQ4w446VIWGzfJgecOZD50k4', 'DISPATCHER')
ON CONFLICT (username) DO NOTHING;
