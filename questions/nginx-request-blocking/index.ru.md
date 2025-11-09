# Вопрос

Расскажите, каким образом вы будете блокировать в Nginx запросы вида "GET /?[a-z]{16} HTTP/1.1"?

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Использовать директиву `location` с регулярным выражением или модуль `ngx_http_map_module` для анализа аргументов запроса, затем вернуть ошибку 403 (Forbidden) или 444 (закрыть соединение без ответа) для совпадающих паттернов. Наиболее эффективный способ - использовать директиву `if` с проверкой `$args` или `$query_string` на регулярное выражение.

---

## Подробное объяснение

Блокировка запросов с определенными паттернами параметров в [Nginx](https://ru.wikipedia.org/wiki/Nginx) - важная задача для защиты от [автоматизированных атак](https://ru.wikipedia.org/wiki/Автоматизированная_атака), сканеров уязвимостей и вредоносных ботов.

### Анализ паттерна запроса

Паттерн `GET /?[a-z]{16} HTTP/1.1` означает:
- [HTTP-метод](https://ru.wikipedia.org/wiki/HTTP#Методы) `GET`
- Путь `/`
- [Query string](https://ru.wikipedia.org/wiki/Строка_запроса) с параметром, состоящим ровно из 16 строчных латинских букв
- Примеры: `/?abcdefghijklmnop`, `/?zyxwvutsrqponml`

### Метод 1: Использование директивы if с проверкой $args (Рекомендуется)

**Конфигурация:**

```nginx
server {
    listen 80;
    server_name example.com;

    # Блокировка запросов с query string вида [a-z]{16}
    if ($args ~* ^[a-z]{16}$) {
        return 403;
    }

    # Остальная конфигурация
    location / {
        root /var/www/html;
        index index.html;
    }
}
```

**Объяснение:**
- `$args` - встроенная переменная Nginx, содержащая [query string](https://nginx.org/ru/docs/http/ngx_http_core_module.html#var_args) (без знака `?`)
- `~*` - оператор регулярного выражения с игнорированием регистра
- `^[a-z]{16}$` - [регулярное выражение](https://ru.wikipedia.org/wiki/Регулярные_выражения): ровно 16 строчных букв от начала (`^`) до конца (`$`)
- `return 403` - возвращает [HTTP 403 Forbidden](https://ru.wikipedia.org/wiki/Список_кодов_состояния_HTTP#403)

**Альтернативные коды ответа:**
```nginx
# Вариант 1: Закрыть соединение без ответа (экономит bandwidth)
if ($args ~* ^[a-z]{16}$) {
    return 444;
}

# Вариант 2: Вернуть 400 Bad Request
if ($args ~* ^[a-z]{16}$) {
    return 400;
}

# Вариант 3: Вернуть 404 Not Found (скрыть факт блокировки)
if ($args ~* ^[a-z]{16}$) {
    return 404;
}
```

### Метод 2: Использование модуля map

**Конфигурация:**

```nginx
# В секции http
http {
    # Создаем переменную для идентификации вредоносных запросов
    map $args $is_malicious_request {
        default 0;
        ~^[a-z]{16}$ 1;
    }

    server {
        listen 80;
        server_name example.com;

        # Блокируем если запрос определен как вредоносный
        if ($is_malicious_request) {
            return 403;
        }

        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

**Преимущества метода map:**
- [Модуль map](https://nginx.org/ru/docs/http/ngx_http_map_module.html) создает переменную на основе значений других переменных
- Выполняется один раз при инициализации, более эффективен для множественных проверок
- Удобен для централизованного управления правилами блокировки
- Лучшая производительность при большом количестве правил

### Метод 3: Использование location с регулярным выражением

**Конфигурация:**

```nginx
server {
    listen 80;
    server_name example.com;

    # Специальный location для блокировки
    location ~ ^/$ {
        if ($args ~* ^[a-z]{16}$) {
            return 403;
        }

        root /var/www/html;
        index index.html;
    }

    # Другие locations
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Метод 4: Комплексная защита с несколькими паттернами

**Конфигурация:**

```nginx
http {
    # Определяем несколько паттернов вредоносных запросов
    map $args $block_reason {
        default                 "";
        ~^[a-z]{16}$           "suspicious_pattern_16";
        ~^[0-9]{10,}$          "suspicious_numeric";
        ~.*(<script|javascript:).* "xss_attempt";
        ~.*(union|select|insert|update|delete).* "sql_injection";
    }

    server {
        listen 80;
        server_name example.com;

        # Блокировка с логированием причины
        if ($block_reason != "") {
            access_log /var/log/nginx/blocked.log combined;
            return 403;
        }

        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

### Метод 5: Использование модуля ngx_http_limit_req для rate limiting

**Конфигурация:**

```nginx
http {
    # Создаем зону для отслеживания подозрительных запросов
    limit_req_zone $binary_remote_addr zone=suspicious:10m rate=1r/m;

    map $args $is_suspicious {
        default 0;
        ~^[a-z]{16}$ 1;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            # Применяем rate limiting к подозрительным запросам
            if ($is_suspicious) {
                limit_req zone=suspicious burst=1 nodelay;
            }

            root /var/www/html;
            index index.html;
        }
    }
}
```

**Преимущества:**
- [Rate limiting](https://nginx.org/ru/docs/http/ngx_http_limit_req_module.html) ограничивает частоту запросов
- Позволяет легитимному трафику проходить, но замедляет сканеры
- Защищает от перегрузки сервера

### Метод 6: Использование Lua (требует ngx_http_lua_module)

**Конфигурация:**

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        access_by_lua_block {
            local args = ngx.var.args
            if args and string.match(args, "^[a-z]%{16}$") then
                ngx.exit(ngx.HTTP_FORBIDDEN)
            end
        }

        root /var/www/html;
        index index.html;
    }
}
```

**Преимущества:**
- [OpenResty](https://openresty.org/ru/) и [ngx_http_lua_module](https://github.com/openresty/lua-nginx-module) предоставляют мощные возможности
- Более гибкая логика блокировки
- Можно реализовать сложные проверки и [логирование](https://ru.wikipedia.org/wiki/Журналирование)

### Логирование заблокированных запросов

**Рекомендуемая конфигурация с детальным логированием:**

```nginx
http {
    # Формат лога для заблокированных запросов
    log_format blocked '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_referer" "$http_user_agent" '
                      'args="$args" block_reason="$block_reason"';

    map $args $block_reason {
        default "";
        ~^[a-z]{16}$ "pattern_16_lowercase";
    }

    server {
        listen 80;
        server_name example.com;

        if ($block_reason != "") {
            access_log /var/log/nginx/blocked_requests.log blocked;
            return 403;
        }

        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

### Производительность и оптимизация

**Рекомендации:**

1. **Используйте `map` для множественных правил:**
   - Проверка выполняется один раз
   - Результат кэшируется
   - Лучше масштабируется

2. **Избегайте излишнего использования `if`:**
   - Директива `if` в Nginx имеет ограничения ([if is evil](https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/))
   - Предпочтительнее использовать `map` + `if` для одной проверки

3. **Оптимизируйте регулярные выражения:**
   - Используйте якоря `^` и `$` для точного совпадения
   - Избегайте избыточных проверок

4. **Кэширование и производительность:**
```nginx
# Увеличьте кэш регулярных выражений
pcre_jit on;  # Just-In-Time компиляция PCRE
```

### Тестирование конфигурации

**Проверка синтаксиса:**
```bash
# Проверка конфигурации без перезапуска
nginx -t

# Проверка с подробным выводом
nginx -T
```

**Тестирование блокировки:**
```bash
# Должен вернуть 403
curl -i "http://example.com/?abcdefghijklmnop"

# Должен работать нормально (не 16 символов)
curl -i "http://example.com/?test"

# Должен работать нормально (есть цифры)
curl -i "http://example.com/?abcdefghijklmno1"
```

**Мониторинг заблокированных запросов:**
```bash
# Просмотр заблокированных запросов в реальном времени
tail -f /var/log/nginx/blocked_requests.log

# Статистика по IP-адресам
awk '{print $1}' /var/log/nginx/blocked_requests.log | sort | uniq -c | sort -rn

# Анализ паттернов args
grep -oP 'args="[^"]*"' /var/log/nginx/blocked_requests.log | sort | uniq -c
```

### Дополнительные меры безопасности

**1. Блокировка на уровне файрвола (опционально):**

```bash
# Использование fail2ban для автоматической блокировки
# /etc/fail2ban/filter.d/nginx-malicious-requests.conf
[Definition]
failregex = ^<HOST> .* "GET /\?[a-z]{16} .*" 403
ignoreregex =

# /etc/fail2ban/jail.local
[nginx-malicious-requests]
enabled = true
filter = nginx-malicious-requests
logpath = /var/log/nginx/access.log
maxretry = 3
bantime = 3600
```

**2. Использование ModSecurity WAF:**

```nginx
# Требует nginx с ModSecurity
location / {
    modsecurity on;
    modsecurity_rules '
        SecRule ARGS "@rx ^[a-z]{16}$" \
            "id:1001,phase:1,deny,status:403,msg:Suspicious query pattern"
    ';
}
```

**3. Интеграция с системами обнаружения вторжений:**
- [OSSEC](https://ru.wikipedia.org/wiki/OSSEC)
- [Suricata](https://suricata.io/)
- [Wazuh](https://wazuh.com/)

### Мониторинг и алертинг

**Настройка метрик для мониторинга:**

```nginx
# Экспорт метрик для Prometheus (требует nginx-prometheus-exporter)
location /metrics {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://127.0.0.1:9113/metrics;
}
```

**Алертинг при всплесках блокировок:**
- Настроить оповещения в [Prometheus](https://ru.wikipedia.org/wiki/Prometheus_(программное_обеспечение)) + [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- Использовать [Grafana](https://ru.wikipedia.org/wiki/Grafana) для визуализации
- Интеграция с [PagerDuty](https://www.pagerduty.com/), [Slack](https://slack.com/), или email

### Сравнение методов

| Метод | Производительность | Сложность | Гибкость | Рекомендация |
|-------|-------------------|-----------|----------|--------------|
| `if` с `$args` | Хорошая | Низкая | Средняя | ✓ Для простых случаев |
| `map` | Отличная | Средняя | Высокая | ✓✓ Рекомендуется |
| `location` regex | Хорошая | Средняя | Средняя | Для специфичных путей |
| Lua | Средняя | Высокая | Очень высокая | Для сложной логики |
| Rate limiting | Хорошая | Средняя | Средняя | Дополнительная защита |
| ModSecurity | Средняя | Высокая | Очень высокая | Для полноценного WAF |

### Рекомендуемое решение

**Оптимальная конфигурация для продакшена:**

```nginx
http {
    # Формат лога для анализа
    log_format security '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status "$args" '
                       '"$http_user_agent" reason="$block_reason"';

    # Определяем правила блокировки
    map $args $block_reason {
        default "";
        ~^[a-z]{16}$ "suspicious_16_char_pattern";
    }

    # Rate limiting для подозрительных запросов
    limit_req_zone $binary_remote_addr zone=security:10m rate=10r/m;

    server {
        listen 80;
        server_name example.com;

        # Блокировка с логированием
        if ($block_reason != "") {
            access_log /var/log/nginx/security.log security;
            limit_req zone=security burst=2 nodelay;
            return 403 "Request blocked for security reasons";
        }

        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

### Проверка и применение изменений

**Порядок действий:**

1. **Сделать резервную копию конфигурации:**
```bash
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

2. **Внести изменения в конфигурацию**

3. **Проверить синтаксис:**
```bash
nginx -t
```

4. **Применить изменения:**
```bash
# Graceful reload (без обрыва соединений)
nginx -s reload

# Или через systemd
systemctl reload nginx
```

5. **Проверить логи на ошибки:**
```bash
tail -f /var/log/nginx/error.log
```

### Полезные ресурсы

- **[Официальная документация Nginx](https://nginx.org/ru/docs/)**
- **[Nginx if is evil](https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/)**: о корректном использовании `if`
- **[ngx_http_map_module](https://nginx.org/ru/docs/http/ngx_http_map_module.html)**: документация по модулю map
- **[ngx_http_limit_req_module](https://nginx.org/ru/docs/http/ngx_http_limit_req_module.html)**: rate limiting
- **[ModSecurity](https://modsecurity.org/)**: веб-файрвол для Nginx
- **[OpenResty](https://openresty.org/ru/)**: расширенная версия Nginx с Lua

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
