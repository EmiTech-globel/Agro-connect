-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Products table (rice, beans, tomatoes, etc.)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (markets, states, regions)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    market_type VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data sources (websites we scrape from)
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    source_type VARCHAR(50),
    reliability_score INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw scraped data (before approval)
CREATE TABLE scraped_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    location_id INTEGER REFERENCES locations(id),
    source_id INTEGER REFERENCES sources(id),
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    scraped_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    flagged_reason TEXT,
    admin_notes TEXT,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approved prices (time-series data)
CREATE TABLE prices (
    time TIMESTAMPTZ NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    source_id INTEGER NOT NULL REFERENCES sources(id),
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    price_per_kg DECIMAL(10, 2),
    approved_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Convert prices table to TimescaleDB hypertable
SELECT create_hypertable('prices', 'time');

-- Create indexes for better query performance
CREATE INDEX idx_scraped_prices_status ON scraped_prices(status);
CREATE INDEX idx_scraped_prices_product ON scraped_prices(product_id);
CREATE INDEX idx_scraped_prices_location ON scraped_prices(location_id);
CREATE INDEX idx_prices_product_time ON prices(product_id, time DESC);
CREATE INDEX idx_prices_location_time ON prices(location_id, time DESC);

-- Admin users table (simple for MVP)
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO products (name, category, unit, description) VALUES
('Rice (Local)', 'Grains', 'bag', '50kg bag of local rice'),
('Rice (Foreign)', 'Grains', 'bag', '50kg bag of foreign rice'),
('Beans (Brown)', 'Grains', 'bag', '100kg bag of brown beans'),
('Tomatoes', 'Vegetables', 'basket', 'Fresh tomatoes'),
('Onions', 'Vegetables', 'bag', '100kg bag of onions'),
('Palm Oil', 'Oils', 'liter', 'Red palm oil'),
('Yam', 'Tubers', 'tuber', 'Fresh yam'),
('Garri (White)', 'Grains', 'bag', '50kg bag of white garri');

INSERT INTO locations (name, state, region, market_type) VALUES
('Mile 12 Market', 'Lagos', 'South West', 'wholesale'),
('Wuse Market', 'FCT', 'North Central', 'retail'),
('Ariaria Market', 'Abia', 'South East', 'wholesale'),
('Bodija Market', 'Oyo', 'South West', 'retail'),
('Dawanau Market', 'Kano', 'North West', 'wholesale');

INSERT INTO sources (name, url, source_type, reliability_score) VALUES
('Nigeria Agricultural Commodities Portal', 'https://example.com', 'website', 8),
('Lagos State Market Board', 'https://example.com', 'website', 9),
('Manual Entry', 'manual', 'manual', 10);

-- Insert a sample admin
INSERT INTO admins (username, email, password_hash, role) VALUES
('admin', 'admin@agroconnect.com', '$2b$10$dummy.hash.for.mvp', 'admin');

-- Create view for latest prices per product/location
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (product_id, location_id)
    p.time,
    p.product_id,
    prod.name as product_name,
    prod.category,
    p.location_id,
    loc.name as location_name,
    loc.state,
    p.price,
    p.unit,
    p.currency,
    p.price_per_kg,
    s.name as source_name
FROM prices p
JOIN products prod ON p.product_id = prod.id
JOIN locations loc ON p.location_id = loc.id
JOIN sources s ON p.source_id = s.id
ORDER BY product_id, location_id, time DESC;