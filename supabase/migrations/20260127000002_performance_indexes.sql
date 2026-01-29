-- Migration: Performance Indexes for Faster Queries
-- Created: 2026-01-27

-- 1. Indexes for car_brand_models (Filtering by brand, model and location)
CREATE INDEX IF NOT EXISTS idx_car_brand_models_brand ON public.car_brand_models USING btree (brand);
CREATE INDEX IF NOT EXISTS idx_car_brand_models_model ON public.car_brand_models USING btree (model);
CREATE INDEX IF NOT EXISTS idx_car_brand_models_location_id ON public.car_brand_models USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_car_brand_models_lookup ON public.car_brand_models (brand, model);

-- 2. Indexes for company_cars (Status filtering and common joins)
CREATE INDEX IF NOT EXISTS idx_company_cars_status ON public.company_cars USING btree (status);
CREATE INDEX IF NOT EXISTS idx_company_cars_template_lookup ON public.company_cars (template_id, status);

-- 3. Additional indexes for contracts (if not already optimized)
-- We saw idx_contracts_status and idx_contracts_company_car_id exist, which is good.

-- 4. Index for audit_logs (Performance audit lookup)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup ON public.audit_logs (entity_type, entity_id);

-- 5. Index for locations
CREATE INDEX IF NOT EXISTS idx_locations_name_id ON public.locations (id, name);
