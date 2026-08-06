-- ==========================================================================
-- Skate Go - Supabase Schema Migration & Initial Seed Data
-- Module 7: Complete Product Management System (CRUD)
-- Target Domain: Inline Skating Accessories in India
-- ==========================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_hidden BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_hidden ON public.categories(is_hidden);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order ASC);

-- --------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
    brand TEXT,
    weight TEXT,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0),
    low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
    stock_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    colors JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    images JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    order_count INTEGER DEFAULT 0 CHECK (order_count >= 0),
    is_featured BOOLEAN DEFAULT false,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all new columns exist on existing databases
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity);

-- --------------------------------------------------------------------------
-- 3. ORDERS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    shipping_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_charge >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed')),
    order_status TEXT NOT NULL DEFAULT 'New' CHECK (order_status IN ('New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
    whatsapp_number TEXT DEFAULT '917063062326',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- --------------------------------------------------------------------------
-- 4. ANALYTICS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON public.analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics(created_at DESC);

-- --------------------------------------------------------------------------
-- 5. STORE SETTINGS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY DEFAULT 1,
    store_name TEXT DEFAULT 'Skate Go',
    store_description TEXT DEFAULT 'Premium Inline Skating Accessories & Speed Equipment in India.',
    whatsapp_number TEXT DEFAULT '917063062326',
    support_phone TEXT DEFAULT '+91 7063062326',
    support_email TEXT DEFAULT 'support@skatelab.in',
    business_address TEXT DEFAULT 'Plot 42, Speed Avenue, Urban Sports Hub, New Delhi, India 110001',
    free_shipping_amount NUMERIC(10, 2) DEFAULT 2999.00 CHECK (free_shipping_amount >= 0),
    min_advance_pct NUMERIC(5, 2) DEFAULT 25.00 CHECK (min_advance_pct >= 0 AND min_advance_pct <= 100),
    estimated_delivery_days TEXT DEFAULT '3 - 5 Business Days',
    upi_id TEXT DEFAULT 'skatelab@upi',
    upi_qr_image TEXT DEFAULT 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=400&q=80',
    store_logo TEXT DEFAULT '',
    favicon TEXT DEFAULT '',
    seo_default_title TEXT DEFAULT 'Skate Go | Inline Skating Accessories & Speed Gear',
    seo_default_description TEXT DEFAULT 'Shop high performance inline wheels, bearings, frames, and protective gear in India.',
    enable_cod BOOLEAN DEFAULT true,
    enable_upi BOOLEAN DEFAULT true,
    enable_free_shipping BOOLEAN DEFAULT true,
    enable_featured_products BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Ensure default row exists
INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Active Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin All Categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Read Active Products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All Products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Create Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All Orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Insert Analytics" ON public.analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All Analytics" ON public.analytics FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Update Settings" ON public.store_settings FOR ALL USING (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 7. STORAGE BUCKETS CONFIGURATION
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Storage Read Product Images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin Storage Upload Product Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Storage Delete Product Images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public Storage Read Store Assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');
CREATE POLICY "Admin Storage Upload Store Assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Storage Delete Store Assets" ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 8. INITIAL SEED DATA
-- --------------------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, image_url, is_hidden, display_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Inline Wheels', 'inline-wheels', 'High-rebound urethane wheels engineered for speed and street freeskating.', 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&w=600&q=80', false, 1),
('550e8400-e29b-41d4-a716-446655440002', 'Bearings & Lubricants', 'bearings-lubricants', 'Precision Chrome and Ceramic bearings, synthetic oils, and solvents.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', false, 2),
('550e8400-e29b-41d4-a716-446655440003', 'Frames & Axles', 'frames-axles', 'CNC machined aircraft-grade 6061 aluminum frames and rockerable axles.', 'https://images.unsplash.com/photo-1537498425277-c283d32ef9db?auto=format&fit=crop&w=600&q=80', false, 3),
('550e8400-e29b-41d4-a716-446655440004', 'Protective Gear', 'protective-gear', 'Pro-grade wrist guards, knee pads, helmets, and crash pads.', 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80', false, 4),
('550e8400-e29b-41d4-a716-446655440005', 'Maintenance & Tools', 'maintenance-tools', 'Multi-functional T-tools, bearing pullers, and custom speed laces.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', false, 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (id, title, slug, description, price, original_price, brand, weight, stock_quantity, reserved_stock, low_stock_threshold, colors, sizes, category_id, images, is_active, view_count, order_count, is_featured) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Apex V2 80mm 85A Freeskate Wheels (Pack of 4)',
    'apex-v2-80mm-85a-wheels',
    'Ultra high rebound polyurethane formula crafted for street freeskating.',
    1890.00,
    2400.00,
    'Apex',
    '380g',
    45,
    2,
    5,
    '["Obsidian Black", "High-Octane Red"]'::jsonb,
    '["80mm / 85A", "76mm / 85A"]'::jsonb,
    '550e8400-e29b-41d4-a716-446655440001',
    '["https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&w=800&q=80"]'::jsonb,
    true,
    142,
    18,
    true
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    'Velocity Pro Ceramic ILQ-9 Bearings (16 Pack)',
    'velocity-pro-ceramic-ilq9-bearings',
    'Silicon Nitride ceramic balls paired with deep-groove polished chrome steel races.',
    3490.00,
    4200.00,
    'Velocity Pro',
    '190g',
    3,
    0,
    5,
    '["Matte Black / Gold"]'::jsonb,
    '["Standard 608 RS"]'::jsonb,
    '550e8400-e29b-41d4-a716-446655440003',
    '["https://images.unsplash.com/photo-1597075687490-8f673c3c17f6?auto=format&fit=crop&w=800&q=80"]'::jsonb,
    true,
    98,
    12,
    true
)
ON CONFLICT (slug) DO NOTHING;