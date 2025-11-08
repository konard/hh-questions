# Вопрос

Клиент просит подобрать сервер под базу данных для хранения логов всех действий на сайте и строить разнообразную аналитику по данным. Ожидаемый объем БД через 6 месяцев 900 ГБ. Опишите ваши рекомендации по выбору сервера и настройке БД для клиента?

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Для логов и аналитики оптимально использовать специализированные решения типа ClickHouse или TimescaleDB. Рекомендуемая конфигурация сервера: 32-64 ГБ RAM, 8-16 vCPU, NVMe SSD 2-3 ТБ (с учетом роста и индексов), настройка партиционирования по времени, compression для экономии места, и TTL-политики для архивации старых данных.

---

## Подробное объяснение

При выборе [сервера](https://ru.wikipedia.org/wiki/Сервер) и [базы данных](https://ru.wikipedia.org/wiki/База_данных) для хранения [логов](https://ru.wikipedia.org/wiki/Лог-файл) и [аналитики](https://ru.wikipedia.org/wiki/Аналитика_данных) необходимо учитывать специфику задачи: высокая скорость записи, большие объемы данных, преимущественно операции чтения для аналитики.

### 1. Выбор типа базы данных

**Специализированные решения для аналитики (рекомендуется):**

#### ClickHouse
[ClickHouse](https://clickhouse.com/) - колоночная [СУБД](https://ru.wikipedia.org/wiki/Система_управления_базами_данных) от Яндекса, оптимизированная для [OLAP](https://ru.wikipedia.org/wiki/OLAP).

**Преимущества:**
- Экстремально высокая скорость агрегации данных (сотни миллионов строк/сек)
- Эффективная [компрессия](https://ru.wikipedia.org/wiki/Сжатие_данных) данных (10-40x меньше места)
- Отличная поддержка временных рядов
- Горизонтальное [масштабирование](https://ru.wikipedia.org/wiki/Масштабируемость)
- [SQL](https://ru.wikipedia.org/wiki/SQL)-совместимый язык запросов

**Недостатки:**
- Нет полноценной поддержки транзакций
- Сложность в удалении/обновлении отдельных записей

#### TimescaleDB
[TimescaleDB](https://www.timescale.com/) - расширение [PostgreSQL](https://ru.wikipedia.org/wiki/PostgreSQL) для [временных рядов](https://ru.wikipedia.org/wiki/Временной_ряд).

**Преимущества:**
- Полная совместимость с PostgreSQL
- Автоматическое партиционирование по времени
- Поддержка транзакций и ACID
- Continuous aggregates для предвычисленной аналитики
- Богатая экосистема PostgreSQL

**Недостатки:**
- Меньшая производительность по сравнению с ClickHouse
- Более требовательна к ресурсам

#### Elasticsearch
[Elasticsearch](https://www.elastic.co/) - поисковая система с мощными аналитическими возможностями.

**Преимущества:**
- Отличный полнотекстовый поиск
- Гибкие возможности аналитики через Kibana
- Horizontal scaling
- Real-time индексация

**Недостатки:**
- Высокое потребление RAM
- Сложность в администрировании
- Дороже по ресурсам для простой аналитики

**Традиционные СУБД (не рекомендуется для логов):**

[MySQL](https://ru.wikipedia.org/wiki/MySQL)/[PostgreSQL](https://ru.wikipedia.org/wiki/PostgreSQL) можно использовать, но они:
- Менее эффективны для больших объемов логов
- Требуют тщательной оптимизации партиционирования
- Медленнее на аналитических запросах
- Быстрее исчерпывают дисковое пространство

### 2. Расчет объема данных

**Исходные данные:**
- Ожидаемый объем через 6 месяцев: 900 ГБ
- Прогноз роста в месяц: 900 / 6 = 150 ГБ

**Что нужно учитывать:**

```
Реальный объем = Данные + Индексы + Репликация + Резерв роста + Временные таблицы
```

**Расчет для ClickHouse (с учетом компрессии):**
- Сырые данные: 900 ГБ
- С компрессией (10x): ~90 ГБ
- Индексы (~20%): +18 ГБ
- Резерв роста (6 месяцев): +90 ГБ
- **Итого: ~200 ГБ через год**

**Расчет для PostgreSQL/MySQL (без компрессии):**
- Сырые данные: 900 ГБ
- Индексы (~30-50%): +300-450 ГБ
- Резерв роста (6 месяцев): +900 ГБ
- **Итого: ~2-2.3 ТБ через год**

### 3. Рекомендации по конфигурации сервера

#### Для ClickHouse (оптимальный вариант)

**Минимальная конфигурация:**
- **CPU:** 8 vCPU (современные, например AMD EPYC или Intel Xeon)
- **RAM:** 32 ГБ [DDR4](https://ru.wikipedia.org/wiki/DDR4_SDRAM)
- **Диск:** 1 ТБ [NVMe SSD](https://ru.wikipedia.org/wiki/NVM_Express)
- **Сеть:** 1 Гbit/s

**Рекомендуемая конфигурация:**
- **CPU:** 16 vCPU
- **RAM:** 64 ГБ DDR4
- **Диск:** 2 ТБ NVMe SSD (или 2x 1TB в [RAID 1](https://ru.wikipedia.org/wiki/RAID))
- **Сеть:** 10 Gbit/s

**Премиум конфигурация (для высоких нагрузок):**
- **CPU:** 32 vCPU
- **RAM:** 128 ГБ DDR4
- **Диск:** 4 ТБ NVMe SSD (или [RAID 10](https://ru.wikipedia.org/wiki/RAID) из 4x 2TB)
- **Сеть:** 10 Gbit/s

#### Для PostgreSQL/TimescaleDB

**Рекомендуемая конфигурация:**
- **CPU:** 16 vCPU
- **RAM:** 64-128 ГБ DDR4
- **Диск:** 3-4 ТБ NVMe SSD
- **Сеть:** 10 Gbit/s

#### Для Elasticsearch

**Рекомендуемая конфигурация:**
- **CPU:** 16 vCPU
- **RAM:** 64-96 ГБ DDR4 (минимум 32 ГБ для heap)
- **Диск:** 2-3 ТБ NVMe SSD
- **Сеть:** 10 Gbit/s

**Важные замечания по железу:**

**CPU:**
- Для ClickHouse важна частота процессора (3+ GHz)
- Больше ядер = больше параллельных запросов
- Современные CPU с AVX2/AVX-512 дают значительный прирост

**RAM:**
- Правило для ClickHouse: чем больше, тем лучше (кэширование данных)
- Минимум: 2-4 ГБ RAM на 100 ГБ несжатых данных
- Для агрегационных запросов нужен запас

**Диски:**
- **Обязательно SSD** (HDD не подходят для логов)
- **Лучше NVMe** чем SATA SSD (5-10x быстрее)
- **IOPS важнее** чем последовательная скорость
- Минимум: 10000 IOPS
- Рекомендуется: 50000+ IOPS (NVMe)

**Сеть:**
- Для удаленного доступа минимум 1 Gbit/s
- Для кластерной конфигурации: 10 Gbit/s

### 4. Настройка БД для хранения логов

#### Схема данных (пример для ClickHouse)

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
    metadata String  -- JSON для дополнительных данных
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;
```

**Ключевые решения в схеме:**

**Партиционирование:**
```sql
PARTITION BY toYYYYMM(timestamp)  -- Месячные партиции
```
- Упрощает удаление старых данных (DROP PARTITION)
- Ускоряет запросы с фильтром по времени
- Позволяет архивировать данные помесячно

**Сортировка (ORDER BY):**
```sql
ORDER BY (timestamp, user_id)
```
- Определяет физический порядок хранения
- Первое поле - самый частый фильтр (обычно время)
- Последующие поля - для уточнения выборки

**TTL-политика:**
```sql
TTL timestamp + INTERVAL 2 YEAR
```
- Автоматическое удаление старых данных
- Перемещение в холодное хранилище
- Агрегация и архивация

#### Настройка компрессии

**ClickHouse:**
```sql
-- В config.xml
<compression>
    <case>
        <method>zstd</method>  -- Лучший баланс скорости и сжатия
        <level>3</level>       -- Уровень компрессии (1-22)
    </case>
</compression>
```

**Типы компрессии:**
- **LZ4** (по умолчанию): быстрая, низкая степень сжатия (2-4x)
- **ZSTD**: оптимальный баланс (5-10x)
- **ZSTD level 9+**: максимальное сжатие (10-40x), медленнее

**TimescaleDB:**
```sql
ALTER TABLE logs SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC',
    timescaledb.compress_segmentby = 'user_id'
);

-- Автоматическая компрессия данных старше 7 дней
SELECT add_compression_policy('logs', INTERVAL '7 days');
```

#### Индексация

**ClickHouse (skip indexes):**
```sql
-- Индекс для быстрого поиска по user_id
ALTER TABLE logs ADD INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4;

-- Индекс для поиска по URL
ALTER TABLE logs ADD INDEX idx_url url TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4;

-- Индекс для IP-адресов
ALTER TABLE logs ADD INDEX idx_ip ip_address TYPE set(1000) GRANULARITY 4;
```

**PostgreSQL/TimescaleDB:**
```sql
-- B-tree индексы для частых фильтров
CREATE INDEX idx_user_id ON logs (user_id);
CREATE INDEX idx_timestamp_user ON logs (timestamp, user_id);

-- GIN индекс для JSON-данных
CREATE INDEX idx_metadata ON logs USING GIN (metadata jsonb_path_ops);

-- Частичные индексы для специфичных запросов
CREATE INDEX idx_errors ON logs (timestamp) WHERE status_code >= 400;
```

### 5. Оптимизация конфигурации

#### ClickHouse (config.xml и users.xml)

```xml
<!-- config.xml -->
<clickhouse>
    <max_concurrent_queries>100</max_concurrent_queries>
    <max_server_memory_usage>50GB</max_server_memory_usage>
    <max_memory_usage>10GB</max_memory_usage>

    <!-- Настройка MergeTree -->
    <merge_tree>
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
        <max_replicated_merges_in_queue>16</max_replicated_merges_in_queue>
    </merge_tree>

    <!-- Кэширование -->
    <mark_cache_size>5368709120</mark_cache_size>
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>
</clickhouse>
```

**Ключевые параметры:**
- `max_server_memory_usage`: 70-80% от общей RAM
- `max_memory_usage`: лимит на один запрос
- `max_concurrent_queries`: зависит от нагрузки
- Кэши: выделить 10-20% RAM

#### PostgreSQL/TimescaleDB (postgresql.conf)

```ini
# Память
shared_buffers = 16GB              # 25% RAM
effective_cache_size = 48GB        # 75% RAM
work_mem = 256MB                   # Для сортировки/join
maintenance_work_mem = 2GB         # Для VACUUM, CREATE INDEX

# WAL
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# Параллелизм
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16

# TimescaleDB специфичные
timescaledb.max_background_workers = 8
```

#### Elasticsearch (elasticsearch.yml и jvm.options)

```yaml
# elasticsearch.yml
cluster.name: logs-cluster
node.name: logs-node-1

# Heap size (50% RAM, не более 31GB)
# В jvm.options:
# -Xms31g
# -Xmx31g

# Настройки индексации
index.refresh_interval: 30s
index.translog.durability: async
index.translog.sync_interval: 30s

# Шарды и реплики
index.number_of_shards: 5
index.number_of_replicas: 1
```

### 6. Стратегия хранения и архивации

#### Многоуровневое хранение (Hot-Warm-Cold)

**Hot tier (горячие данные):**
- Последние 7-30 дней
- NVMe SSD
- Полная индексация
- Быстрый доступ

**Warm tier (теплые данные):**
- 1-6 месяцев
- SATA SSD
- Компрессия включена
- Средняя скорость доступа

**Cold tier (холодные данные):**
- Старше 6 месяцев
- HDD или S3-совместимое хранилище
- Максимальная компрессия
- Редкий доступ, долгий срок хранения

**Реализация в ClickHouse:**

```sql
-- Политика хранения
CREATE STORAGE POLICY tiered_storage
SETTINGS
    volumes = 'hot,warm,cold',
    hot.volumes = 'nvme',
    warm.volumes = 'ssd',
    cold.volumes = 'hdd',
    move_factor = 0.1;

-- Применение к таблице
CREATE TABLE logs (...)
ENGINE = MergeTree()
STORAGE_POLICY tiered_storage
TTL timestamp + INTERVAL 1 MONTH TO VOLUME 'warm',
    timestamp + INTERVAL 6 MONTH TO VOLUME 'cold',
    timestamp + INTERVAL 2 YEAR DELETE;
```

**Реализация в TimescaleDB:**

```sql
-- Автоматическая компрессия через 7 дней (warm)
SELECT add_compression_policy('logs', INTERVAL '7 days');

-- Перенос в tablespace на медленных дисках через 3 месяца
SELECT add_reorder_policy('logs', 'logs_timestamp_idx', INTERVAL '3 months');

-- Удаление данных старше 2 лет
SELECT add_retention_policy('logs', INTERVAL '2 years');
```

### 7. Мониторинг и обслуживание

**Метрики для мониторинга:**

**Производительность записи:**
- Rows/sec вставки
- Latency вставки
- Размер батчей
- Количество merge операций (ClickHouse)

**Производительность запросов:**
- Query execution time (p50, p95, p99)
- Queries per second
- Slow queries (>1s)
- Cache hit ratio

**Ресурсы:**
- CPU utilization
- RAM usage (shared buffers, cache)
- Disk I/O (IOPS, throughput)
- Disk space usage и прогноз заполнения
- Network bandwidth

**Стабильность:**
- Replication lag (если есть реплики)
- Failed queries
- Connection pool usage
- Background task queue

**Инструменты мониторинга:**

```bash
# ClickHouse встроенные метрики
SELECT * FROM system.metrics;
SELECT * FROM system.events;
SELECT * FROM system.asynchronous_metrics;

# PostgreSQL
SELECT * FROM pg_stat_statements;
SELECT * FROM pg_stat_database;

# Внешние системы
# - Prometheus + Grafana
# - Zabbix
# - DataDog
# - Netdata
```

**Регулярное обслуживание:**

**ClickHouse:**
```sql
-- Оптимизация партиций (объединение маленьких кусков)
OPTIMIZE TABLE logs PARTITION '202411' FINAL;

-- Проверка целостности
CHECK TABLE logs;

-- Мониторинг размера таблиц
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
-- VACUUM для освобождения места
VACUUM ANALYZE logs;

-- Обновление статистики
ANALYZE logs;

-- Проверка bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'logs';
```

### 8. Масштабирование

#### Вертикальное масштабирование
- Увеличение RAM (наибольший эффект)
- Добавление CPU ядер
- Upgrade на более быстрые NVMe диски
- **Предел:** ограничения железа, стоимость

#### Горизонтальное масштабирование

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
-- Distributed таблица
CREATE TABLE logs_distributed AS logs
ENGINE = Distributed(logs_cluster, default, logs, rand());
```

**TimescaleDB Multi-node:**
- Data nodes для хранения данных
- Access node для координации запросов
- Автоматическое распределение по узлам

**Elasticsearch Cluster:**
- Master nodes (управление кластером)
- Data nodes (хранение данных)
- Coordinating nodes (обработка запросов)
- Автоматический ребаланс шардов

### 9. Безопасность и резервное копирование

**Безопасность:**

```sql
-- ClickHouse: пользователи с ограниченным доступом
CREATE USER analyst IDENTIFIED BY 'password';
GRANT SELECT ON logs TO analyst;

-- Шифрование соединений (SSL/TLS)
-- В config.xml включить openSSL

-- Аудит запросов
SET log_queries = 1;
```

**Резервное копирование:**

**ClickHouse:**
```bash
# Бэкап с помощью clickhouse-backup
clickhouse-backup create backup_20251108
clickhouse-backup upload backup_20251108

# Инкрементальные бэкапы
clickhouse-backup create_remote --diff-from=previous_backup
```

**PostgreSQL/TimescaleDB:**
```bash
# pg_dump для логического бэкапа
pg_dump -Fc database_name > backup.dump

# pg_basebackup для физического бэкапа
pg_basebackup -D /backup/postgres -Fp -Xs -P

# Continuous archiving (WAL)
# В postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /backup/wal/%f'
```

**Стратегия бэкапов:**
- Полный бэкап: еженедельно
- Инкрементальный: ежедневно
- Хранение: минимум 3 копии в разных местах
- Проверка восстановления: ежемесячно

### 10. Оценка стоимости

#### Cloud провайдеры (примерные цены в месяц)

**AWS (ClickHouse на EC2 i3.2xlarge):**
- Instance: 8 vCPU, 61 GB RAM, 1.9TB NVMe
- Стоимость: ~$470/месяц
- EBS дополнительный диск 2TB: ~$200/месяц
- **Итого: ~$670/месяц**

**DigitalOcean (Premium AMD):**
- 16 vCPU, 64 GB RAM, 200 GB NVMe
- Block Storage 2TB: $200/месяц
- **Итого: ~$640/месяц**

**Hetzner (выделенный сервер):**
- AMD Ryzen 9 5950X (16 cores), 128 GB RAM, 2x 2TB NVMe
- **Стоимость: €90-120/месяц (~$100-130)**

**Managed решения:**
- ClickHouse Cloud: от $1000/месяц
- Timescale Cloud: от $500/месяц
- Elastic Cloud: от $800/месяц

### Чек-лист по выбору сервера и настройке БД

1. ✓ **Выбор типа БД**
   - ClickHouse для максимальной производительности
   - TimescaleDB для совместимости с PostgreSQL
   - Elasticsearch для полнотекстового поиска

2. ✓ **Расчет ресурсов**
   - CPU: 16 vCPU минимум
   - RAM: 64 ГБ рекомендуется
   - Disk: 2-3 ТБ NVMe SSD
   - Network: 1-10 Gbit/s

3. ✓ **Проектирование схемы**
   - Партиционирование по времени (месяц/неделя)
   - Правильный ORDER BY для ClickHouse
   - Оптимальные индексы

4. ✓ **Компрессия**
   - ZSTD level 3 для ClickHouse
   - Native compression для TimescaleDB
   - Экономия 70-90% места

5. ✓ **TTL и архивация**
   - Автоматическое удаление старых данных
   - Перенос на медленные диски
   - Hot-Warm-Cold архитектура

6. ✓ **Оптимизация конфигурации**
   - Настройка памяти (70-80% RAM для БД)
   - Параллелизм запросов
   - Размер кэшей

7. ✓ **Мониторинг**
   - Prometheus + Grafana
   - Алерты на критические метрики
   - Прогноз заполнения дисков

8. ✓ **Резервное копирование**
   - Еженедельные полные бэкапы
   - Ежедневные инкрементальные
   - Проверка восстановления

9. ✓ **Безопасность**
   - Ограничение доступа по пользователям
   - SSL/TLS шифрование
   - Аудит запросов

10. ✓ **Масштабирование**
    - План горизонтального масштабирования
    - Кластерная архитектура
    - Load balancing

### Рекомендуемая конфигурация для клиента

**Оптимальное решение:**

**База данных:** ClickHouse

**Сервер (начальная конфигурация):**
- **CPU:** 16 vCPU (AMD EPYC или Intel Xeon)
- **RAM:** 64 ГБ DDR4
- **Диск:** 2 ТБ NVMe SSD
- **Сеть:** 10 Gbit/s
- **ОС:** Ubuntu 22.04 LTS или RHEL 9

**Схема данных:**
- Партиционирование по месяцам: `PARTITION BY toYYYYMM(timestamp)`
- Компрессия: ZSTD level 3
- TTL: 2 года с автоудалением
- Skip indexes для user_id, url, ip_address

**Конфигурация:**
- max_server_memory_usage: 48 ГБ (75% RAM)
- max_memory_usage: 10 ГБ (на запрос)
- Uncompressed cache: 8 ГБ
- Mark cache: 5 ГБ

**Результат:**
- Ожидаемый размер через 6 месяцев: ~90-150 ГБ (с компрессией)
- Ожидаемый размер через год: ~180-300 ГБ
- Скорость вставки: 100,000+ rows/sec
- Время ответа на аналитические запросы: <1 сек для большинства

**План масштабирования:**
- При росте >500 ГБ: upgrade до 128 ГБ RAM
- При росте >1 ТБ: переход на кластер из 2-3 серверов
- При росте >5 ТБ: полноценный шардированный кластер

**Стоимость:**
- Self-hosted (Hetzner): ~€100-120/месяц
- Cloud (AWS/DO): ~$600-700/месяц
- Managed ClickHouse: от $1000/месяц

### Полезные ресурсы

**Документация:**
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)

**Инструменты:**
- [clickhouse-backup](https://github.com/AlexAkulov/clickhouse-backup) - бэкапы ClickHouse
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - профилирование PostgreSQL
- [Grafana](https://grafana.com/) - визуализация метрик
- [Prometheus](https://prometheus.io/) - сбор метрик

**Бенчмарки:**
- [ClickBench](https://benchmark.clickhouse.com/) - сравнение аналитических СУБД
- [Time Series Benchmark Suite](https://github.com/timescale/tsbs)

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
