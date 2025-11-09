# Вопрос

Мы знаем что есть всего 7 записей с ticket_id=56412. Записей с ticket_id > 60000 нет, никаких символов перед 56412 нет. Как могла появиться разница в количестве? Опишите ваши действия.

- SELECT count(*) FROM tickets_messages WHERE ticket_id=56412; возвращает 5 записей
- SELECT count(*) FROM tickets_messages WHERE ticket_id like '%56412'; возвращает 7 записей

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Разница в количестве записей (5 при `=` и 7 при `LIKE`) указывает на наличие пробелов (или других невидимых символов) в начале или конце значения в поле ticket_id. Оператор `=` требует точного совпадения, а `LIKE '%56412'` находит все записи, где строка заканчивается на '56412', включая записи с ведущими пробелами вроде ' 56412' или '  56412'. Необходимо проверить фактические значения с помощью функций CONCAT/LENGTH, найти записи с пробелами, определить источник проблемы и исправить данные с помощью TRIM.

---

## Подробное объяснение

Эта ситуация является классической проблемой [качества данных](https://ru.wikipedia.org/wiki/Качество_данных) в [MySQL](https://ru.wikipedia.org/wiki/MySQL), связанной с невидимыми [пробельными символами](https://ru.wikipedia.org/wiki/Пробельный_символ) в текстовых полях.

### 1. Понимание проблемы: почему разные результаты?

**Ключевое отличие операторов:**

**Оператор `=` (точное сравнение):**
```sql
SELECT count(*) FROM tickets_messages WHERE ticket_id = '56412';
-- Результат: 5 записей
```
[Оператор равенства](https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#operator_equal) требует **полного точного совпадения** строк. Он найдет только записи, где ticket_id содержит ровно '56412' без каких-либо дополнительных символов.

**Оператор `LIKE` (сопоставление с шаблоном):**
```sql
SELECT count(*) FROM tickets_messages WHERE ticket_id LIKE '%56412';
-- Результат: 7 записей
```
[Оператор LIKE](https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html#operator_like) с [шаблоном](https://ru.wikipedia.org/wiki/Регулярное_выражение) `%56412` (где `%` соответствует любому количеству символов) найдет все записи, где строка **заканчивается** на '56412', независимо от того, что находится перед ним.

**Вывод:** 2 дополнительные записи содержат пробелы или другие символы перед '56412', например:
- `' 56412'` (один пробел)
- `'  56412'` (два пробела)
- `'\t56412'` ([табуляция](https://ru.wikipedia.org/wiki/Табуляция))
- `'\n56412'` ([перевод строки](https://ru.wikipedia.org/wiki/Перевод_строки))

### 2. Диагностика: проверка фактических значений

**Шаг 1: Визуализация невидимых символов**

Невидимые символы сложно увидеть в обычном выводе, поэтому используем функцию [CONCAT](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat) для добавления маркеров:

```sql
-- Добавляем квадратные скобки вокруг значения, чтобы увидеть пробелы
SELECT
    id,
    CONCAT('[', ticket_id, ']') as ticket_id_with_brackets,
    LENGTH(ticket_id) as length,
    CHAR_LENGTH(ticket_id) as char_length
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
ORDER BY id;
```

**Ожидаемый вывод:**
```
id  | ticket_id_with_brackets | length | char_length
----|------------------------|--------|------------
1   | [56412]                | 5      | 5
2   | [56412]                | 5      | 5
3   | [56412]                | 5      | 5
4   | [56412]                | 5      | 5
5   | [56412]                | 5      | 5
6   | [ 56412]               | 6      | 6          <- один пробел!
7   | [  56412]              | 7      | 7          <- два пробела!
```

**Шаг 2: Найти все записи с ведущими/концевыми пробелами**

```sql
-- Найти записи, где значение отличается от обрезанного (trimmed)
SELECT
    id,
    CONCAT('[', ticket_id, ']') as original_value,
    CONCAT('[', TRIM(ticket_id), ']') as trimmed_value,
    LENGTH(ticket_id) as original_length,
    LENGTH(TRIM(ticket_id)) as trimmed_length
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);
```

Эта [функция TRIM](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_trim) удаляет пробелы в начале и конце строки, позволяя найти записи с пробелами.

**Шаг 3: Проверить конкретные записи, которые не совпадают**

```sql
-- Записи, которые находятся по LIKE, но не по =
SELECT
    id,
    CONCAT('[', ticket_id, ']') as value,
    LENGTH(ticket_id) as length,
    HEX(ticket_id) as hex_representation
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
  AND ticket_id != '56412';
```

Функция [HEX](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_hex) покажет [шестнадцатеричное представление](https://ru.wikipedia.org/wiki/Шестнадцатеричная_система_счисления) строки, где:
- `20` = пробел
- `09` = табуляция
- `0A` = перевод строки (LF)
- `0D` = возврат каретки (CR)

**Пример вывода:**
```
id | value      | length | hex_representation
---|------------|--------|-------------------
6  | [ 56412]   | 6      | 203536343132      <- 20 = пробел
7  | [  56412]  | 7      | 20203536343132    <- 2020 = два пробела
```

### 3. Возможные причины появления пробелов

**3.1. Ошибки при вводе данных**

[Пользовательский ввод](https://ru.wikipedia.org/wiki/Ввод-вывод) через веб-формы без надлежащей валидации:
```php
// Плохой пример: без обработки
$ticket_id = $_POST['ticket_id'];  // Пользователь ввёл ' 56412'
```

**Исправление:**
```php
// Хороший пример: с обработкой
$ticket_id = trim($_POST['ticket_id']);
```

**3.2. Импорт данных из CSV/Excel**

При [импорте данных](https://ru.wikipedia.org/wiki/Импорт_и_экспорт_данных) из [CSV](https://ru.wikipedia.org/wiki/CSV) или [Excel](https://ru.wikipedia.org/wiki/Microsoft_Excel), ячейки могут содержать пробелы:

```sql
-- Загрузка данных без обработки
LOAD DATA INFILE '/path/to/file.csv'
INTO TABLE tickets_messages
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

**Исправление:**
```sql
-- С использованием SET для очистки
LOAD DATA INFILE '/path/to/file.csv'
INTO TABLE tickets_messages
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(@ticket_id, @message)
SET
    ticket_id = TRIM(@ticket_id),
    message = @message;
```

**3.3. Конкатенация строк в коде**

Неправильная конкатенация в [приложении](https://ru.wikipedia.org/wiki/Прикладное_программное_обеспечение):
```javascript
// Плохой пример
const ticketId = ' ' + userInput;  // Случайный пробел
```

**3.4. Копирование из документов**

Пользователи копируют ID из документов Word/PDF, захватывая невидимые символы.

### 4. Проверка типа данных столбца

**Важная проверка:** убедитесь, что `ticket_id` имеет правильный [тип данных](https://dev.mysql.com/doc/refman/8.0/en/data-types.html).

```sql
-- Проверить структуру таблицы
DESCRIBE tickets_messages;
-- или
SHOW CREATE TABLE tickets_messages;
```

**Проблема:** Если ticket_id определён как [VARCHAR](https://dev.mysql.com/doc/refman/8.0/en/char.html) или [TEXT](https://dev.mysql.com/doc/refman/8.0/en/blob.html), он может хранить пробелы. Если это числовое значение, лучше использовать [INT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html) или [BIGINT](https://dev.mysql.com/doc/refman/8.0/en/integer-types.html).

**Текущее (вероятное):**
```sql
ticket_id VARCHAR(50)  -- Может содержать пробелы
```

**Рекомендуемое (если это числа):**
```sql
ticket_id INT UNSIGNED  -- Только числа, пробелы невозможны
```

### 5. Исправление существующих данных

**Шаг 1: Создать резервную копию**

```sql
-- ВАЖНО: всегда создавайте резервную копию перед изменением данных
CREATE TABLE tickets_messages_backup AS
SELECT * FROM tickets_messages;
```

**Шаг 2: Обновить данные, удалив пробелы**

```sql
-- Обрезать пробелы в начале и конце
UPDATE tickets_messages
SET ticket_id = TRIM(ticket_id)
WHERE ticket_id != TRIM(ticket_id);
```

**Шаг 3: Проверить результаты**

```sql
-- Должны теперь вернуть одинаковое количество
SELECT COUNT(*) FROM tickets_messages WHERE ticket_id = '56412';
-- Результат: 7 записей

SELECT COUNT(*) FROM tickets_messages WHERE ticket_id LIKE '%56412';
-- Результат: 7 записей
```

**Шаг 4: (Необязательно) Изменить тип данных**

Если ticket_id всегда содержит числа, измените тип на INT:

```sql
-- Сначала убедитесь, что все значения числовые
SELECT ticket_id
FROM tickets_messages
WHERE ticket_id REGEXP '[^0-9]';  -- Найти нечисловые значения

-- Если пусто, можно безопасно изменить тип
ALTER TABLE tickets_messages
MODIFY COLUMN ticket_id INT UNSIGNED;
```

### 6. Предотвращение будущих проблем

**6.1. Валидация на уровне приложения**

```python
# Python пример
def clean_ticket_id(ticket_id):
    """Очистка и валидация ticket_id"""
    # Удалить пробелы
    ticket_id = ticket_id.strip()

    # Проверить, что это число
    if not ticket_id.isdigit():
        raise ValueError(f"Invalid ticket_id: {ticket_id}")

    return int(ticket_id)

# Использование
ticket_id = clean_ticket_id(user_input)
```

**6.2. Ограничения базы данных (constraints)**

Если используете VARCHAR, добавьте [CHECK constraint](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html) (MySQL 8.0.16+):

```sql
ALTER TABLE tickets_messages
ADD CONSTRAINT ticket_id_no_spaces
CHECK (ticket_id = TRIM(ticket_id));
```

**6.3. Триггеры для автоматической очистки**

Создайте [триггер](https://dev.mysql.com/doc/refman/8.0/en/triggers.html) для автоматического обрезания пробелов:

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

**6.4. Регулярный мониторинг**

Создайте запрос для регулярной проверки качества данных:

```sql
-- Запрос для мониторинга: найти записи с пробелами
SELECT
    COUNT(*) as records_with_spaces,
    COUNT(DISTINCT ticket_id) as unique_tickets_affected
FROM tickets_messages
WHERE ticket_id != TRIM(ticket_id);
```

### 7. Дополнительные диагностические запросы

**Проверка на концевые пробелы:**
```sql
SELECT
    id,
    CONCAT('[', ticket_id, ']') as value,
    LENGTH(ticket_id) as length
FROM tickets_messages
WHERE ticket_id LIKE '56412%'
  AND ticket_id != '56412';
```

**Проверка на нестандартные пробельные символы:**
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

**Группировка по типу проблемы:**
```sql
SELECT
    LENGTH(ticket_id) - LENGTH(TRIM(ticket_id)) as spaces_count,
    COUNT(*) as records_count
FROM tickets_messages
WHERE ticket_id LIKE '%56412'
GROUP BY spaces_count
ORDER BY spaces_count;
```

### 8. План действий для решения задачи

**Краткосрочные действия (немедленно):**

1. ✓ Визуализировать проблемные значения:
   ```sql
   SELECT CONCAT('[', ticket_id, ']'), LENGTH(ticket_id)
   FROM tickets_messages WHERE ticket_id LIKE '%56412';
   ```

2. ✓ Идентифицировать проблемные записи:
   ```sql
   SELECT * FROM tickets_messages
   WHERE ticket_id LIKE '%56412' AND ticket_id != '56412';
   ```

3. ✓ Создать резервную копию:
   ```sql
   CREATE TABLE tickets_messages_backup AS SELECT * FROM tickets_messages;
   ```

4. ✓ Исправить данные:
   ```sql
   UPDATE tickets_messages SET ticket_id = TRIM(ticket_id)
   WHERE ticket_id != TRIM(ticket_id);
   ```

**Среднесрочные действия (в течение недели):**

5. ✓ Проанализировать источник проблемы (формы ввода, импорт, API)
6. ✓ Добавить валидацию в коде приложения
7. ✓ Создать триггеры для предотвращения будущих проблем
8. ✓ Рассмотреть изменение типа данных на INT (если применимо)

**Долгосрочные действия (планирование):**

9. ✓ Внедрить мониторинг качества данных
10. ✓ Провести аудит других текстовых полей на предмет подобных проблем
11. ✓ Документировать стандарты качества данных
12. ✓ Обучить команду правильным практикам обработки данных

### 9. Сравнение поведения операторов

| Аспект | `=` | `LIKE '%56412'` |
|--------|-----|-----------------|
| Точность | Точное совпадение | Шаблонное совпадение |
| Пробелы в начале | Не совпадает | Совпадает |
| Пробелы в конце | Не совпадает | Не совпадает (для `%56412`) |
| Производительность | Может использовать [индекс](https://ru.wikipedia.org/wiki/Индекс_(базы_данных)) | Обычно [полное сканирование таблицы](https://ru.wikipedia.org/wiki/Полное_сканирование_таблицы) |
| Регистрозависимость | Зависит от [collation](https://dev.mysql.com/doc/refman/8.0/en/charset-general.html) | Зависит от collation |
| Применение | Точный поиск | Частичное совпадение |

### 10. Практические примеры для тестирования

**Создать тестовую таблицу:**
```sql
CREATE TABLE test_whitespace (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value VARCHAR(20)
);

INSERT INTO test_whitespace (value) VALUES
('56412'),           -- Точное значение
(' 56412'),          -- Один ведущий пробел
('  56412'),         -- Два ведущих пробела
('56412 '),          -- Один концевой пробел
(' 56412 '),         -- Пробелы с обеих сторон
('\t56412'),         -- Табуляция
('\n56412');         -- Перевод строки

-- Тестирование различных запросов
SELECT COUNT(*) FROM test_whitespace WHERE value = '56412';         -- 1
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '%56412';     -- 4
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '56412%';     -- 3
SELECT COUNT(*) FROM test_whitespace WHERE value LIKE '%56412%';    -- 6
SELECT COUNT(*) FROM test_whitespace WHERE TRIM(value) = '56412';   -- 5

-- Очистка
DROP TABLE test_whitespace;
```

### Вывод

Разница между 5 и 7 записями является результатом наличия **ведущих пробелов** (или других невидимых символов) в 2 записях. Оператор `=` требует точного совпадения и не находит записи с пробелами, в то время как `LIKE '%56412'` находит все записи, где строка заканчивается на '56412', независимо от предшествующих символов.

**Решение:** Использовать функцию `TRIM()` для очистки данных и внедрить валидацию для предотвращения будущих проблем.

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
