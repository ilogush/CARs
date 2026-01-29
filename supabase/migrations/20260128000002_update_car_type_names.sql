-- Migration to update car type names
-- Date: 2026-01-28
-- Replace "Plug-in Hybrid" with "Hybrid" and "Station Wagon" with "Wagon"

BEGIN;

-- Update car_templates table if it has a body_type or type column
UPDATE car_templates 
SET body_type = 'Hybrid'
WHERE body_type = 'Plug-in Hybrid';

UPDATE car_templates 
SET body_type = 'Wagon'
WHERE body_type = 'Station Wagon';

-- If there's a separate car_types reference table
UPDATE car_types 
SET name = 'Hybrid'
WHERE name = 'Plug-in Hybrid';

UPDATE car_types 
SET name = 'Wagon'
WHERE name = 'Station Wagon';

-- Update any other tables that might reference these types
-- Add more UPDATE statements as needed based on your schema

COMMIT;
