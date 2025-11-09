-- Experiment to understand the discrepancy between = and LIKE operators
-- when querying ticket_id=56412

-- This demonstrates a common issue when ticket_id column has VARCHAR/TEXT type
-- instead of INT type, and contains leading spaces or other whitespace characters

-- Create test table
CREATE TABLE IF NOT EXISTS tickets_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),  -- Note: VARCHAR instead of INT
    message TEXT
);

-- Clear existing data
TRUNCATE TABLE tickets_messages;

-- Insert test data:
-- 5 records with exact value '56412'
-- 2 records with leading spaces ' 56412' or '  56412'
INSERT INTO tickets_messages (ticket_id, message) VALUES
('56412', 'Message 1'),
('56412', 'Message 2'),
('56412', 'Message 3'),
('56412', 'Message 4'),
('56412', 'Message 5'),
(' 56412', 'Message with leading space'),
('  56412', 'Message with two leading spaces');

-- Verify we have 7 total records with ticket_id containing '56412'
SELECT COUNT(*) as total_records FROM tickets_messages;

-- Query 1: Using = operator
-- Result: 5 records (exact match only, no leading/trailing spaces)
SELECT COUNT(*) as count_with_equals
FROM tickets_messages
WHERE ticket_id = '56412';

-- Query 2: Using LIKE operator with wildcard
-- Result: 7 records (matches any string containing '56412')
SELECT COUNT(*) as count_with_like
FROM tickets_messages
WHERE ticket_id LIKE '%56412';

-- Show actual values to see the difference
SELECT
    id,
    CONCAT('[', ticket_id, ']') as ticket_id_with_brackets,
    LENGTH(ticket_id) as length,
    message
FROM tickets_messages
ORDER BY id;

-- Query to find records with leading/trailing spaces
SELECT
    id,
    CONCAT('[', ticket_id, ']') as ticket_id_with_brackets,
    LENGTH(ticket_id) as length,
    message
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);

-- Query to check if there are records where ticket_id matches with LIKE but not with =
SELECT
    id,
    CONCAT('[', ticket_id, ']') as ticket_id_with_brackets,
    LENGTH(ticket_id) as length,
    message
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
  AND ticket_id != '56412';

-- Cleanup
-- DROP TABLE IF NOT EXISTS tickets_messages;
