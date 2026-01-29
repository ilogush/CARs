-- Migration: API Optimization Indexes
-- Created: 2026-01-29
-- Description: Additional indexes to optimize frequently used API queries

-- 1. car_brands optimization for search queries
CREATE INDEX IF NOT EXISTS idx_car_brands_name_pattern ON public.car_brands USING btree (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_car_brands_deleted_name ON public.car_brands USING btree (name) WHERE deleted_at IS NULL;

-- 2. car_models optimization for search and joins
CREATE INDEX IF NOT EXISTS idx_car_models_name_pattern ON public.car_models USING btree (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_car_models_brand_id ON public.car_models USING btree (brand_id) WHERE deleted_at IS NULL;

-- 3. car_templates for frequent joins and searches
CREATE INDEX IF NOT EXISTS idx_car_templates_brand_model_lookup ON public.car_templates USING btree (brand_id, model_id) WHERE deleted_at IS NULL;

-- 4. company_cars optimization for license plate search
CREATE INDEX IF NOT EXISTS idx_company_cars_license_pattern ON public.company_cars USING btree (license_plate text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_company_cars_company_template ON public.company_cars USING btree (company_id, template_id, status);

-- 5. contracts optimization for client and status searches
CREATE INDEX IF NOT EXISTS idx_contracts_client_company_car ON public.contracts USING btree (client_id, company_car_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status_dates ON public.contracts USING btree (status, start_date, end_date);

-- 6. payments optimization for contract lookup
CREATE INDEX IF NOT EXISTS idx_payments_contract_status ON public.payments USING btree (contract_id, payment_status_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_created ON public.payments USING btree (company_id, created_at DESC) WHERE company_id IS NOT NULL;

-- 7. bookings optimization for status and car lookup
CREATE INDEX IF NOT EXISTS idx_bookings_status_dates ON public.bookings USING btree (status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_car_dates ON public.bookings USING btree (company_car_id, start_date, end_date);

-- 8. companies optimization for owner and location lookups
CREATE INDEX IF NOT EXISTS idx_companies_name_pattern ON public.companies USING btree (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_companies_owner_location ON public.companies USING btree (owner_id, location_id);

-- 9. users optimization for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users USING btree (role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_pattern ON public.users USING btree (lower(email) text_pattern_ops);

-- 10. managers optimization for user and company lookups
CREATE INDEX IF NOT EXISTS idx_managers_user_company ON public.managers USING btree (user_id, company_id) WHERE is_active = true;

-- 11. car_colors optimization for name searches
CREATE INDEX IF NOT EXISTS idx_car_colors_name_pattern ON public.car_colors USING btree (name text_pattern_ops) WHERE deleted_at IS NULL;

-- 12. locations optimization for name searches
CREATE INDEX IF NOT EXISTS idx_locations_name_pattern ON public.locations USING btree (name text_pattern_ops) WHERE deleted_at IS NULL;

-- 13. districts optimization for location lookups
CREATE INDEX IF NOT EXISTS idx_districts_location_name_pattern ON public.districts USING btree (location_id, name text_pattern_ops);

-- Performance note: text_pattern_ops indexes are specifically for ILIKE queries with leading wildcards
-- These indexes significantly improve performance for search queries like "name ILIKE '%search%'"
