# Question

How would you block requests like "GET /?[a-z]{16} HTTP/1.1" in Nginx?

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

Use the `location` directive with a regular expression or the `ngx_http_map_module` to analyze query parameters, then return a 403 (Forbidden) or 444 (close connection without response) error for matching patterns. The most efficient approach is to use the `if` directive with `$args` or `$query_string` checked against a regular expression.

---

## Detailed explanation

Blocking requests with specific parameter patterns in [Nginx](https://en.wikipedia.org/wiki/Nginx) is an important task for protection against [automated attacks](https://en.wikipedia.org/wiki/Brute-force_attack), vulnerability scanners, and malicious bots.

### Analyzing the request pattern

The pattern `GET /?[a-z]{16} HTTP/1.1` means:
- [HTTP method](https://en.wikipedia.org/wiki/HTTP#Request_methods) `GET`
- Path `/`
- [Query string](https://en.wikipedia.org/wiki/Query_string) with a parameter consisting of exactly 16 lowercase Latin letters
- Examples: `/?abcdefghijklmnop`, `/?zyxwvutsrqponml`

### Method 1: Using if directive with $args check (Recommended)

**Configuration:**

```nginx
server {
    listen 80;
    server_name example.com;

    # Block requests with query string matching [a-z]{16}
    if ($args ~* ^[a-z]{16}$) {
        return 403;
    }

    # Rest of the configuration
    location / {
        root /var/www/html;
        index index.html;
    }
}
```

**Explanation:**
- `$args` - built-in Nginx variable containing the [query string](https://nginx.org/en/docs/http/ngx_http_core_module.html#var_args) (without the `?` sign)
- `~*` - case-insensitive regular expression operator
- `^[a-z]{16}$` - [regular expression](https://en.wikipedia.org/wiki/Regular_expression): exactly 16 lowercase letters from start (`^`) to end (`$`)
- `return 403` - returns [HTTP 403 Forbidden](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#403)

**Alternative response codes:**
```nginx
# Option 1: Close connection without response (saves bandwidth)
if ($args ~* ^[a-z]{16}$) {
    return 444;
}

# Option 2: Return 400 Bad Request
if ($args ~* ^[a-z]{16}$) {
    return 400;
}

# Option 3: Return 404 Not Found (hide the fact of blocking)
if ($args ~* ^[a-z]{16}$) {
    return 404;
}
```

### Method 2: Using map module

**Configuration:**

```nginx
# In http section
http {
    # Create a variable to identify malicious requests
    map $args $is_malicious_request {
        default 0;
        ~^[a-z]{16}$ 1;
    }

    server {
        listen 80;
        server_name example.com;

        # Block if request is identified as malicious
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

**Advantages of map method:**
- [Map module](https://nginx.org/en/docs/http/ngx_http_map_module.html) creates a variable based on values of other variables
- Executed once during initialization, more efficient for multiple checks
- Convenient for centralized management of blocking rules
- Better performance with many rules

### Method 3: Using location with regular expression

**Configuration:**

```nginx
server {
    listen 80;
    server_name example.com;

    # Special location for blocking
    location ~ ^/$ {
        if ($args ~* ^[a-z]{16}$) {
            return 403;
        }

        root /var/www/html;
        index index.html;
    }

    # Other locations
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Method 4: Comprehensive protection with multiple patterns

**Configuration:**

```nginx
http {
    # Define multiple patterns for malicious requests
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

        # Block with logging of the reason
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

### Method 5: Using ngx_http_limit_req for rate limiting

**Configuration:**

```nginx
http {
    # Create a zone for tracking suspicious requests
    limit_req_zone $binary_remote_addr zone=suspicious:10m rate=1r/m;

    map $args $is_suspicious {
        default 0;
        ~^[a-z]{16}$ 1;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            # Apply rate limiting to suspicious requests
            if ($is_suspicious) {
                limit_req zone=suspicious burst=1 nodelay;
            }

            root /var/www/html;
            index index.html;
        }
    }
}
```

**Advantages:**
- [Rate limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html) restricts request frequency
- Allows legitimate traffic to pass but slows down scanners
- Protects server from overload

### Method 6: Using Lua (requires ngx_http_lua_module)

**Configuration:**

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

**Advantages:**
- [OpenResty](https://openresty.org/) and [ngx_http_lua_module](https://github.com/openresty/lua-nginx-module) provide powerful capabilities
- More flexible blocking logic
- Can implement complex checks and [logging](https://en.wikipedia.org/wiki/Logging_(computing))

### Logging blocked requests

**Recommended configuration with detailed logging:**

```nginx
http {
    # Log format for blocked requests
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

### Performance and optimization

**Recommendations:**

1. **Use `map` for multiple rules:**
   - Check is performed once
   - Result is cached
   - Better scalability

2. **Avoid excessive use of `if`:**
   - The `if` directive in Nginx has limitations ([if is evil](https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/))
   - Prefer using `map` + `if` for a single check

3. **Optimize regular expressions:**
   - Use anchors `^` and `$` for exact matching
   - Avoid redundant checks

4. **Caching and performance:**
```nginx
# Increase regex cache
pcre_jit on;  # Just-In-Time PCRE compilation
```

### Testing configuration

**Syntax check:**
```bash
# Check configuration without restart
nginx -t

# Check with verbose output
nginx -T
```

**Testing blocking:**
```bash
# Should return 403
curl -i "http://example.com/?abcdefghijklmnop"

# Should work normally (not 16 characters)
curl -i "http://example.com/?test"

# Should work normally (contains digits)
curl -i "http://example.com/?abcdefghijklmno1"
```

**Monitoring blocked requests:**
```bash
# View blocked requests in real-time
tail -f /var/log/nginx/blocked_requests.log

# Statistics by IP addresses
awk '{print $1}' /var/log/nginx/blocked_requests.log | sort | uniq -c | sort -rn

# Analyze args patterns
grep -oP 'args="[^"]*"' /var/log/nginx/blocked_requests.log | sort | uniq -c
```

### Additional security measures

**1. Firewall-level blocking (optional):**

```bash
# Using fail2ban for automatic blocking
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

**2. Using ModSecurity WAF:**

```nginx
# Requires nginx with ModSecurity
location / {
    modsecurity on;
    modsecurity_rules '
        SecRule ARGS "@rx ^[a-z]{16}$" \
            "id:1001,phase:1,deny,status:403,msg:Suspicious query pattern"
    ';
}
```

**3. Integration with intrusion detection systems:**
- [OSSEC](https://en.wikipedia.org/wiki/OSSEC)
- [Suricata](https://suricata.io/)
- [Wazuh](https://wazuh.com/)

### Monitoring and alerting

**Setting up metrics for monitoring:**

```nginx
# Export metrics for Prometheus (requires nginx-prometheus-exporter)
location /metrics {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://127.0.0.1:9113/metrics;
}
```

**Alerting on blocking spikes:**
- Configure alerts in [Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- Use [Grafana](https://en.wikipedia.org/wiki/Grafana) for visualization
- Integration with [PagerDuty](https://www.pagerduty.com/), [Slack](https://slack.com/), or email

### Method comparison

| Method | Performance | Complexity | Flexibility | Recommendation |
|--------|-------------|------------|-------------|----------------|
| `if` with `$args` | Good | Low | Medium | ✓ For simple cases |
| `map` | Excellent | Medium | High | ✓✓ Recommended |
| `location` regex | Good | Medium | Medium | For specific paths |
| Lua | Medium | High | Very High | For complex logic |
| Rate limiting | Good | Medium | Medium | Additional protection |
| ModSecurity | Medium | High | Very High | For full WAF |

### Recommended solution

**Optimal production configuration:**

```nginx
http {
    # Log format for analysis
    log_format security '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status "$args" '
                       '"$http_user_agent" reason="$block_reason"';

    # Define blocking rules
    map $args $block_reason {
        default "";
        ~^[a-z]{16}$ "suspicious_16_char_pattern";
    }

    # Rate limiting for suspicious requests
    limit_req_zone $binary_remote_addr zone=security:10m rate=10r/m;

    server {
        listen 80;
        server_name example.com;

        # Block with logging
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

### Verification and applying changes

**Procedure:**

1. **Backup configuration:**
```bash
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

2. **Make changes to configuration**

3. **Check syntax:**
```bash
nginx -t
```

4. **Apply changes:**
```bash
# Graceful reload (without dropping connections)
nginx -s reload

# Or via systemd
systemctl reload nginx
```

5. **Check logs for errors:**
```bash
tail -f /var/log/nginx/error.log
```

### Useful resources

- **[Official Nginx documentation](https://nginx.org/en/docs/)**
- **[Nginx if is evil](https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/)**: about correct use of `if`
- **[ngx_http_map_module](https://nginx.org/en/docs/http/ngx_http_map_module.html)**: map module documentation
- **[ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)**: rate limiting
- **[ModSecurity](https://modsecurity.org/)**: web application firewall for Nginx
- **[OpenResty](https://openresty.org/)**: extended version of Nginx with Lua

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
