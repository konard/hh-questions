# Вопрос

Какой из запросов MySQL самый тяжелый: https://xpaste.pro/p/t4q0Lsp0?

Расскажите как вы его выявили?

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Самый тяжелый запрос - Query 4 (последний SELECT запрос). Он выявляется по следующим признакам: огромный список из 143 forum_id в IN clause, LIMIT 18446744073709551615 (фактически без ограничения), множественные CROSS JOIN, отсутствие фильтрации результатов, что приведет к полному сканированию таблиц и обработке огромного объема данных.

---

## Подробное объяснение

При анализе набора [MySQL](https://ru.wikipedia.org/wiki/MySQL) запросов для определения самого тяжелого необходим систематический подход, учитывающий множество факторов производительности.

### Анализ представленных запросов

Давайте рассмотрим все четыре [запроса](https://ru.wikipedia.org/wiki/SQL) из предоставленной ссылки:

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

### Методика выявления самого тяжелого запроса

#### 1. Визуальный анализ структуры запросов

**Query 2** сразу отбрасываем - это простой [DELETE](https://ru.wikipedia.org/wiki/Data_Manipulation_Language) с условием по [первичному ключу](https://ru.wikipedia.org/wiki/Первичный_ключ), он выполнится мгновенно.

**Queries 1, 3, 4** имеют схожую структуру с несколькими критическими различиями:

| Параметр | Query 1 | Query 3 | Query 4 |
|----------|---------|---------|---------|
| Количество forum_id в IN | 1 (равенство) | 4 | **143** |
| LIMIT | 100 | 18446744073709551615 | 18446744073709551615 |
| Потенциальный объем данных | Низкий | Средний | **Очень высокий** |

#### 2. Анализ ключевых факторов нагрузки

**Проблема 1: Огромный IN clause в Query 4**

```sql
p.forum_id IN (9, 16, 17, ... 143 значения ... 1542, 119)
```

**Влияние на производительность:**
- MySQL должен проверить каждую строку на соответствие любому из 143 значений
- [Оптимизатор запросов](https://ru.wikipedia.org/wiki/Оптимизация_запросов) может не использовать [индекс](https://ru.wikipedia.org/wiki/Индекс_(базы_данных)) эффективно при таком большом списке
- Если для каждого forum_id есть значительное количество постов, объем промежуточных данных будет огромным

**Проблема 2: Фактическое отсутствие LIMIT**

```sql
LIMIT 18446744073709551615
```

Значение `18446744073709551615` - это максимальное значение для [unsigned BIGINT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html) (2^64 - 1), что фактически означает "вернуть все строки".

**Влияние:**
- MySQL не может оптимизировать выполнение через раннюю остановку
- Все подходящие строки должны быть обработаны
- Требуется полная сортировка всего результирующего набора

**Проблема 3: CROSS JOIN**

```sql
FROM (phpbb_posts p CROSS JOIN phpbb_users u CROSS JOIN phpbb_topics t)
```

[CROSS JOIN](https://ru.wikipedia.org/wiki/Join_(SQL)#Декартово_произведение) создает [декартово произведение](https://ru.wikipedia.org/wiki/Декартово_произведение), но благодаря условиям в WHERE:
```sql
WHERE p.topic_id = t.topic_id AND p.poster_id = u.user_id
```
фактически происходит [INNER JOIN](https://ru.wikipedia.org/wiki/Join_(SQL)#Внутреннее_соединение).

Однако порядок соединения может быть неоптимальным - MySQL придется сначала создать большую промежуточную таблицу.

**Проблема 4: SELECT \***

```sql
SELECT f.*, t.*, p.*, u.*
```

Запрос выбирает **все поля** из четырех таблиц, что означает:
- Большой объем передаваемых данных
- Увеличенное использование [буферного пула](https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- Больше [I/O операций](https://ru.wikipedia.org/wiki/Ввод-вывод)

**Проблема 5: Сортировка большого набора данных**

```sql
ORDER BY t.topic_last_post_time DESC, p.post_time
```

При большом результирующем наборе потребуется:
- Создание [временной таблицы](https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html)
- [Filesort](https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html#order-by-filesort) операция для сортировки

#### 3. Инструментальный анализ

Для точного определения можно использовать несколько подходов:

**Метод 1: EXPLAIN анализ**

```sql
EXPLAIN SELECT f.*, t.*, p.*, u.* ...
```

[EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html) покажет:
- `rows`: оценочное количество проверяемых строк (у Query 4 будет максимальным)
- `type`: тип доступа к таблице (ALL = полное сканирование - плохо)
- `Extra`: наличие `Using temporary; Using filesort` указывает на создание временной таблицы и сортировку

**Ожидаемый результат для Query 4:**
```
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
| id | select_type | table | type   | rows   | key  | Extra  |                                 |
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
|  1 | SIMPLE      | p     | range  | 500000 | idx  | Using where; Using temporary;   |
|    |             |       |        |        |      |        | Using filesort                  |
+----+-------------+-------+--------+--------+------+--------+---------------------------------+
```

**Метод 2: EXPLAIN FORMAT=JSON**

```sql
EXPLAIN FORMAT=JSON SELECT ...
```

Дает более детальную информацию о стоимости запроса:
```json
{
  "query_block": {
    "cost_info": {
      "query_cost": "125000.50"  // Query 4 будет иметь наибольшую стоимость
    }
  }
}
```

**Метод 3: EXPLAIN ANALYZE (MySQL 8.0+)**

```sql
EXPLAIN ANALYZE SELECT ...
```

Показывает **реальное** время выполнения:
```
-> Sort: t.topic_last_post_time DESC, p.post_time  (cost=125000.50 rows=500000) (actual time=8500..8520 rows=500000 loops=1)
```

**Метод 4: Профилирование запроса**

```sql
SET profiling = 1;
SELECT ...;  -- Выполнить каждый запрос
SHOW PROFILES;
```

Результат покажет время выполнения каждого запроса:
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

**Метод 5: Performance Schema**

```sql
SELECT * FROM performance_schema.events_statements_history
WHERE sql_text LIKE '%phpbb_posts%'
ORDER BY timer_wait DESC;
```

Покажет реальную статистику выполнения с детальными метриками.

#### 4. Расчетная оценка сложности

Предположим статистику таблиц:
- `phpbb_posts`: 1,000,000 строк
- `phpbb_users`: 100,000 строк
- `phpbb_topics`: 50,000 строк
- `phpbb_forums`: 500 строк

**Query 1 (forum_id = 326):**
- Проверяемые посты: ~2,000 (1 форум)
- С учетом JOIN: ~2,000 строк
- **Сложность: O(n) где n ≈ 2,000**

**Query 3 (4 форума):**
- Проверяемые посты: ~8,000 (4 форума)
- С учетом JOIN: ~8,000 строк
- **Сложность: O(n) где n ≈ 8,000**

**Query 4 (143 форума):**
- Проверяемые посты: ~286,000 (143 форума, почти 30% всех постов)
- С учетом JOIN: ~286,000 строк
- Сортировка: O(n log n) где n = 286,000
- **Сложность: O(n log n) где n ≈ 286,000**

### Вывод: Query 4 - самый тяжелый запрос

**Причины:**

1. **Огромный IN clause** (143 значения) - проверка миллионов строк
2. **Фактическое отсутствие LIMIT** - обработка всех найденных строк
3. **Большой результирующий набор** - потенциально сотни тысяч строк
4. **Множественные JOIN операции** на большом наборе данных
5. **SELECT \*** - передача всех полей из четырех таблиц
6. **Сортировка огромного набора** - создание временной таблицы и filesort

### Рекомендации по оптимизации Query 4

#### Оптимизация 1: Разумное ограничение результатов

```sql
LIMIT 100  -- Вместо 18446744073709551615
```

Если нужна пагинация:
```sql
LIMIT 100 OFFSET 0  -- Для первой страницы
```

#### Оптимизация 2: Выборка только нужных полей

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

#### Оптимизация 3: Использование INNER JOIN вместо CROSS JOIN

```sql
FROM phpbb_posts p
INNER JOIN phpbb_topics t ON p.topic_id = t.topic_id
INNER JOIN phpbb_users u ON p.poster_id = u.user_id
LEFT JOIN phpbb_forums f ON t.forum_id = f.forum_id
LEFT JOIN phpbb_topics_track tt ON (t.topic_id = tt.topic_id AND tt.user_id = 69079)
LEFT JOIN phpbb_forums_track ft ON (f.forum_id = ft.forum_id AND ft.user_id = 69079)
```

#### Оптимизация 4: Создание составного индекса

```sql
CREATE INDEX idx_posts_forum_time_approved
ON phpbb_posts(forum_id, post_time, post_approved);
```

Этот [составной индекс](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html) позволит эффективно фильтровать по forum_id, post_time и post_approved.

#### Оптимизация 5: Разбиение на подзапросы

Если список форумов слишком большой, можно разбить на несколько запросов или использовать временную таблицу:

```sql
CREATE TEMPORARY TABLE temp_forums (forum_id INT);
INSERT INTO temp_forums VALUES (9), (16), (17), ... ;

SELECT ...
FROM phpbb_posts p
INNER JOIN temp_forums tf ON p.forum_id = tf.forum_id
...
```

#### Оптимизация 6: Использование индекса для сортировки

Если часто сортируется по `topic_last_post_time`:

```sql
CREATE INDEX idx_topics_last_post_time
ON phpbb_topics(topic_last_post_time DESC);
```

### Практические инструменты для выявления тяжелых запросов

**1. Slow Query Log**

Включение и настройка:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Запросы дольше 1 секунды
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

Анализ лога:
```bash
mysqldumpslow -s t -t 10 /var/log/mysql/mysql-slow.log
```

**2. Performance Schema**

```sql
-- Топ медленных запросов
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

Графический интерфейс для анализа производительности запросов в реальном времени.

**5. SHOW PROCESSLIST в реальном времени**

```sql
SHOW FULL PROCESSLIST;
```

Покажет долго выполняющиеся запросы:
```
+------+------+-----+------+---------+------+-------+------------------+
| Id   | User | db  | Time | State   | Info                            |
+------+------+-----+------+---------+------+-------+------------------+
| 1234 | web  | db  | 45   | Sending | SELECT f.*, t.*, p.* FROM ...   |
+------+------+-----+------+---------+------+-------+------------------+
```

### Чек-лист для анализа тяжести запросов

1. ✓ Оценить количество обрабатываемых строк (rows в EXPLAIN)
2. ✓ Проверить наличие и размер IN clause
3. ✓ Анализировать LIMIT (фактический vs формальный)
4. ✓ Оценить количество и типы JOIN операций
5. ✓ Проверить использование индексов (key в EXPLAIN)
6. ✓ Выявить наличие filesort и temporary tables
7. ✓ Оценить объем возвращаемых данных (SELECT *)
8. ✓ Учесть сложность сортировки (ORDER BY)
9. ✓ Использовать EXPLAIN ANALYZE для точных измерений
10. ✓ Сравнить query cost между запросами

### Сравнительная таблица запросов

| Критерий | Query 1 | Query 2 | Query 3 | Query 4 |
|----------|---------|---------|---------|---------|
| Тип операции | SELECT | DELETE | SELECT | SELECT |
| Количество таблиц | 6 | 1 | 6 | 6 |
| Размер IN clause | 1 | 1 | 4 | **143** |
| Эффективный LIMIT | 100 | N/A | ∞ | **∞** |
| Использует индекс | Да | Да | Частично | **Слабо** |
| Оценка строк | ~2K | 1 | ~8K | **~286K** |
| Сортировка | Да | Нет | Да | **Да (огромная)** |
| Тяжесть (1-10) | 3 | 1 | 5 | **10** |

**Победитель: Query 4 - безусловно самый тяжелый запрос**

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
