-- Migration: Extended Performance Indexes
-- Created: 2026-01-28
-- Description: Additional indexes for critical query optimization

-- 1. Contracts optimization (most frequently queried table)
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.contracts USING btree (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON public.contracts USING btree (client_id, status) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_company_car_status ON public.contracts USING btree (company_car_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_desc ON public.contracts USING btree (created_at DESC);

-- 2. Payments optimization
CREATE INDEX IF NOT EXISTS idx_payments_contract_created ON public.payments USING btree (contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON public.payments USING btree (amount) WHERE amount IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments USING btree (status);

-- 3. Company cars optimization
CREATE INDEX IF NOT EXISTS idx_company_cars_company_status ON public.company_cars USING btree (company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_cars_license_plate ON public.company_cars USING btree (license_plate);

-- 4. Users optimization
CREATE INDEX IF NOT EXISTS idx_users_role_created ON public.users USING btree (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users USING btree (lower(email));

-- 5. Managers optimization
CREATE INDEX IF NOT EXISTS idx_managers_company_active ON public.managers USING btree (company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_managers_user_id ON public.managers USING btree (user_id);

-- 6. Bookings optimization  
CREATE INDEX IF NOT EXISTS idx_bookings_company_car_status ON public.bookings USING btree (company_car_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_desc ON public.bookings USING btree (created_at DESC);

-- 7. Tasks optimization
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON public.tasks USING btree (status, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks USING btree (assigned_to) WHERE assigned_to IS NOT NULL;

-- 8. Companies optimization
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_location_id ON public.companies USING btree (location_id);

-- 9. Car templates optimization (for reference data)
CREATE INDEX IF NOT EXISTS idx_car_templates_brand_model ON public.car_templates USING btree (brand_id, model_id);

-- 10. Districts optimization
CREATE INDEX IF NOT EXISTS idx_districts_location_name ON public.districts USING btree (location_id, name);
