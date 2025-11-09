# Question

A client needs help selecting a database server for storing all website activity logs and building diverse analytics on that data. Expected database volume in 6 months is 900 GB. Describe your recommendations for server selection and database configuration for the client?

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

For logs and analytics, specialized solutions like ClickHouse or TimescaleDB are optimal. Recommended server configuration: 32-64 GB RAM, 8-16 vCPU, 2-3 TB NVMe SSD (accounting for growth and indexes), time-based partitioning setup, compression for space savings, and TTL policies for archiving old data.

---

## Detailed explanation

When selecting a [server](https://en.wikipedia.org/wiki/Server_(computing)) and [database](https://en.wikipedia.org/wiki/Database) for storing [logs](https://en.wikipedia.org/wiki/Log_file) and [analytics](https://en.wikipedia.org/wiki/Analytics), you must consider the workload specifics: high write throughput, large data volumes, and predominantly read operations for analytics.

### 1. Database type selection

**Specialized analytics solutions (recommended):**

#### ClickHouse
[ClickHouse](https://clickhouse.com/) - columnar [DBMS](https://en.wikipedia.org/wiki/Database) from Yandex, optimized for [OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing).

**Advantages:**
- Extremely high data aggregation speed (hundreds of millions rows/sec)
- Efficient [data compression](https://en.wikipedia.org/wiki/Data_compression) (10-40x space reduction)
- Excellent [time series](https://en.wikipedia.org/wiki/Time_series) support
- Horizontal [scalability](https://en.wikipedia.org/wiki/Scalability)
- [SQL](https://en.wikipedia.org/wiki/SQL)-compatible query language

**Disadvantages:**
- No full transaction support
- Difficult to delete/update individual records

#### TimescaleDB
[TimescaleDB](https://www.timescale.com/) - [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) extension for [time series](https://en.wikipedia.org/wiki/Time_series) data.

**Advantages:**
- Full PostgreSQL compatibility
- Automatic time-based partitioning
- Transaction and ACID support
- Continuous aggregates for precomputed analytics
- Rich PostgreSQL ecosystem

**Disadvantages:**
- Lower performance compared to ClickHouse
- More resource demanding

#### Elasticsearch
[Elasticsearch](https://www.elastic.co/) - search engine with powerful analytics capabilities.

**Advantages:**
- Excellent full-text search
- Flexible analytics via Kibana
- Horizontal scaling
- Real-time indexing

**Disadvantages:**
- High RAM consumption
- Complex administration
- More expensive for simple analytics

**Traditional DBMS (not recommended for logs):**

[MySQL](https://en.wikipedia.org/wiki/MySQL)/[PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) can be used, but they:
- Are less efficient for large log volumes
- Require careful partitioning optimization
- Slower on analytical queries
- Exhaust disk space faster

### 2. Data volume calculation

**Initial data:**
- Expected volume in 6 months: 900 GB
- Monthly growth projection: 900 / 6 = 150 GB

**Factors to consider:**

```
Real volume = Data + Indexes + Replication + Growth reserve + Temporary tables
```

**Calculation for ClickHouse (with compression):**
- Raw data: 900 GB
- With compression (10x): ~90 GB
- Indexes (~20%): +18 GB
- Growth reserve (6 months): +90 GB
- **Total: ~200 GB in one year**

**Calculation for PostgreSQL/MySQL (without compression):**
- Raw data: 900 GB
- Indexes (~30-50%): +300-450 GB
- Growth reserve (6 months): +900 GB
- **Total: ~2-2.3 TB in one year**

### 3. Server configuration recommendations

#### For ClickHouse (optimal choice)

**Minimum configuration:**
- **CPU:** 8 vCPU (modern, e.g., AMD EPYC or Intel Xeon)
- **RAM:** 32 GB [DDR4](https://en.wikipedia.org/wiki/DDR4_SDRAM)
- **Disk:** 1 TB [NVMe SSD](https://en.wikipedia.org/wiki/NVM_Express)
- **Network:** 1 Gbit/s

**Recommended configuration:**
- **CPU:** 16 vCPU
- **RAM:** 64 GB DDR4
- **Disk:** 2 TB NVMe SSD (or 2x 1TB in [RAID 1](https://en.wikipedia.org/wiki/RAID))
- **Network:** 10 Gbit/s

**Premium configuration (for high loads):**
- **CPU:** 32 vCPU
- **RAM:** 128 GB DDR4
- **Disk:** 4 TB NVMe SSD (or [RAID 10](https://en.wikipedia.org/wiki/RAID) with 4x 2TB)
- **Network:** 10 Gbit/s

#### For PostgreSQL/TimescaleDB

**Recommended configuration:**
- **CPU:** 16 vCPU
- **RAM:** 64-128 GB DDR4
- **Disk:** 3-4 TB NVMe SSD
- **Network:** 10 Gbit/s

#### For Elasticsearch

**Recommended configuration:**
- **CPU:** 16 vCPU
- **RAM:** 64-96 GB DDR4 (minimum 32 GB for heap)
- **Disk:** 2-3 TB NVMe SSD
- **Network:** 10 Gbit/s

**Important hardware notes:**

**CPU:**
- For ClickHouse, CPU frequency matters (3+ GHz)
- More cores = more parallel queries
- Modern CPUs with AVX2/AVX-512 provide significant gains

**RAM:**
- Rule for ClickHouse: more is better (data caching)
- Minimum: 2-4 GB RAM per 100 GB uncompressed data
- Aggregation queries need headroom

**Disks:**
- **SSD is mandatory** (HDD unsuitable for logs)
- **NVMe better** than SATA SSD (5-10x faster)
- **IOPS more important** than sequential speed
- Minimum: 10,000 IOPS
- Recommended: 50,000+ IOPS (NVMe)

**Network:**
- For remote access: minimum 1 Gbit/s
- For cluster configuration: 10 Gbit/s

### 4. Database configuration for log storage

#### Data schema (ClickHouse example)

```sql
CREATE TABLE logs (
    timestamp DateTime,
    user_id UInt64,
    session_id String,
    action String,
    url String,
    ip_address IPv4,
    user_agent String,
    response_time UInt32,
    status_code UInt16,
    metadata String  -- JSON for additional data
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;
```

**Key schema decisions:**

**Partitioning:**
```sql
PARTITION BY toYYYYMM(timestamp)  -- Monthly partitions
```
- Simplifies old data deletion (DROP PARTITION)
- Speeds up queries with time filters
- Enables monthly data archiving

**Sorting (ORDER BY):**
```sql
ORDER BY (timestamp, user_id)
```
- Defines physical storage order
- First field - most common filter (usually time)
- Subsequent fields - for refinement

**TTL policy:**
```sql
TTL timestamp + INTERVAL 2 YEAR
```
- Automatic old data deletion
- Move to cold storage
- Aggregation and archiving

#### Compression configuration

**ClickHouse:**
```sql
-- In config.xml
<compression>
    <case>
        <method>zstd</method>  -- Best speed/compression balance
        <level>3</level>       -- Compression level (1-22)
    </case>
</compression>
```

**Compression types:**
- **LZ4** (default): fast, low compression (2-4x)
- **ZSTD**: optimal balance (5-10x)
- **ZSTD level 9+**: maximum compression (10-40x), slower

**TimescaleDB:**
```sql
ALTER TABLE logs SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC',
    timescaledb.compress_segmentby = 'user_id'
);

-- Automatic compression for data older than 7 days
SELECT add_compression_policy('logs', INTERVAL '7 days');
```

#### Indexing

**ClickHouse (skip indexes):**
```sql
-- Index for fast user_id lookup
ALTER TABLE logs ADD INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4;

-- Index for URL search
ALTER TABLE logs ADD INDEX idx_url url TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4;

-- Index for IP addresses
ALTER TABLE logs ADD INDEX idx_ip ip_address TYPE set(1000) GRANULARITY 4;
```

**PostgreSQL/TimescaleDB:**
```sql
-- B-tree indexes for frequent filters
CREATE INDEX idx_user_id ON logs (user_id);
CREATE INDEX idx_timestamp_user ON logs (timestamp, user_id);

-- GIN index for JSON data
CREATE INDEX idx_metadata ON logs USING GIN (metadata jsonb_path_ops);

-- Partial indexes for specific queries
CREATE INDEX idx_errors ON logs (timestamp) WHERE status_code >= 400;
```

### 5. Configuration optimization

#### ClickHouse (config.xml and users.xml)

```xml
<!-- config.xml -->
<clickhouse>
    <max_concurrent_queries>100</max_concurrent_queries>
    <max_server_memory_usage>50GB</max_server_memory_usage>
    <max_memory_usage>10GB</max_memory_usage>

    <!-- MergeTree settings -->
    <merge_tree>
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
        <max_replicated_merges_in_queue>16</max_replicated_merges_in_queue>
    </merge_tree>

    <!-- Caching -->
    <mark_cache_size>5368709120</mark_cache_size>
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>
</clickhouse>
```

**Key parameters:**
- `max_server_memory_usage`: 70-80% of total RAM
- `max_memory_usage`: limit per query
- `max_concurrent_queries`: depends on workload
- Caches: allocate 10-20% RAM

#### PostgreSQL/TimescaleDB (postgresql.conf)

```ini
# Memory
shared_buffers = 16GB              # 25% RAM
effective_cache_size = 48GB        # 75% RAM
work_mem = 256MB                   # For sorting/join
maintenance_work_mem = 2GB         # For VACUUM, CREATE INDEX

# WAL
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# Parallelism
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16

# TimescaleDB specific
timescaledb.max_background_workers = 8
```

#### Elasticsearch (elasticsearch.yml and jvm.options)

```yaml
# elasticsearch.yml
cluster.name: logs-cluster
node.name: logs-node-1

# Heap size (50% RAM, max 31GB)
# In jvm.options:
# -Xms31g
# -Xmx31g

# Indexing settings
index.refresh_interval: 30s
index.translog.durability: async
index.translog.sync_interval: 30s

# Shards and replicas
index.number_of_shards: 5
index.number_of_replicas: 1
```

### 6. Storage and archiving strategy

#### Multi-tier storage (Hot-Warm-Cold)

**Hot tier (hot data):**
- Last 7-30 days
- NVMe SSD
- Full indexing
- Fast access

**Warm tier (warm data):**
- 1-6 months
- SATA SSD
- Compression enabled
- Medium access speed

**Cold tier (cold data):**
- Older than 6 months
- HDD or S3-compatible storage
- Maximum compression
- Rare access, long retention

**ClickHouse implementation:**

```sql
-- Storage policy
CREATE STORAGE POLICY tiered_storage
SETTINGS
    volumes = 'hot,warm,cold',
    hot.volumes = 'nvme',
    warm.volumes = 'ssd',
    cold.volumes = 'hdd',
    move_factor = 0.1;

-- Apply to table
CREATE TABLE logs (...)
ENGINE = MergeTree()
STORAGE_POLICY tiered_storage
TTL timestamp + INTERVAL 1 MONTH TO VOLUME 'warm',
    timestamp + INTERVAL 6 MONTH TO VOLUME 'cold',
    timestamp + INTERVAL 2 YEAR DELETE;
```

**TimescaleDB implementation:**

```sql
-- Automatic compression after 7 days (warm)
SELECT add_compression_policy('logs', INTERVAL '7 days');

-- Move to tablespace on slower disks after 3 months
SELECT add_reorder_policy('logs', 'logs_timestamp_idx', INTERVAL '3 months');

-- Delete data older than 2 years
SELECT add_retention_policy('logs', INTERVAL '2 years');
```

### 7. Monitoring and maintenance

**Metrics to monitor:**

**Write performance:**
- Rows/sec insertion rate
- Insert latency
- Batch sizes
- Number of merge operations (ClickHouse)

**Query performance:**
- Query execution time (p50, p95, p99)
- Queries per second
- Slow queries (>1s)
- Cache hit ratio

**Resources:**
- CPU utilization
- RAM usage (shared buffers, cache)
- Disk I/O (IOPS, throughput)
- Disk space usage and fill projection
- Network bandwidth

**Stability:**
- Replication lag (if replicas exist)
- Failed queries
- Connection pool usage
- Background task queue

**Monitoring tools:**

```bash
# ClickHouse built-in metrics
SELECT * FROM system.metrics;
SELECT * FROM system.events;
SELECT * FROM system.asynchronous_metrics;

# PostgreSQL
SELECT * FROM pg_stat_statements;
SELECT * FROM pg_stat_database;

# External systems
# - Prometheus + Grafana
# - Zabbix
# - DataDog
# - Netdata
```

**Regular maintenance:**

**ClickHouse:**
```sql
-- Optimize partitions (merge small parts)
OPTIMIZE TABLE logs PARTITION '202411' FINAL;

-- Check integrity
CHECK TABLE logs;

-- Monitor table sizes
SELECT
    table,
    formatReadableSize(sum(bytes)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE active AND table = 'logs'
GROUP BY table;
```

**PostgreSQL/TimescaleDB:**
```sql
-- VACUUM to reclaim space
VACUUM ANALYZE logs;

-- Update statistics
ANALYZE logs;

-- Check bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'logs';
```

### 8. Scaling

#### Vertical scaling
- Increase RAM (biggest impact)
- Add CPU cores
- Upgrade to faster NVMe disks
- **Limit:** hardware constraints, cost

#### Horizontal scaling

**ClickHouse Cluster:**
```xml
<!-- config.xml -->
<remote_servers>
    <logs_cluster>
        <shard>
            <replica>
                <host>clickhouse-01</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>clickhouse-02</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <replica>
                <host>clickhouse-03</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>clickhouse-04</host>
                <port>9000</port>
            </replica>
        </shard>
    </logs_cluster>
</remote_servers>
```

```sql
-- Distributed table
CREATE TABLE logs_distributed AS logs
ENGINE = Distributed(logs_cluster, default, logs, rand());
```

**TimescaleDB Multi-node:**
- Data nodes for data storage
- Access node for query coordination
- Automatic distribution across nodes

**Elasticsearch Cluster:**
- Master nodes (cluster management)
- Data nodes (data storage)
- Coordinating nodes (query processing)
- Automatic shard rebalancing

### 9. Security and backup

**Security:**

```sql
-- ClickHouse: users with limited access
CREATE USER analyst IDENTIFIED BY 'password';
GRANT SELECT ON logs TO analyst;

-- Connection encryption (SSL/TLS)
-- Enable openSSL in config.xml

-- Query auditing
SET log_queries = 1;
```

**Backup:**

**ClickHouse:**
```bash
# Backup with clickhouse-backup
clickhouse-backup create backup_20251108
clickhouse-backup upload backup_20251108

# Incremental backups
clickhouse-backup create_remote --diff-from=previous_backup
```

**PostgreSQL/TimescaleDB:**
```bash
# pg_dump for logical backup
pg_dump -Fc database_name > backup.dump

# pg_basebackup for physical backup
pg_basebackup -D /backup/postgres -Fp -Xs -P

# Continuous archiving (WAL)
# In postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /backup/wal/%f'
```

**Backup strategy:**
- Full backup: weekly
- Incremental: daily
- Retention: minimum 3 copies in different locations
- Recovery testing: monthly

### 10. Cost estimation

#### Cloud providers (approximate monthly costs)

**AWS (ClickHouse on EC2 i3.2xlarge):**
- Instance: 8 vCPU, 61 GB RAM, 1.9TB NVMe
- Cost: ~$470/month
- EBS additional disk 2TB: ~$200/month
- **Total: ~$670/month**

**DigitalOcean (Premium AMD):**
- 16 vCPU, 64 GB RAM, 200 GB NVMe
- Block Storage 2TB: $200/month
- **Total: ~$640/month**

**Hetzner (dedicated server):**
- AMD Ryzen 9 5950X (16 cores), 128 GB RAM, 2x 2TB NVMe
- **Cost: €90-120/month (~$100-130)**

**Managed solutions:**
- ClickHouse Cloud: from $1,000/month
- Timescale Cloud: from $500/month
- Elastic Cloud: from $800/month

### Checklist for server selection and database configuration

1. ✓ **Database type selection**
   - ClickHouse for maximum performance
   - TimescaleDB for PostgreSQL compatibility
   - Elasticsearch for full-text search

2. ✓ **Resource calculation**
   - CPU: 16 vCPU minimum
   - RAM: 64 GB recommended
   - Disk: 2-3 TB NVMe SSD
   - Network: 1-10 Gbit/s

3. ✓ **Schema design**
   - Time-based partitioning (month/week)
   - Proper ORDER BY for ClickHouse
   - Optimal indexes

4. ✓ **Compression**
   - ZSTD level 3 for ClickHouse
   - Native compression for TimescaleDB
   - 70-90% space savings

5. ✓ **TTL and archiving**
   - Automatic old data deletion
   - Move to slower disks
   - Hot-Warm-Cold architecture

6. ✓ **Configuration optimization**
   - Memory settings (70-80% RAM for DB)
   - Query parallelism
   - Cache sizes

7. ✓ **Monitoring**
   - Prometheus + Grafana
   - Alerts on critical metrics
   - Disk fill projection

8. ✓ **Backup**
   - Weekly full backups
   - Daily incrementals
   - Recovery testing

9. ✓ **Security**
   - User access restrictions
   - SSL/TLS encryption
   - Query auditing

10. ✓ **Scaling**
    - Horizontal scaling plan
    - Cluster architecture
    - Load balancing

### Recommended configuration for the client

**Optimal solution:**

**Database:** ClickHouse

**Server (initial configuration):**
- **CPU:** 16 vCPU (AMD EPYC or Intel Xeon)
- **RAM:** 64 GB DDR4
- **Disk:** 2 TB NVMe SSD
- **Network:** 10 Gbit/s
- **OS:** Ubuntu 22.04 LTS or RHEL 9

**Data schema:**
- Monthly partitioning: `PARTITION BY toYYYYMM(timestamp)`
- Compression: ZSTD level 3
- TTL: 2 years with auto-deletion
- Skip indexes for user_id, url, ip_address

**Configuration:**
- max_server_memory_usage: 48 GB (75% RAM)
- max_memory_usage: 10 GB (per query)
- Uncompressed cache: 8 GB
- Mark cache: 5 GB

**Expected results:**
- Size in 6 months: ~90-150 GB (compressed)
- Size in 1 year: ~180-300 GB
- Insert rate: 100,000+ rows/sec
- Analytics query response time: <1 sec for most queries

**Scaling plan:**
- Growth >500 GB: upgrade to 128 GB RAM
- Growth >1 TB: move to 2-3 server cluster
- Growth >5 TB: full sharded cluster

**Cost:**
- Self-hosted (Hetzner): ~€100-120/month
- Cloud (AWS/DO): ~$600-700/month
- Managed ClickHouse: from $1,000/month

### Useful resources

**Documentation:**
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)

**Tools:**
- [clickhouse-backup](https://github.com/AlexAkulov/clickhouse-backup) - ClickHouse backups
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - PostgreSQL profiling
- [Grafana](https://grafana.com/) - metrics visualization
- [Prometheus](https://prometheus.io/) - metrics collection

**Benchmarks:**
- [ClickBench](https://benchmark.clickhouse.com/) - analytical DBMS comparison
- [Time Series Benchmark Suite](https://github.com/timescale/tsbs)

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
