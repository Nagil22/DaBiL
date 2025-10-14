-- =====================================================
-- DABIL DATABASE COMPLETE SETUP SCRIPT (UPDATED)
-- File: backend/database/setup.sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE (UPDATED - EMAIL/PASSWORD AUTH)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'restaurant_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. WALLETS TABLE
-- =====================================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0.00 CHECK (balance >= 0),
    pending_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
    total_funded DECIMAL(12,2) DEFAULT 0.00,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    pin_hash VARCHAR(255),
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. RESTAURANTS TABLE
-- =====================================================
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    restaurant_type VARCHAR(50) CHECK (restaurant_type IN ('QSR', 'Casual', 'Luxury', 'Fast Food', 'Fine Dining')),
    cuisine_type VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Lagos',
    country VARCHAR(100) DEFAULT 'Nigeria',
    phone VARCHAR(15),
    email VARCHAR(255),
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    operating_hours JSONB,
    average_order_value DECIMAL(8,2),
    commission_rate DECIMAL(5,4) DEFAULT 0.025,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),
    owner_user_id UUID REFERENCES users(id),
    qr_code TEXT,
    onboarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. MENU ITEMS TABLE
-- =====================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(8,2) NOT NULL CHECK (price > 0),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    image_url VARCHAR(500),
    preparation_time INTEGER,
    calories INTEGER,
    ingredients TEXT[],
    allergens TEXT[],
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_halal BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. SESSIONS TABLE (Check-ins)
-- =====================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_code VARCHAR(20) UNIQUE NOT NULL,
    table_number INTEGER,
    party_size INTEGER DEFAULT 1,
    service_type VARCHAR(20) DEFAULT 'dine_in' CHECK (service_type IN ('dine_in', 'takeaway', 'delivery')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    loyalty_points_earned INTEGER DEFAULT 0,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    service_charge DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'wallet' CHECK (payment_method IN ('wallet', 'card', 'cash', 'loyalty')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
    notes TEXT,
    estimated_ready_time TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'bonus')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    external_reference VARCHAR(255),
    description TEXT,
    metadata JSONB,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. LOYALTY POINTS TABLE
-- =====================================================
CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points_earned INTEGER DEFAULT 0,
    lifetime_points_redeemed INTEGER DEFAULT 0,
    current_tier VARCHAR(20) DEFAULT 'bronze' CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    tier_progress INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_earned_at TIMESTAMP WITH TIME ZONE,
    last_redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. RESTAURANT STAFF TABLE
-- =====================================================
CREATE TABLE restaurant_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'cashier', 'waiter', 'chef', 'admin')),
    password_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_by_type VARCHAR(20) CHECK (changed_by_type IN ('user', 'staff', 'system')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Wallets indexes
CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_balance ON wallets(balance);
CREATE INDEX idx_wallets_status ON wallets(status);

-- Restaurants indexes
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_type ON restaurants(restaurant_type);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_owner ON restaurants(owner_user_id);

-- Menu items indexes
CREATE INDEX idx_menu_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_menu_price ON menu_items(price);
CREATE INDEX idx_menu_status ON menu_items(status, is_available);
CREATE INDEX idx_menu_sort ON menu_items(restaurant_id, category, sort_order);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_restaurant_id ON sessions(restaurant_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_code ON sessions(session_code);
CREATE INDEX idx_sessions_date ON sessions(checked_in_at);
CREATE INDEX idx_sessions_active ON sessions(restaurant_id, status) WHERE status = 'active';

-- Orders indexes
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_orders_total ON orders(total_amount);

-- Transactions indexes
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_external_ref ON transactions(external_reference);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(processed_at);

-- Loyalty points indexes
CREATE UNIQUE INDEX idx_loyalty_user_id ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_tier ON loyalty_points(current_tier);
CREATE INDEX idx_loyalty_balance ON loyalty_points(points_balance);

-- Restaurant staff indexes
CREATE UNIQUE INDEX idx_staff_restaurant_email ON restaurant_staff(restaurant_id, email);
CREATE INDEX idx_staff_restaurant_id ON restaurant_staff(restaurant_id);
CREATE INDEX idx_staff_role ON restaurant_staff(role);
CREATE INDEX idx_staff_active ON restaurant_staff(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- =====================================================
-- DATABASE FUNCTIONS (SAME AS BEFORE)
-- =====================================================

-- Function to calculate loyalty points
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    p_amount DECIMAL,
    p_restaurant_type VARCHAR,
    p_user_tier VARCHAR DEFAULT 'bronze'
) RETURNS INTEGER AS $$
DECLARE
    base_rate DECIMAL := 0.10; -- 10% base rate
    restaurant_multiplier DECIMAL := 1.0;
    tier_multiplier DECIMAL := 1.0;
    points INTEGER;
BEGIN
    -- Restaurant type multipliers
    CASE p_restaurant_type
        WHEN 'QSR' THEN restaurant_multiplier := 1.0;
        WHEN 'Casual' THEN restaurant_multiplier := 1.2;
        WHEN 'Luxury' THEN restaurant_multiplier := 1.5;
        ELSE restaurant_multiplier := 1.0;
    END CASE;
    
    -- User tier multipliers
    CASE p_user_tier
        WHEN 'bronze' THEN tier_multiplier := 1.0;
        WHEN 'silver' THEN tier_multiplier := 1.2;
        WHEN 'gold' THEN tier_multiplier := 1.5;
        WHEN 'platinum' THEN tier_multiplier := 2.0;
        ELSE tier_multiplier := 1.0;
    END CASE;
    
    points := FLOOR(p_amount * base_rate * restaurant_multiplier * tier_multiplier);
    RETURN points;
END;
$$ LANGUAGE plpgsql;

-- Function to generate session code
CREATE OR REPLACE FUNCTION generate_session_code() RETURNS VARCHAR AS $$
DECLARE
    code VARCHAR;
BEGIN
    code := 'D' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM sessions WHERE session_code = code) LOOP
        code := 'D' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Trigger to auto-generate session codes
CREATE OR REPLACE FUNCTION set_session_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_code IS NULL OR NEW.session_code = '' THEN
        NEW.session_code := generate_session_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_session_code
    BEFORE INSERT ON sessions
    FOR EACH ROW EXECUTE FUNCTION set_session_code();

-- Trigger to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_on_transaction() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE wallets 
        SET 
            balance = NEW.balance_after,
            last_transaction_at = NEW.processed_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.wallet_id;
        
        -- Update spending totals
        IF NEW.transaction_type = 'debit' THEN
            UPDATE wallets 
            SET total_spent = total_spent + NEW.amount
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'credit' THEN
            UPDATE wallets 
            SET total_funded = total_funded + NEW.amount
            WHERE id = NEW.wallet_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_wallet_on_transaction();

-- Trigger to auto-create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id) VALUES (NEW.id);
    INSERT INTO loyalty_points (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

-- =====================================================
-- CREATE SUPER ADMIN (NO MOCK DATA)
-- =====================================================

-- Create super admin with email/password authentication
-- Password: admin123
INSERT INTO users (email, name, email_verified, role, password_hash) 
VALUES (
    'admin@dabil.com', 
    'Super Admin', 
    true, 
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Wallet summary view
CREATE VIEW wallet_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    w.balance,
    w.total_funded,
    w.total_spent,
    lp.points_balance,
    lp.current_tier,
    w.last_transaction_at
FROM users u
JOIN wallets w ON u.id = w.user_id
JOIN loyalty_points lp ON u.id = lp.user_id
WHERE u.status = 'active' AND w.status = 'active';

-- Restaurant analytics view
CREATE VIEW restaurant_analytics AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    COUNT(DISTINCT s.user_id) as unique_customers,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as average_order_value,
    COUNT(DISTINCT DATE(o.created_at)) as active_days
FROM restaurants r
LEFT JOIN sessions s ON r.id = s.restaurant_id
LEFT JOIN orders o ON s.id = o.session_id AND o.status = 'served'
WHERE r.status = 'active'
GROUP BY r.id, r.name;

-- Daily sales view
CREATE VIEW daily_sales AS
SELECT 
    r.name as restaurant_name,
    DATE(o.created_at) as sale_date,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as daily_revenue,
    AVG(o.total_amount) as avg_order_value
FROM restaurants r
JOIN sessions s ON r.id = s.restaurant_id
JOIN orders o ON s.id = o.session_id
WHERE o.status = 'served'
GROUP BY r.id, r.name, DATE(o.created_at)
ORDER BY sale_date DESC;

-- Add this to your setup.sql or run separately
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- =====================================================
-- SETUP COMPLETE MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Dabil database setup completed successfully!';
    RAISE NOTICE 'Super Admin created: Email admin@dabil.com, Password: admin123';
    RAISE NOTICE 'All mock data removed - clean database ready for production';
    RAISE NOTICE 'Authentication now uses email/password only';
END $$;