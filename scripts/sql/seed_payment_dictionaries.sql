
-- Seed Payment Statuses
INSERT INTO payment_statuses (name, value)
SELECT 'Pending', 0 WHERE NOT EXISTS (SELECT 1 FROM payment_statuses WHERE name = 'Pending');
INSERT INTO payment_statuses (name, value)
SELECT 'Paid', 1 WHERE NOT EXISTS (SELECT 1 FROM payment_statuses WHERE name = 'Paid');
INSERT INTO payment_statuses (name, value)
SELECT 'Overdue', -1 WHERE NOT EXISTS (SELECT 1 FROM payment_statuses WHERE name = 'Overdue');
INSERT INTO payment_statuses (name, value)
SELECT 'Cancelled', -2 WHERE NOT EXISTS (SELECT 1 FROM payment_statuses WHERE name = 'Cancelled');

-- Seed Payment Types
INSERT INTO payment_types (name, sign)
SELECT 'Rental Fee', '+' WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE name = 'Rental Fee');
INSERT INTO payment_types (name, sign)
SELECT 'Deposit Received', '+' WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE name = 'Deposit Received');
INSERT INTO payment_types (name, sign)
SELECT 'Deposit Refunded', '-' WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE name = 'Deposit Refunded');
INSERT INTO payment_types (name, sign)
SELECT 'Fine', '+' WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE name = 'Fine');
INSERT INTO payment_types (name, sign)
SELECT 'Service Fee', '+' WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE name = 'Service Fee');
