# Question

We know there are exactly 7 records with ticket_id=56412. There are no records with ticket_id > 60000, and no characters before 56412. How could the difference in count appear? Describe your actions.

- SELECT count(*) FROM tickets_messages WHERE ticket_id=56412; returns 5 records
- SELECT count(*) FROM tickets_messages WHERE ticket_id like '%56412'; returns 7 records

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The difference in record counts (5 with `=` and 7 with `LIKE`) indicates the presence of whitespace (or other invisible characters) at the beginning or end of values in the ticket_id field. The `=` operator requires exact matching, while `LIKE '%56412'` finds all records where the string ends with '56412', including records with leading spaces like ' 56412' or '  56412'. You need to check actual values using CONCAT/LENGTH functions, find records with spaces, identify the source of the problem, and fix the data using TRIM.

---

## Detailed explanation

This situation is a classic [data quality](https://en.wikipedia.org/wiki/Data_quality) problem in [MySQL](https://en.wikipedia.org/wiki/MySQL), related to invisible [whitespace characters](https://en.wikipedia.org/wiki/Whitespace_character) in text fields.

### 1. Understanding the problem: why different results?

**Key difference between operators:**

**The `=` operator (exact comparison):**
```sql
SELECT count(*) FROM tickets_messages WHERE ticket_id = '56412';
-- Result: 5 records
```
The [equality operator](https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#operator_equal) requires **complete exact matching** of strings. It will only find records where ticket_id contains exactly '56412' without any additional characters.

**The `LIKE` operator (pattern matching):**
```sql
SELECT count(*) FROM tickets_messages WHERE ticket_id LIKE '%56412';
-- Result: 7 records
```
The [LIKE operator](https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html#operator_like) with [pattern](https://en.wikipedia.org/wiki/Pattern_matching) `%56412` (where `%` matches any number of characters) finds all records where the string **ends with** '56412', regardless of what comes before it.

**Conclusion:** The 2 additional records contain spaces or other characters before '56412', such as:
- `' 56412'` (one space)
- `'  56412'` (two spaces)
- `'\t56412'` ([tab character](https://en.wikipedia.org/wiki/Tab_key))
- `'\n56412'` ([newline](https://en.wikipedia.org/wiki/Newline))

### 2. Diagnosis: checking actual values

**Step 1: Visualize invisible characters**

Invisible characters are hard to see in regular output, so use the [CONCAT](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat) function to add markers:

```sql
-- Add square brackets around the value to see spaces
SELECT
    id,
    CONCAT('[', ticket_id, ']') as ticket_id_with_brackets,
    LENGTH(ticket_id) as length,
    CHAR_LENGTH(ticket_id) as char_length
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
ORDER BY id;
```

**Expected output:**
```
id  | ticket_id_with_brackets | length | char_length
----|------------------------|--------|------------
1   | [56412]                | 5      | 5
2   | [56412]                | 5      | 5
3   | [56412]                | 5      | 5
4   | [56412]                | 5      | 5
5   | [56412]                | 5      | 5
6   | [ 56412]               | 6      | 6          <- one space!
7   | [  56412]              | 7      | 7          <- two spaces!
```

**Step 2: Find all records with leading/trailing spaces**

```sql
-- Find records where value differs from trimmed version
SELECT
    id,
    CONCAT('[', ticket_id, ']') as original_value,
    CONCAT('[', TRIM(ticket_id), ']') as trimmed_value,
    LENGTH(ticket_id) as original_length,
    LENGTH(TRIM(ticket_id)) as trimmed_length
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);
```

The [TRIM function](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_trim) removes leading and trailing spaces from a string, allowing you to find records with spaces.

**Step 3: Check specific records that don't match**

```sql
-- Records found by LIKE but not by =
SELECT
    id,
    CONCAT('[', ticket_id, ']') as value,
    LENGTH(ticket_id) as length,
    HEX(ticket_id) as hex_representation
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
  AND ticket_id != '56412';
```

The [HEX function](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_hex) shows the [hexadecimal representation](https://en.wikipedia.org/wiki/Hexadecimal) of the string, where:
- `20` = space
- `09` = tab
- `0A` = line feed (LF)
- `0D` = carriage return (CR)

**Example output:**
```
id | value      | length | hex_representation
---|------------|--------|-------------------
6  | [ 56412]   | 6      | 203536343132      <- 20 = space
7  | [  56412]  | 7      | 20203536343132    <- 2020 = two spaces
```

### 3. Possible causes of spaces appearing

**3.1. Data entry errors**

[User input](https://en.wikipedia.org/wiki/Input/output) through web forms without proper validation:
```php
// Bad example: without processing
$ticket_id = $_POST['ticket_id'];  // User entered ' 56412'
```

**Fix:**
```php
// Good example: with processing
$ticket_id = trim($_POST['ticket_id']);
```

**3.2. Data import from CSV/Excel**

When [importing data](https://en.wikipedia.org/wiki/Data_migration) from [CSV](https://en.wikipedia.org/wiki/Comma-separated_values) or [Excel](https://en.wikipedia.org/wiki/Microsoft_Excel), cells may contain spaces:

```sql
-- Loading data without processing
LOAD DATA INFILE '/path/to/file.csv'
INTO TABLE tickets_messages
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

**Fix:**
```sql
-- Using SET for cleanup
LOAD DATA INFILE '/path/to/file.csv'
INTO TABLE tickets_messages
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(@ticket_id, @message)
SET
    ticket_id = TRIM(@ticket_id),
    message = @message;
```

**3.3. String concatenation in code**

Improper concatenation in [application code](https://en.wikipedia.org/wiki/Application_software):
```javascript
// Bad example
const ticketId = ' ' + userInput;  // Accidental space
```

**3.4. Copying from documents**

Users copy IDs from Word/PDF documents, capturing invisible characters.

### 4. Check column data type

**Important check:** ensure that `ticket_id` has the correct [data type](https://dev.mysql.com/doc/refman/8.0/en/data-types.html).

```sql
-- Check table structure
DESCRIBE tickets_messages;
-- or
SHOW CREATE TABLE tickets_messages;
```

**Issue:** If ticket_id is defined as [VARCHAR](https://dev.mysql.com/doc/refman/8.0/en/char.html) or [TEXT](https://dev.mysql.com/doc/refman/8.0/en/blob.html), it can store spaces. If it's a numeric value, it's better to use [INT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html) or [BIGINT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html).

**Current (probable):**
```sql
ticket_id VARCHAR(50)  -- Can contain spaces
```

**Recommended (if numeric):**
```sql
ticket_id INT UNSIGNED  -- Only numbers, spaces impossible
```

### 5. Fixing existing data

**Step 1: Create backup**

```sql
-- IMPORTANT: always create backup before modifying data
CREATE TABLE tickets_messages_backup AS
SELECT * FROM tickets_messages;
```

**Step 2: Update data by removing spaces**

```sql
-- Trim leading and trailing spaces
UPDATE tickets_messages
SET ticket_id = TRIM(ticket_id)
WHERE ticket_id != TRIM(ticket_id);
```

**Step 3: Verify results**

```sql
-- Should now return the same count
SELECT COUNT(*) FROM tickets_messages WHERE ticket_id = '56412';
-- Result: 7 records

SELECT COUNT(*) FROM tickets_messages WHERE ticket_id LIKE '%56412';
-- Result: 7 records
```

**Step 4: (Optional) Change data type**

If ticket_id always contains numbers, change the type to INT:

```sql
-- First ensure all values are numeric
SELECT ticket_id
FROM tickets_messages
WHERE ticket_id REGEXP '[^0-9]';  -- Find non-numeric values

-- If empty, can safely change type
ALTER TABLE tickets_messages
MODIFY COLUMN ticket_id INT UNSIGNED;
```

### 6. Preventing future issues

**6.1. Application-level validation**

```python
# Python example
def clean_ticket_id(ticket_id):
    """Clean and validate ticket_id"""
    # Remove whitespace
    ticket_id = ticket_id.strip()

    # Verify it's a number
    if not ticket_id.isdigit():
        raise ValueError(f"Invalid ticket_id: {ticket_id}")

    return int(ticket_id)

# Usage
ticket_id = clean_ticket_id(user_input)
```

**6.2. Database constraints**

If using VARCHAR, add a [CHECK constraint](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html) (MySQL 8.0.16+):

```sql
ALTER TABLE tickets_messages
ADD CONSTRAINT ticket_id_no_spaces
CHECK (ticket_id = TRIM(ticket_id));
```

**6.3. Triggers for automatic cleanup**

Create a [trigger](https://dev.mysql.com/doc/refman/8.0/en/triggers.html) to automatically trim spaces:

```sql
DELIMITER //

CREATE TRIGGER clean_ticket_id_before_insert
BEFORE INSERT ON tickets_messages
FOR EACH ROW
BEGIN
    SET NEW.ticket_id = TRIM(NEW.ticket_id);
END//

CREATE TRIGGER clean_ticket_id_before_update
BEFORE UPDATE ON tickets_messages
FOR EACH ROW
BEGIN
    SET NEW.ticket_id = TRIM(NEW.ticket_id);
END//

DELIMITER ;
```

**6.4. Regular monitoring**

Create a query for regular data quality checks:

```sql
-- Monitoring query: find records with spaces
SELECT
    COUNT(*) as records_with_spaces,
    COUNT(DISTINCT ticket_id) as unique_tickets_affected
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);
```

### 7. Additional diagnostic queries

**Check for trailing spaces:**
```sql
SELECT
    id,
    CONCAT('[', ticket_id, ']') as value,
    LENGTH(ticket_id) as length
FROM tickets_messages
WHERE ticket_id LIKE '56412%'
  AND ticket_id != '56412';
```

**Check for non-standard whitespace characters:**
```sql
SELECT
    id,
    ticket_id,
    HEX(ticket_id) as hex_value,
    CASE
        WHEN ticket_id LIKE ' %' THEN 'Leading space'
        WHEN ticket_id LIKE '%\t%' THEN 'Contains tab'
        WHEN ticket_id LIKE '%\n%' THEN 'Contains newline'
        WHEN ticket_id LIKE '%\r%' THEN 'Contains carriage return'
        ELSE 'Other whitespace'
    END as whitespace_type
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);
```

**Group by issue type:**
```sql
SELECT
    LENGTH(ticket_id) - LENGTH(TRIM(ticket_id)) as spaces_count,
    COUNT(*) as records_count
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
GROUP BY spaces_count
ORDER BY spaces_count;
```

### 8. Action plan for solving the task

**Short-term actions (immediate):**

1. ✓ Visualize problematic values:
   ```sql
   SELECT CONCAT('[', ticket_id, ']'), LENGTH(ticket_id)
   FROM tickets_messages WHERE ticket_id LIKE '%56412';
   ```

2. ✓ Identify problematic records:
   ```sql
   SELECT * FROM tickets_messages
   WHERE ticket_id LIKE '%56412' AND ticket_id != '56412';
   ```

3. ✓ Create backup:
   ```sql
   CREATE TABLE tickets_messages_backup AS SELECT * FROM tickets_messages;
   ```

4. ✓ Fix data:
   ```sql
   UPDATE tickets_messages SET ticket_id = TRIM(ticket_id)
   WHERE ticket_id != TRIM(ticket_id);
   ```

**Medium-term actions (within a week):**

5. ✓ Analyze the source of the problem (input forms, import, API)
6. ✓ Add validation in application code
7. ✓ Create triggers to prevent future issues
8. ✓ Consider changing data type to INT (if applicable)

**Long-term actions (planning):**

9. ✓ Implement data quality monitoring
10. ✓ Audit other text fields for similar issues
11. ✓ Document data quality standards
12. ✓ Train the team on proper data handling practices

### 9. Comparison of operator behavior

| Aspect | `=` | `LIKE '%56412'` |
|--------|-----|-----------------|
| Accuracy | Exact match | Pattern match |
| Leading spaces | No match | Matches |
| Trailing spaces | No match | No match (for `%56412`) |
| Performance | Can use [index](https://en.wikipedia.org/wiki/Database_index) | Usually [full table scan](https://en.wikipedia.org/wiki/Full_table_scan) |
| Case sensitivity | Depends on [collation](https://dev.mysql.com/doc/refman/8.0/en/charset-general.html) | Depends on collation |
| Use case | Exact search | Partial matching |

### 10. Practical examples for testing

**Create test table:**
```sql
CREATE TABLE test_whitespace (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value VARCHAR(20)
);

INSERT INTO test_whitespace (value) VALUES
('56412'),           -- Exact value
(' 56412'),          -- One leading space
('  56412'),         -- Two leading spaces
('56412 '),          -- One trailing space
(' 56412 '),         -- Spaces on both sides
('\t56412'),         -- Tab
('\n56412');         -- Newline

-- Test various queries
SELECT COUNT(*) FROM test_whitespace WHERE value = '56412';         -- 1
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '%56412';     -- 4
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '56412%';     -- 3
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '%56412%';    -- 6
SELECT COUNT(*) FROM test_whitespace WHERE TRIM(value) = '56412';   -- 5

-- Cleanup
DROP TABLE test_whitespace;
```

### Conclusion

The difference between 5 and 7 records is the result of **leading spaces** (or other invisible characters) present in 2 records. The `=` operator requires exact matching and doesn't find records with spaces, while `LIKE '%56412'` finds all records where the string ends with '56412', regardless of preceding characters.

**Solution:** Use the `TRIM()` function to clean the data and implement validation to prevent future issues.

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
