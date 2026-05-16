-- ============================================================
-- Cozy Handmade — Multi-Currency System Database Schema
-- PostgreSQL / Supabase compatible
-- ============================================================

-- ── Users (core auth table — extend if using Supabase Auth) ─────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── User Profiles (currency, region, shipping preferences) ──────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Currency & region
  preferred_currency  TEXT NOT NULL DEFAULT 'NGN',         -- e.g. 'GBP', 'USD'
  country_code        TEXT NOT NULL DEFAULT 'NG',          -- ISO 3166-1 alpha-2
  shipping_region     TEXT NOT NULL DEFAULT 'nigeria'
                      CHECK (shipping_region IN ('nigeria', 'africa', 'international')),

  -- Shipping address (pre-fills checkout)
  first_name          TEXT,
  last_name           TEXT,
  phone               TEXT,
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  state_province      TEXT,
  postcode            TEXT,

  -- Metadata
  detection_method    TEXT DEFAULT 'default'
                      CHECK (detection_method IN ('profile', 'localStorage', 'ip', 'browser', 'default')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

-- ── Exchange Rate Cache (server-side persistence) ────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            SERIAL PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'NGN',
  currency      TEXT NOT NULL,                             -- target currency code
  rate          NUMERIC(20, 10) NOT NULL,                  -- NGN → currency multiplier
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL DEFAULT 'live'
                CHECK (source IN ('live', 'cached', 'fallback')),
  provider      TEXT NOT NULL DEFAULT 'open.er-api.com',

  UNIQUE (base_currency, currency)
);

-- Keep rate history for auditing / dispute resolution
CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id            SERIAL PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'NGN',
  currency      TEXT NOT NULL,
  rate          NUMERIC(20, 10) NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL,
  source        TEXT NOT NULL,
  provider      TEXT NOT NULL
);

-- Automatically archive old rates before upsert
CREATE OR REPLACE FUNCTION archive_exchange_rate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO exchange_rate_history (base_currency, currency, rate, fetched_at, source, provider)
  SELECT OLD.base_currency, OLD.currency, OLD.rate, OLD.fetched_at, OLD.source, OLD.provider
  WHERE OLD.rate IS DISTINCT FROM NEW.rate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_rate ON exchange_rates;
CREATE TRIGGER trg_archive_rate
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW EXECUTE FUNCTION archive_exchange_rate();

-- ── Currency Config (admin-managed, rarely changes) ─────────────────────────
CREATE TABLE IF NOT EXISTS currency_config (
  code              TEXT PRIMARY KEY,                      -- e.g. 'GBP'
  name              TEXT NOT NULL,
  symbol            TEXT NOT NULL,
  locale            TEXT NOT NULL,
  display_decimals  SMALLINT NOT NULL DEFAULT 2
                    CHECK (display_decimals IN (0, 2)),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  paystack_support  BOOLEAN NOT NULL DEFAULT false,
  stripe_support    BOOLEAN NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed currency config
INSERT INTO currency_config (code, name, symbol, locale, display_decimals, paystack_support, stripe_support) VALUES
  ('NGN', 'Nigerian Naira',      '₦',   'en-NG', 0, true,  false),
  ('USD', 'US Dollar',           '$',   'en-US', 2, false, true),
  ('GBP', 'British Pound',       '£',   'en-GB', 2, false, true),
  ('EUR', 'Euro',                '€',   'de-DE', 2, false, true),
  ('CAD', 'Canadian Dollar',     'CA$', 'en-CA', 2, false, true),
  ('AUD', 'Australian Dollar',   'A$',  'en-AU', 2, false, true),
  ('GHS', 'Ghanaian Cedi',       '₵',   'en-GH', 2, true,  false),
  ('KES', 'Kenyan Shilling',     'KSh', 'en-KE', 0, false, false),
  ('ZAR', 'South African Rand',  'R',   'en-ZA', 2, false, true)
ON CONFLICT (code) DO NOTHING;

-- ── Orders (currency snapshot at time of purchase) ───────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Line-item totals stored in BOTH currencies for audit trail
  subtotal_ngn        NUMERIC(14, 2) NOT NULL,
  shipping_ngn        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_ngn           NUMERIC(14, 2) NOT NULL,

  display_currency    TEXT NOT NULL DEFAULT 'NGN',
  subtotal_display    NUMERIC(14, 2) NOT NULL,
  shipping_display    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_display       NUMERIC(14, 2) NOT NULL,
  exchange_rate       NUMERIC(20, 10) NOT NULL DEFAULT 1,
  rate_source         TEXT NOT NULL DEFAULT 'live',

  -- Payment
  payment_gateway     TEXT NOT NULL CHECK (payment_gateway IN ('paystack', 'stripe')),
  payment_reference   TEXT UNIQUE,
  payment_status      TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Shipping
  shipping_region     TEXT NOT NULL DEFAULT 'nigeria',
  country_code        TEXT NOT NULL DEFAULT 'NG',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates (currency);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_currency ON exchange_rate_history (currency, fetched_at DESC);

-- ── Row-Level Security (Supabase) ────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "user_profile_self" ON user_profiles
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only read their own orders
CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- Exchange rates and currency config are public-read
CREATE POLICY "exchange_rates_public_read" ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "currency_config_public_read" ON currency_config FOR SELECT USING (true);
