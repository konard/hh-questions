# Question

A client complains about MySQL database performance issues - simple queries are executing slowly. Describe your actions.

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

A systematic diagnostic approach: check current slow queries via SHOW PROCESSLIST, analyze slow query logs, verify index usage with EXPLAIN, monitor server resources (CPU, RAM, I/O), review MySQL configuration, and apply optimizations based on identified issues.

---

## Detailed explanation

When a client reports slow [MySQL](https://en.wikipedia.org/wiki/MySQL) performance, a systematic approach to [database performance](https://en.wikipedia.org/wiki/Database_tuning) diagnosis is essential.

### 1. Initial diagnosis: check active processes

**Action:** Connect to MySQL and check currently executing [queries](https://en.wikipedia.org/wiki/SQL).

```sql
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;
```

**What to look for:**
- Queries with `Locked` status (table locks)
- Queries with high `Time` values (long-running operations)
- Large number of simultaneous connections
- Queries in `Sending data`, `Copying to tmp table`, `Sorting result` states

**Alternative:** Use [Performance Schema](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html) for more detailed information:

```sql
SELECT * FROM performance_schema.processlist
WHERE command != 'Sleep'
ORDER BY time DESC;
```

### 2. Analyze slow query logs

**Action:** Enable and analyze the [slow query log](https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html).

**Check current settings:**
```sql
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

**Enable slow query log:**
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Queries longer than 2 seconds
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

**Analyze the log:**
```bash
# Use mysqldumpslow for analysis
mysqldumpslow -s t -t 10 /var/log/mysql/mysql-slow.log

# Or pt-query-digest from Percona Toolkit
pt-query-digest /var/log/mysql/mysql-slow.log
```

**What to analyze:**
- Most frequent slow queries
- Queries with highest execution time
- Queries not using [indexes](https://en.wikipedia.org/wiki/Database_index)

### 3. Check index usage

**Action:** Use [EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html) to analyze query execution plans.

```sql
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

**Key indicators in EXPLAIN:**
- `type`: should be `ref`, `eq_ref`, `const`, not `ALL` (full table scan)
- `possible_keys`: which indexes can be used
- `key`: which index is actually used (NULL means no index)
- `rows`: number of rows examined (should be minimal)
- `Extra`: warnings like `Using filesort`, `Using temporary`

**Enhanced analysis:**
```sql
EXPLAIN FORMAT=JSON SELECT ...;
-- Or in MySQL 8.0+
EXPLAIN ANALYZE SELECT ...;
```

### 4. Monitor server resources

**Action:** Check system resource utilization.

**Check CPU and memory:**
```bash
top -u mysql
htop
vmstat 1 10
```

**Check disk subsystem:**
```bash
iostat -x 1 10
iotop
```

**What to analyze:**
- High CPU load may indicate inefficient queries
- [RAM](https://en.wikipedia.org/wiki/Random-access_memory) shortage leads to [swap](https://en.wikipedia.org/wiki/Memory_paging) usage
- High [I/O wait](https://en.wikipedia.org/wiki/Input/output) indicates disk subsystem issues
- Check [SSD](https://en.wikipedia.org/wiki/Solid-state_drive) vs [HDD](https://en.wikipedia.org/wiki/Hard_disk_drive) usage

### 5. Review MySQL configuration

**Action:** Analyze important [my.cnf](https://dev.mysql.com/doc/refman/8.0/en/option-files.html) configuration parameters.

**Key parameters to check:**

```sql
-- InnoDB buffer pool size (typically 70-80% of available RAM)
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Query cache size (deprecated in MySQL 8.0)
SHOW VARIABLES LIKE 'query_cache%';

-- Buffer parameters
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
SHOW VARIABLES LIKE 'read_buffer_size';

-- Maximum connections
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Max_used_connections';

-- Table cache parameters
SHOW VARIABLES LIKE 'table_open_cache';
SHOW STATUS LIKE 'Open_tables';
```

**Recommended settings for typical server:**
- `innodb_buffer_pool_size`: 70-80% RAM for [InnoDB](https://en.wikipedia.org/wiki/InnoDB)
- `innodb_log_file_size`: 256MB - 1GB
- `max_connections`: calculated based on available RAM
- `table_open_cache`: depends on number of tables

### 6. Analyze MySQL statistics

**Action:** Check internal performance metrics.

```sql
-- Table usage statistics
SHOW TABLE STATUS FROM database_name;

-- InnoDB statistics
SHOW ENGINE INNODB STATUS\G

-- Buffer pool status
SELECT * FROM information_schema.INNODB_BUFFER_POOL_STATS;

-- Lock statistics
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;
```

### 7. Check table fragmentation

**Action:** Identify [fragmented](https://en.wikipedia.org/wiki/Fragmentation_(computing)) tables.

```sql
SELECT
    table_schema,
    table_name,
    ROUND(data_length/1024/1024, 2) AS data_mb,
    ROUND(data_free/1024/1024, 2) AS free_mb,
    ROUND(data_free/(data_length + data_free) * 100, 2) AS fragmentation_percent
FROM information_schema.TABLES
WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    AND data_free > 0
ORDER BY fragmentation_percent DESC;
```

**Optimize fragmented tables:**
```sql
OPTIMIZE TABLE table_name;
-- Or for InnoDB:
ALTER TABLE table_name ENGINE=InnoDB;
```

### 8. Check network issues

**Action:** If MySQL is on a remote server, check network latency.

```bash
# Check latency
ping mysql-server
traceroute mysql-server

# Check bandwidth
iperf3 -c mysql-server
```

### 9. Optimization strategy

After diagnosis, apply appropriate measures:

**Query optimization:**
- Add missing indexes
- Rewrite inefficient queries
- Use [JOIN](https://en.wikipedia.org/wiki/Join_(SQL)) instead of subqueries where possible
- Avoid `SELECT *`, select only needed fields
- Use [LIMIT](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html) to restrict results

**Configuration optimization:**
- Increase `innodb_buffer_pool_size`
- Tune buffer parameters for workload
- Optimize connection count

**Infrastructure optimization:**
- Upgrade [hardware](https://en.wikipedia.org/wiki/Computer_hardware) (more RAM, SSD instead of HDD)
- Implement [replication](https://en.wikipedia.org/wiki/Replication_(computing)) to distribute read load
- Consider [sharding](https://en.wikipedia.org/wiki/Shard_(database_architecture)) for large data volumes
- Use application-level [caching](https://en.wikipedia.org/wiki/Cache_(computing)) ([Redis](https://en.wikipedia.org/wiki/Redis), [Memcached](https://en.wikipedia.org/wiki/Memcached))

### 10. Monitoring and preventive measures

**Implement continuous monitoring:**
- [Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [Grafana](https://en.wikipedia.org/wiki/Grafana) for metrics visualization
- [Percona Monitoring and Management (PMM)](https://www.percona.com/software/database-tools/percona-monitoring-and-management)
- [MySQL Enterprise Monitor](https://www.mysql.com/products/enterprise/monitor.html)
- Configure alerts for critical metrics

**Regular maintenance:**
- Periodic table optimization
- Analyze and update table statistics: `ANALYZE TABLE`
- Regular slow query log analysis
- Plan upgrades and scaling

### Checklist for slow performance complaints

1. ✓ Check current queries: `SHOW PROCESSLIST`
2. ✓ Enable and analyze slow query log
3. ✓ Verify index usage via `EXPLAIN`
4. ✓ Monitor system resources (CPU, RAM, I/O)
5. ✓ Check MySQL configuration
6. ✓ Analyze InnoDB statistics
7. ✓ Check table fragmentation
8. ✓ Check network latency (for remote databases)
9. ✓ Apply optimizations
10. ✓ Implement continuous monitoring

### Action prioritization

**Urgent (immediate improvement):**
- Kill hung queries: `KILL QUERY process_id`
- Add critically important indexes
- Increase `innodb_buffer_pool_size` if RAM is available

**Medium-term (within day-week):**
- Optimize slow queries
- Tune MySQL configuration
- Optimize fragmented tables

**Long-term (planning):**
- Hardware upgrades
- Implement replication/sharding
- Architectural changes in application

### Useful tools

- **[mysqldumpslow](https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html)**: analyze slow query logs
- **[Percona Toolkit](https://www.percona.com/software/database-tools/percona-toolkit)**: MySQL tool suite (pt-query-digest, pt-online-schema-change)
- **[mysqltuner](https://github.com/major/MySQLTuner-perl)**: script for configuration recommendations
- **[innotop](https://github.com/innotop/innotop)**: real-time MySQL monitoring
- **[mytop](http://jeremy.zawodny.com/mysql/mytop/)**: top-like monitor for MySQL

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
