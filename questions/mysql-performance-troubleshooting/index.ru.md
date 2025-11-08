# Вопрос

Клиент жалуется на проблемы в работе БД MySQL - простые запросы выполняются медленно. Опишите ваши действия.

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Систематический подход к диагностике: проверка текущих медленных запросов через SHOW PROCESSLIST, анализ логов медленных запросов, проверка использования индексов с EXPLAIN, мониторинг ресурсов сервера (CPU, RAM, I/O), анализ конфигурации MySQL и оптимизация на основе выявленных проблем.

---

## Подробное объяснение

Когда клиент сообщает о медленной работе [MySQL](https://ru.wikipedia.org/wiki/MySQL), важен системный подход к [диагностике производительности](https://ru.wikipedia.org/wiki/Анализ_производительности) [базы данных](https://ru.wikipedia.org/wiki/База_данных).

### 1. Первичная диагностика: проверка активных процессов

**Действие:** Подключиться к MySQL и проверить текущие выполняющиеся [запросы](https://ru.wikipedia.org/wiki/SQL).

```sql
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;
```

**Что искать:**
- Запросы со статусом `Locked` (блокировки таблиц)
- Запросы с большим значением `Time` (долго выполняющиеся операции)
- Большое количество одновременных подключений
- Запросы в состоянии `Sending data`, `Copying to tmp table`, `Sorting result`

**Альтернатива:** Использовать [Performance Schema](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html) для более детальной информации:

```sql
SELECT * FROM performance_schema.processlist
WHERE command != 'Sleep'
ORDER BY time DESC;
```

### 2. Анализ логов медленных запросов

**Действие:** Включить и проанализировать [лог медленных запросов](https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html) (slow query log).

**Проверка текущих настроек:**
```sql
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

**Включение лога медленных запросов:**
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Запросы дольше 2 секунд
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

**Анализ лога:**
```bash
# Использование mysqldumpslow для анализа
mysqldumpslow -s t -t 10 /var/log/mysql/mysql-slow.log

# Или pt-query-digest из Percona Toolkit
pt-query-digest /var/log/mysql/mysql-slow.log
```

**Что анализировать:**
- Самые частые медленные запросы
- Запросы с наибольшим временем выполнения
- Запросы без использования [индексов](https://ru.wikipedia.org/wiki/Индекс_(базы_данных))

### 3. Проверка использования индексов

**Действие:** Использовать [EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html) для анализа плана выполнения медленных запросов.

```sql
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

**Ключевые показатели в EXPLAIN:**
- `type`: должен быть `ref`, `eq_ref`, `const`, а не `ALL` (полное сканирование таблицы)
- `possible_keys`: какие индексы могут быть использованы
- `key`: какой индекс фактически используется (NULL означает отсутствие индекса)
- `rows`: количество проверяемых строк (должно быть минимальным)
- `Extra`: предупреждения вроде `Using filesort`, `Using temporary`

**Улучшенный анализ:**
```sql
EXPLAIN FORMAT=JSON SELECT ...;
-- Или в MySQL 8.0+
EXPLAIN ANALYZE SELECT ...;
```

### 4. Мониторинг ресурсов сервера

**Действие:** Проверить использование системных ресурсов.

**Проверка CPU и памяти:**
```bash
top -u mysql
htop
vmstat 1 10
```

**Проверка дисковой подсистемы:**
```bash
iostat -x 1 10
iotop
```

**Что анализировать:**
- Высокая загрузка CPU может указывать на неэффективные запросы
- Нехватка [RAM](https://ru.wikipedia.org/wiki/Оперативная_память) приводит к использованию [swap](https://ru.wikipedia.org/wiki/Подкачка_страниц)
- Высокий [I/O wait](https://ru.wikipedia.org/wiki/Ввод-вывод) указывает на проблемы с дисковой подсистемой
- Проверка использования [SSD](https://ru.wikipedia.org/wiki/Твердотельный_накопитель) vs [HDD](https://ru.wikipedia.org/wiki/Жёсткий_диск)

### 5. Проверка конфигурации MySQL

**Действие:** Анализ важных параметров конфигурации [my.cnf](https://dev.mysql.com/doc/refman/8.0/en/option-files.html).

**Ключевые параметры для проверки:**

```sql
-- Размер буферного пула InnoDB (обычно 70-80% доступной RAM)
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Размер кэша запросов (deprecated в MySQL 8.0)
SHOW VARIABLES LIKE 'query_cache%';

-- Параметры буферов
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
SHOW VARIABLES LIKE 'read_buffer_size';

-- Максимальное количество подключений
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Max_used_connections';

-- Параметры табличного кэша
SHOW VARIABLES LIKE 'table_open_cache';
SHOW STATUS LIKE 'Open_tables';
```

**Рекомендуемые настройки для типичного сервера:**
- `innodb_buffer_pool_size`: 70-80% RAM для [InnoDB](https://ru.wikipedia.org/wiki/InnoDB)
- `innodb_log_file_size`: 256MB - 1GB
- `max_connections`: рассчитывается по формуле исходя из доступной RAM
- `table_open_cache`: зависит от количества таблиц

### 6. Анализ статистики MySQL

**Действие:** Проверить внутренние метрики производительности.

```sql
-- Статистика использования таблиц
SHOW TABLE STATUS FROM database_name;

-- Статистика InnoDB
SHOW ENGINE INNODB STATUS\G

-- Состояние буферного пула
SELECT * FROM information_schema.INNODB_BUFFER_POOL_STATS;

-- Статистика по блокировкам
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;
```

### 7. Проверка фрагментации таблиц

**Действие:** Выявление [фрагментированных](https://ru.wikipedia.org/wiki/Фрагментация_(компьютер)) таблиц.

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

**Оптимизация фрагментированных таблиц:**
```sql
OPTIMIZE TABLE table_name;
-- Или для InnoDB:
ALTER TABLE table_name ENGINE=InnoDB;
```

### 8. Проверка сетевых проблем

**Действие:** Если MySQL работает на удаленном сервере, проверить сетевую задержку.

```bash
# Проверка задержки
ping mysql-server
traceroute mysql-server

# Проверка пропускной способности
iperf3 -c mysql-server
```

### 9. Стратегия оптимизации

После диагностики применить соответствующие меры:

**Оптимизация запросов:**
- Добавить недостающие индексы
- Переписать неэффективные запросы
- Использовать [JOIN](https://ru.wikipedia.org/wiki/Join_(SQL)) вместо подзапросов где возможно
- Избегать `SELECT *`, выбирать только нужные поля
- Использовать [LIMIT](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html) для ограничения результатов

**Оптимизация конфигурации:**
- Увеличить `innodb_buffer_pool_size`
- Настроить параметры буферов под рабочую нагрузку
- Оптимизировать количество подключений

**Оптимизация инфраструктуры:**
- Обновить [железо](https://ru.wikipedia.org/wiki/Аппаратное_обеспечение) (больше RAM, SSD вместо HDD)
- Внедрить [репликацию](https://ru.wikipedia.org/wiki/Репликация_(вычислительная_техника)) для распределения нагрузки чтения
- Рассмотреть [шардирование](https://ru.wikipedia.org/wiki/Сегментирование_(базы_данных)) для больших объемов данных
- Использовать [кэширование](https://ru.wikipedia.org/wiki/Кэш) на уровне приложения ([Redis](https://ru.wikipedia.org/wiki/Redis), [Memcached](https://ru.wikipedia.org/wiki/Memcached))

### 10. Мониторинг и превентивные меры

**Внедрить постоянный мониторинг:**
- [Prometheus](https://ru.wikipedia.org/wiki/Prometheus_(программное_обеспечение)) + [Grafana](https://ru.wikipedia.org/wiki/Grafana) для визуализации метрик
- [Percona Monitoring and Management (PMM)](https://www.percona.com/software/database-tools/percona-monitoring-and-management)
- [MySQL Enterprise Monitor](https://www.mysql.com/products/enterprise/monitor.html)
- Настройка алертов на критические метрики

**Регулярное обслуживание:**
- Периодическая оптимизация таблиц
- Анализ и обновление статистики таблиц: `ANALYZE TABLE`
- Регулярный анализ логов медленных запросов
- Планирование апгрейдов и масштабирования

### Чек-лист действий при жалобе на медленную работу

1. ✓ Проверить текущие запросы: `SHOW PROCESSLIST`
2. ✓ Включить и проанализировать лог медленных запросов
3. ✓ Проверить использование индексов через `EXPLAIN`
4. ✓ Мониторить системные ресурсы (CPU, RAM, I/O)
5. ✓ Проверить конфигурацию MySQL
6. ✓ Анализировать статистику InnoDB
7. ✓ Проверить фрагментацию таблиц
8. ✓ Проверить сетевую задержку (для удаленных БД)
9. ✓ Применить оптимизации
10. ✓ Внедрить постоянный мониторинг

### Приоритизация действий

**Срочные (немедленное улучшение):**
- Остановка зависших запросов: `KILL QUERY process_id`
- Добавление критически важных индексов
- Увеличение `innodb_buffer_pool_size` если доступна RAM

**Среднесрочные (в течение дня-недели):**
- Оптимизация медленных запросов
- Настройка конфигурации MySQL
- Оптимизация фрагментированных таблиц

**Долгосрочные (планирование):**
- Апгрейд железа
- Внедрение репликации/шардирования
- Архитектурные изменения в приложении

### Полезные инструменты

- **[mysqldumpslow](https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html)**: анализ логов медленных запросов
- **[Percona Toolkit](https://www.percona.com/software/database-tools/percona-toolkit)**: набор инструментов для MySQL (pt-query-digest, pt-online-schema-change)
- **[mysqltuner](https://github.com/major/MySQLTuner-perl)**: скрипт для рекомендаций по настройке
- **[innotop](https://github.com/innotop/innotop)**: мониторинг MySQL в реальном времени
- **[mytop](http://jeremy.zawodny.com/mysql/mytop/)**: top-подобный монитор для MySQL

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
