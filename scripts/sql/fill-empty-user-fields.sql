-- Fill empty user fields with test data
-- This script updates all NULL or empty fields in the users table

BEGIN;

-- Update empty passport_number
UPDATE users
SET passport_number = 'PP' || LPAD(id::text, 7, '0')
WHERE passport_number IS NULL OR passport_number = '';

-- Update empty name
UPDATE users
SET name = CASE 
  WHEN role = 'admin' THEN 'Admin'
  WHEN role = 'owner' THEN 'Owner'
  WHEN role = 'manager' THEN 'Manager'
  WHEN role = 'client' THEN 'Client'
  ELSE 'User'
END || ' ' || id::text
WHERE name IS NULL OR name = '';

-- Update empty surname
UPDATE users
SET surname = CASE 
  WHEN role = 'admin' THEN 'Administrator'
  WHEN role = 'owner' THEN 'Company'
  WHEN role = 'manager' THEN 'Staff'
  WHEN role = 'client' THEN 'User'
  ELSE 'Person'
END || ' ' || id::text
WHERE surname IS NULL OR surname = '';

-- Update empty citizenship (assign random popular countries)
UPDATE users
SET citizenship = (
  SELECT name FROM (
    VALUES 
      ('Russia'),
      ('Thailand'),
      ('United States'),
      ('United Kingdom'),
      ('Germany'),
      ('France'),
      ('China'),
      ('Japan'),
      ('Australia'),
      ('Canada')
  ) AS countries(name)
  ORDER BY random()
  LIMIT 1
)
WHERE citizenship IS NULL OR citizenship = '';

-- Update empty city
UPDATE users
SET city = (
  SELECT city_name FROM (
    VALUES 
      ('Bangkok'),
      ('Phuket'),
      ('Pattaya'),
      ('Chiang Mai'),
      ('Moscow'),
      ('London'),
      ('New York'),
      ('Berlin'),
      ('Paris'),
      ('Tokyo')
  ) AS cities(city_name)
  ORDER BY random()
  LIMIT 1
)
WHERE city IS NULL OR city = '';

-- Update empty gender
UPDATE users
SET gender = CASE 
  WHEN random() < 0.5 THEN 'male'
  ELSE 'female'
END
WHERE gender IS NULL OR gender = '';

-- Update empty phone (generate Thai phone numbers)
UPDATE users
SET phone = '+66' || LPAD((600000000 + (random() * 99999999)::bigint)::text, 9, '0')
WHERE phone IS NULL OR phone = '';

-- Update empty second_phone (WhatsApp)
UPDATE users
SET second_phone = '+66' || LPAD((800000000 + (random() * 99999999)::bigint)::text, 9, '0')
WHERE second_phone IS NULL OR second_phone = '';

-- Update empty telegram
UPDATE users
SET telegram = 'user' || id::text
WHERE telegram IS NULL OR telegram = '';

COMMIT;

-- Show summary of updated records
SELECT 
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN passport_number IS NOT NULL AND passport_number != '' THEN 1 END) as with_passport,
  COUNT(CASE WHEN citizenship IS NOT NULL AND citizenship != '' THEN 1 END) as with_citizenship,
  COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as with_city,
  COUNT(CASE WHEN gender IS NOT NULL AND gender != '' THEN 1 END) as with_gender,
  COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
  COUNT(CASE WHEN second_phone IS NOT NULL AND second_phone != '' THEN 1 END) as with_whatsapp,
  COUNT(CASE WHEN telegram IS NOT NULL AND telegram != '' THEN 1 END) as with_telegram
FROM users
GROUP BY role
ORDER BY role;
