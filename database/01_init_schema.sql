-- 01_init_schema.sql
-- Based on zerain-skills/database/schema.md
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE truck_category AS ENUM ('GRUA_PESADA', 'GRUA_LIGERA', 'TRAILER');
CREATE TYPE truck_status AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE');
CREATE TYPE order_status AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'INCIDENT');
CREATE TYPE time_log_event AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- TABLES

-- 1. Trucks
CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate TEXT UNIQUE NOT NULL,
    alias TEXT,
    category truck_category NOT NULL,
    status truck_status DEFAULT 'AVAILABLE',
    itv_due_date DATE,
    last_location JSONB, -- {lat: float, lng: float}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    synergy_ref TEXT,
    name TEXT NOT NULL,
    phone_numbers TEXT[],
    preferences TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_id SERIAL, -- Short ID for radio comms
    status order_status DEFAULT 'DRAFT',
    client_id UUID REFERENCES clients(id),
    description TEXT,
    origin_address TEXT,
    destination_address TEXT,
    scheduled_start TIMESTAMPTZ,
    estimated_duration INTERVAL,
    truck_id UUID REFERENCES trucks(id),
    driver_id UUID REFERENCES drivers(id),
    notes_internal TEXT,
    transcript_original TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id),
    order_id UUID REFERENCES orders(id),
    amount DECIMAL(10, 2),
    concept TEXT, -- Could be an ENUM but text allows flexibility: 'COMBUSTIBLE', 'DIETA', etc.
    image_url TEXT,
    ocr_raw_data JSONB,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Time Logs
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id),
    event_type time_log_event NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    location JSONB -- GPS at clock-in/out
);

-- Row Level Security (RLS)
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admin Policy (Conceptually 'Admin' would be a specific role or checking a claim, 
-- but for now we basically allow authenticated service roles or specific setup.
-- In Supabase, 'service_role' key bypasses RLS. 
-- We will create a policy for authenticated users to demonstrate RLS, but restrict Anon.)

-- Deny everything for Anon (Default is deny if no policy exists, but explicit is good)
-- (No policies created for 'anon' role means deny all implicitly)

-- Allow full access for Authenticated users (simulating Admin dashboard users for now)
-- Adjust this later when Driver roles are strictly defined.

CREATE POLICY "Enable all access for authenticated users" ON trucks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON time_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

