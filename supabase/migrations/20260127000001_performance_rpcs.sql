-- Migration: Performance RPCs for Dashboard
-- Created at: 2026-01-27
-- Description: Aggregated queries for dashboard statistics to reduce network roundtrips.

-- 1. Global Admin Stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'users', (SELECT count(*) FROM users),
        'cars', (SELECT count(*) FROM company_cars),
        'companies', (SELECT count(*) FROM companies),
        'locations', (SELECT count(*) FROM locations),
        'colors', (SELECT count(*) FROM car_colors),
        'paymentTypes', (SELECT count(*) FROM payment_types),
        'contracts', (SELECT count(*) FROM contracts),
        'bookings', (SELECT count(*) FROM bookings)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 2. Company Stats (Optimized)
CREATE OR REPLACE FUNCTION get_company_dashboard_stats(p_company_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_first_day_month TIMESTAMP := date_trunc('month', now());
    v_last_day_month TIMESTAMP := (date_trunc('month', now()) + interval '1 month - 1 second');
    v_car_ids BIGINT[];
    v_contract_ids BIGINT[];
    v_client_ids UUID[];
BEGIN
    -- Get car IDs for this company
    SELECT array_agg(id) INTO v_car_ids FROM company_cars WHERE company_id = p_company_id;
    
    -- Get contract IDs
    IF v_car_ids IS NOT NULL THEN
        SELECT array_agg(id) INTO v_contract_ids FROM contracts WHERE company_car_id = ANY(v_car_ids);
    END IF;
    
    -- Get client IDs
    IF v_contract_ids IS NOT NULL THEN
       SELECT array_agg(DISTINCT client_id) INTO v_client_ids FROM contracts WHERE id = ANY(v_contract_ids) AND client_id IS NOT NULL;
    END IF;

    SELECT jsonb_build_object(
        'companyName', (SELECT name FROM companies WHERE id = p_company_id),
        'totalCars', (SELECT count(*) FROM company_cars WHERE company_id = p_company_id),
        'availableCars', (SELECT count(*) FROM company_cars WHERE company_id = p_company_id AND status = 'available'),
        
        'contracts', COALESCE((SELECT count(*) FROM contracts WHERE company_car_id = ANY(v_car_ids)), 0),
        'contractsThisMonth', COALESCE((SELECT count(*) FROM contracts WHERE company_car_id = ANY(v_car_ids) AND created_at BETWEEN v_first_day_month AND v_last_day_month), 0),
        
        'activeBookings', COALESCE((SELECT count(*) FROM bookings WHERE company_car_id = ANY(v_car_ids) AND status IN ('pending', 'confirmed')), 0),
        'activeBookingsThisMonth', COALESCE((SELECT count(*) FROM bookings WHERE company_car_id = ANY(v_car_ids) AND status IN ('pending', 'confirmed') AND created_at BETWEEN v_first_day_month AND v_last_day_month), 0),
        
        'totalUsers', (
            SELECT count(*) FROM (
                SELECT id FROM managers WHERE company_id = p_company_id
                UNION
                SELECT id::text FROM users WHERE id = ANY(v_client_ids)
                -- Add owner if exists (this logic depends on your schema, assuming 1 owner per company)
            ) AS sub
        ) + 1, -- +1 for the owner
        
        'totalPaymentsAmount', COALESCE((SELECT sum(amount::numeric) FROM payments WHERE contract_id = ANY(v_contract_ids)), 0),
        'paymentsThisMonthAmount', COALESCE((SELECT sum(amount::numeric) FROM payments WHERE contract_id = ANY(v_contract_ids) AND created_at BETWEEN v_first_day_month AND v_last_day_month), 0)
    ) INTO result;

    RETURN result;
END;
$$;
