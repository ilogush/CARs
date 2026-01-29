-- Fill contract notes with random return location data
-- This script updates contracts to add return_location_id in notes field

BEGIN;

-- First, let's get available location IDs
DO $$
DECLARE
  contract_rec RECORD;
  location_ids INTEGER[];
  random_location_id INTEGER;
  current_notes JSONB;
BEGIN
  -- Get all location IDs into an array
  SELECT ARRAY_AGG(id) INTO location_ids FROM locations;
  
  -- If no locations found, use some default IDs
  IF location_ids IS NULL OR array_length(location_ids, 1) = 0 THEN
    location_ids := ARRAY[1, 2, 3, 4, 5];
  END IF;
  
  -- Update each contract
  FOR contract_rec IN 
    SELECT id, notes FROM contracts WHERE status IN ('active', 'completed')
  LOOP
    -- Pick a random location
    random_location_id := location_ids[1 + floor(random() * array_length(location_ids, 1))::int];
    
    -- Parse existing notes or create new JSON
    IF contract_rec.notes IS NULL OR contract_rec.notes = '' THEN
      current_notes := '{}'::jsonb;
    ELSE
      BEGIN
        current_notes := contract_rec.notes::jsonb;
      EXCEPTION WHEN OTHERS THEN
        current_notes := jsonb_build_object('old_notes', contract_rec.notes);
      END;
    END IF;
    
    -- Add return_location_id to notes
    current_notes := current_notes || jsonb_build_object(
      'return_location_id', random_location_id,
      'pickup_location_id', random_location_id, -- same as return for now
      'start_mileage', 10000 + floor(random() * 90000)::int,
      'fuel_level', CASE floor(random() * 4)::int
        WHEN 0 THEN 'Full'
        WHEN 1 THEN '3/4'
        WHEN 2 THEN '1/2'
        ELSE '1/4'
      END,
      'cleanliness', CASE floor(random() * 3)::int
        WHEN 0 THEN 'Clean'
        WHEN 1 THEN 'Normal'
        ELSE 'Dirty'
      END
    );
    
    -- Update the contract
    UPDATE contracts 
    SET notes = current_notes::text
    WHERE id = contract_rec.id;
    
    RAISE NOTICE 'Updated contract % with location %', contract_rec.id, random_location_id;
  END LOOP;
END $$;

COMMIT;

-- Show summary
SELECT 
  c.id,
  c.status,
  c.notes::jsonb->>'return_location_id' as return_location_id,
  l.name as return_location_name,
  c.notes::jsonb->>'start_mileage' as start_mileage,
  c.notes::jsonb->>'fuel_level' as fuel_level
FROM contracts c
LEFT JOIN locations l ON (c.notes::jsonb->>'return_location_id')::int = l.id
WHERE c.status IN ('active', 'completed')
ORDER BY c.id
LIMIT 20;
