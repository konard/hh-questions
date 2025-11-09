# Question

Which MySQL query is the heaviest: https://xpaste.pro/p/t4q0Lsp0?

Explain how you identified it.

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The heaviest query is Query 4 (the last SELECT query). It's identified by these characteristics: massive list of 143 forum_id values in the IN clause, LIMIT 18446744073709551615 (effectively unlimited), multiple CROSS JOINs, lack of result filtering, leading to full table scans and processing enormous amounts of data.

---

## Detailed explanation

When analyzing a set of [MySQL](https://en.wikipedia.org/wiki/MySQL) queries to identify the heaviest one, a systematic approach considering multiple performance factors is necessary.

### Analysis of presented queries

Let's examine all four [queries](https://en.wikipedia.org/wiki/SQL) from the provided link:

**Query 1:**
```sql
SELECT f.*, t.*, p.*, u.*, tt.mark_time AS topic_mark_time, ft.mark_time AS forum_mark_time
FROM (phpbb_posts p CROSS JOIN phpbb_users u CROSS JOIN phpbb_topics t)
LEFT JOIN phpbb_forums f ON (t.forum_id = f.forum_id)
LEFT JOIN phpbb_topics_track tt ON (t.topic_id = tt.topic_id AND tt.user_id = 659822)
LEFT JOIN phpbb_forums_track ft ON (f.forum_id = ft.forum_id AND ft.user_id = 659822)
WHERE p.topic_id = t.topic_id AND p.poster_id = u.user_id
  AND p.post_time > 1625660099
  AND p.forum_id = 326
  AND p.post_approved = 1
ORDER BY t.topic_last_post_time DESC, p.post_time
LIMIT 100;
```

**Query 2:**
```sql
DELETE FROM phpbb_post_revisions WHERE post_id = 10472158;
```

**Query 3:**
```sql
SELECT f.*, t.*, p.*, u.*, tt.mark_time AS topic_mark_time, ft.mark_time AS forum_mark_time
FROM (phpbb_posts p CROSS JOIN phpbb_users u CROSS JOIN phpbb_topics t)
LEFT JOIN phpbb_forums f ON (t.forum_id = f.forum_id)
LEFT JOIN phpbb_topics_track tt ON (t.topic_id = tt.topic_id AND tt.user_id = 427441)
LEFT JOIN phpbb_forums_track ft ON (f.forum_id = ft.forum_id AND ft.user_id = 427441)
WHERE p.topic_id = t.topic_id AND p.poster_id = u.user_id
  AND p.post_time > 1625656199
  AND p.forum_id IN (326, 527, 544, 1102)
  AND p.post_approved = 1
ORDER BY t.topic_last_post_time DESC, p.post_time
LIMIT 18446744073709551615;
```

**Query 4:**
```sql
SELECT f.*, t.*, p.*, u.*, tt.mark_time AS topic_mark_time, ft.mark_time AS forum_mark_time
FROM (phpbb_posts p CROSS JOIN phpbb_users u CROSS JOIN phpbb_topics t)
LEFT JOIN phpbb_forums f ON (t.forum_id = f.forum_id)
LEFT JOIN phpbb_topics_track tt ON (t.topic_id = tt.topic_id AND tt.user_id = 69079)
LEFT JOIN phpbb_forums_track ft ON (f.forum_id = ft.forum_id AND ft.user_id = 69079)
WHERE p.topic_id = t.topic_id AND p.poster_id = u.user_id
  AND p.post_time > 1625660599
  AND p.forum_id IN (9, 16, 17, 28, 36, 42, 55, 60, 65, 790, 64, 66, 110, 116, 837, 833, 133, 134, 135, 137, 143, 158, 823, 810, 788, 208, 211, 212, 213, 215, 216, 217, 218, 220, 221, 223, 224, 822, 836, 236, 238, 241, 242, 243, 270, 776, 291, 293, 294, 296, 292, 210, 40, 227, 239, 863, 781, 865, 548, 551, 552, 553, 554, 852, 851, 839, 550, 868, 884, 890, 909, 914, 916, 898, 896, 936, 937, 939, 969, 970, 982, 983, 989, 997, 92, 1076, 1124, 1130, 240, 1197, 1198, 1209, 1327, 1341, 1345, 1363, 1364, 1365, 1366, 1367, 1368, 1371, 1372, 1373, 1374, 1375, 1376, 1377, 1378, 1370, 1404, 1405, 1406, 1407, 1416, 1417, 1418, 1419, 1423, 1424, 1441, 1442, 1443, 1461, 1481, 1490, 1495, 1496, 1497, 1508, 1524, 1536, 1541, 1542, 119)
  AND p.post_approved = 1
ORDER BY t.topic_last_post_time DESC, p.post_time
LIMIT 18446744073709551615;
```

### Methodology for identifying the heaviest query

#### 1. Visual analysis of query structure

**Query 2** can be immediately dismissed - it's a simple [DELETE](https://en.wikipedia.org/wiki/Data_manipulation_language) with a [primary key](https://en.wikipedia.org/wiki/Primary_key) condition, it will execute instantly.

**Queries 1, 3, 4** have similar structure with several critical differences:

| Parameter | Query 1 | Query 3 | Query 4 |
|----------|---------|---------|---------|
| Number of forum_id in IN | 1 (equality) | 4 | **143** |
| LIMIT | 100 | 18446744073709551615 | 18446744073709551615 |
| Potential data volume | Low | Medium | **Very High** |

#### 2. Analysis of key load factors

**Problem 1: Massive IN clause in Query 4**

```sql
p.forum_id IN (9, 16, 17, ... 143 values ... 1542, 119)
```

**Performance impact:**
- MySQL must check each row against any of 143 values
- [Query optimizer](https://en.wikipedia.org/wiki/Query_optimization) may not use [indexes](https://en.wikipedia.org/wiki/Database_index) efficiently with such a large list
- If each forum_id has significant posts, the intermediate data volume will be enormous

**Problem 2: Effectively unlimited LIMIT**

```sql
LIMIT 18446744073709551615
```

The value `18446744073709551615` is the maximum value for [unsigned BIGINT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html) (2^64 - 1), effectively meaning "return all rows".

**Impact:**
- MySQL cannot optimize execution through early stopping
- All matching rows must be processed
- Full sorting of entire result set required

**Problem 3: CROSS JOIN**

```sql
FROM (phpbb_posts p CROSS JOIN phpbb_users u CROSS JOIN phpbb_topics t)
```

[CROSS JOIN](https://en.wikipedia.org/wiki/Join_(SQL)#Cross_join) creates a [Cartesian product](https://en.wikipedia.org/wiki/Cartesian_product), but thanks to WHERE conditions:
```sql
WHERE p.topic_id = t.topic_id AND p.poster_id = u.user_id
```
it effectively becomes an [INNER JOIN](https://en.wikipedia.org/wiki/Join_(SQL)#Inner_join).

However, the join order may be suboptimal - MySQL will have to create large intermediate tables first.

**Problem 4: SELECT \***

```sql
SELECT f.*, t.*, p.*, u.*
```

The query selects **all fields** from four tables, meaning:
- Large volume of data transferred
- Increased [buffer pool](https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html) usage
- More [I/O operations](https://en.wikipedia.org/wiki/Input/output)

**Problem 5: Sorting large dataset**

```sql
ORDER BY t.topic_last_post_time DESC, p.post_time
```

With a large result set, this requires:
- Creating [temporary tables](https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html)
- [Filesort](https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html#order-by-filesort) operation for sorting

#### 3. Instrumental analysis

Several approaches can be used for precise identification:

**Method 1: EXPLAIN analysis**

```sql
EXPLAIN SELECT f.*, t.*, p.*, u.* ...
```

[EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html) will show:
- `rows`: estimated number of rows examined (Query 4 will have the highest)
- `type`: table access type (ALL = full scan - bad)
- `Extra`: presence of `Using temporary; Using filesort` indicates temporary table creation and sorting

**Expected result for Query 4:**
```
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
| id | select_type | table | type   | rows   | key  | Extra  |                                 |
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
|  1 | SIMPLE      | p     | range  | 500000 | idx  | Using where; Using temporary;   |
|    |             |       |        |        |      |        | Using filesort                  |
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
```

**Method 2: EXPLAIN FORMAT=JSON**

```sql
EXPLAIN FORMAT=JSON SELECT ...
```

Provides more detailed cost information:
```json
{
  "query_block": {
    "cost_info": {
      "query_cost": "125000.50"  // Query 4 will have the highest cost
    }
  }
}
```

**Method 3: EXPLAIN ANALYZE (MySQL 8.0+)**

```sql
EXPLAIN ANALYZE SELECT ...
```

Shows **actual** execution time:
```
-> Sort: t.topic_last_post_time DESC, p.post_time  (cost=125000.50 rows=500000) (actual time=8500..8520 rows=500000 loops=1)
```

**Method 4: Query profiling**

```sql
SET profiling = 1;
SELECT ...;  -- Execute each query
SHOW PROFILES;
```

Result will show execution time for each query:
```
+----------+------------+------------------+
| Query_ID | Duration   | Query            |
+----------+------------+------------------+
|        1 | 0.032154   | SELECT ... (Q1)  |
|        2 | 0.000245   | DELETE ... (Q2)  |
|        3 | 0.128456   | SELECT ... (Q3)  |
|        4 | 12.456789  | SELECT ... (Q4)  |
+----------+------------+------------------+
```

**Method 5: Performance Schema**

```sql
SELECT * FROM performance_schema.events_statements_history
WHERE sql_text LIKE '%phpbb_posts%'
ORDER BY timer_wait DESC;
```

Will show real execution statistics with detailed metrics.

#### 4. Computational complexity estimation

Assuming table statistics:
- `phpbb_posts`: 1,000,000 rows
- `phpbb_users`: 100,000 rows
- `phpbb_topics`: 50,000 rows
- `phpbb_forums`: 500 rows

**Query 1 (forum_id = 326):**
- Posts examined: ~2,000 (1 forum)
- With JOINs: ~2,000 rows
- **Complexity: O(n) where n ≈ 2,000**

**Query 3 (4 forums):**
- Posts examined: ~8,000 (4 forums)
- With JOINs: ~8,000 rows
- **Complexity: O(n) where n ≈ 8,000**

**Query 4 (143 forums):**
- Posts examined: ~286,000 (143 forums, almost 30% of all posts)
- With JOINs: ~286,000 rows
- Sorting: O(n log n) where n = 286,000
- **Complexity: O(n log n) where n ≈ 286,000**

### Conclusion: Query 4 is the heaviest query

**Reasons:**

1. **Massive IN clause** (143 values) - checking millions of rows
2. **Effectively unlimited LIMIT** - processing all found rows
3. **Large result set** - potentially hundreds of thousands of rows
4. **Multiple JOIN operations** on large dataset
5. **SELECT \*** - transferring all fields from four tables
6. **Sorting huge dataset** - creating temporary tables and filesort

### Optimization recommendations for Query 4

#### Optimization 1: Reasonable result limitation

```sql
LIMIT 100  -- Instead of 18446744073709551615
```

For pagination:
```sql
LIMIT 100 OFFSET 0  -- For first page
```

#### Optimization 2: Select only needed fields

```sql
SELECT
    p.post_id, p.post_text, p.post_time,
    t.topic_id, t.topic_title,
    u.user_id, u.username,
    f.forum_id, f.forum_name,
    tt.mark_time AS topic_mark_time,
    ft.mark_time AS forum_mark_time
FROM ...
```

#### Optimization 3: Use INNER JOIN instead of CROSS JOIN

```sql
FROM phpbb_posts p
INNER JOIN phpbb_topics t ON p.topic_id = t.topic_id
INNER JOIN phpbb_users u ON p.poster_id = u.user_id
LEFT JOIN phpbb_forums f ON t.forum_id = f.forum_id
LEFT JOIN phpbb_topics_track tt ON (t.topic_id = tt.topic_id AND tt.user_id = 69079)
LEFT JOIN phpbb_forums_track ft ON (f.forum_id = ft.forum_id AND ft.user_id = 69079)
```

#### Optimization 4: Create composite index

```sql
CREATE INDEX idx_posts_forum_time_approved
ON phpbb_posts(forum_id, post_time, post_approved);
```

This [composite index](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html) will efficiently filter by forum_id, post_time, and post_approved.

#### Optimization 5: Break into subqueries

If the forum list is too large, break into multiple queries or use a temporary table:

```sql
CREATE TEMPORARY TABLE temp_forums (forum_id INT);
INSERT INTO temp_forums VALUES (9), (16), (17), ... ;

SELECT ...
FROM phpbb_posts p
INNER JOIN temp_forums tf ON p.forum_id = tf.forum_id
...
```

#### Optimization 6: Use index for sorting

If frequently sorting by `topic_last_post_time`:

```sql
CREATE INDEX idx_topics_last_post_time
ON phpbb_topics(topic_last_post_time DESC);
```

### Practical tools for identifying heavy queries

**1. Slow Query Log**

Enable and configure:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Queries longer than 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

Analyze the log:
```bash
mysqldumpslow -s t -t 10 /var/log/mysql/mysql-slow.log
```

**2. Performance Schema**

```sql
-- Top slow queries
SELECT
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000000 AS avg_sec,
    MAX_TIMER_WAIT/1000000000000 AS max_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

**3. Percona Toolkit**

```bash
pt-query-digest /var/log/mysql/mysql-slow.log
```

**4. MySQL Workbench Performance Dashboard**

GUI for real-time query performance analysis.

**5. SHOW PROCESSLIST in real-time**

```sql
SHOW FULL PROCESSLIST;
```

Shows long-running queries:
```
+------+------+-----+------+---------+------+-------+------------------+
| Id   | User | db  | Time | State   | Info                            |
+------+------+-----+------+---------+------+-------+------------------+
| 1234 | web  | db  | 45   | Sending | SELECT f.*, t.*, p.* FROM ...   |
+------+------+-----+------+---------+------+-------+------------------+
```

### Checklist for analyzing query heaviness

1. ✓ Estimate number of rows processed (rows in EXPLAIN)
2. ✓ Check presence and size of IN clause
3. ✓ Analyze LIMIT (actual vs formal)
4. ✓ Evaluate number and types of JOIN operations
5. ✓ Verify index usage (key in EXPLAIN)
6. ✓ Identify filesort and temporary tables
7. ✓ Estimate volume of returned data (SELECT *)
8. ✓ Consider sorting complexity (ORDER BY)
9. ✓ Use EXPLAIN ANALYZE for precise measurements
10. ✓ Compare query cost between queries

### Comparative query table

| Criterion | Query 1 | Query 2 | Query 3 | Query 4 |
|----------|---------|---------|---------|---------|
| Operation type | SELECT | DELETE | SELECT | SELECT |
| Number of tables | 6 | 1 | 6 | 6 |
| IN clause size | 1 | 1 | 4 | **143** |
| Effective LIMIT | 100 | N/A | ∞ | **∞** |
| Uses index | Yes | Yes | Partial | **Weak** |
| Row estimate | ~2K | 1 | ~8K | **~286K** |
| Sorting | Yes | No | Yes | **Yes (huge)** |
| Heaviness (1-10) | 3 | 1 | 5 | **10** |

**Winner: Query 4 - undoubtedly the heaviest query**

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
