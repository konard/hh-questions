# Question

What is happening on the server (see monitoring screenshot)? Describe in the format of a response to the client, and if you have optimization suggestions, also specify them.

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The server is experiencing critical load: high Load Average (33.00), active swap memory usage (7.4G), increased disk activity with I/O wait, and numerous Apache processes. Memory optimization, Apache configuration, disk subsystem analysis, and possible resource scaling are required.

---

## Detailed explanation

Based on analysis of the [server monitoring screenshot](https://en.wikipedia.org/wiki/System_monitor) ([htop](https://en.wikipedia.org/wiki/Htop)/[top](https://en.wikipedia.org/wiki/Top_(software)) and [iostat](https://en.wikipedia.org/wiki/Iostat) output), several critical [performance](https://en.wikipedia.org/wiki/Computer_performance) issues can be identified.

### Current server status analysis

#### 1. Critically high Load Average

**Observation:** Load Average is **33.00**, indicating serious system overload.

**What this means:**
- [Load Average](https://en.wikipedia.org/wiki/Load_(computing)) shows the average number of processes waiting for [CPU](https://en.wikipedia.org/wiki/Central_processing_unit) execution or in [I/O wait](https://en.wikipedia.org/wiki/Input/output) state
- A value of 33.00 with the visible number of [CPU cores](https://en.wikipedia.org/wiki/Multi-core_processor) means a significant execution queue
- This indicates the system cannot handle the current load

**Causes:**
- Insufficient computing resources
- Disk operation bottlenecks
- Too many concurrent processes

#### 2. Active swap memory usage

**Observation:** Swap: **7.4G** used, which is a critical indicator.

**What this means:**
- [RAM (Random Access Memory)](https://en.wikipedia.org/wiki/Random-access_memory) is exhausted
- The system is using [swap file](https://en.wikipedia.org/wiki/Memory_paging) on disk
- Memory: approximately 676.5M free memory from total

**Impact:**
- Swap is significantly slower than RAM (100-1000x)
- This causes all applications to slow down
- Increased load on the [disk subsystem](https://en.wikipedia.org/wiki/Disk_array)

**Criticality:** HIGH - this is one of the main causes of performance degradation

#### 3. Numerous Apache processes

**Observation:** The process list shows numerous [Apache](https://en.wikipedia.org/wiki/Apache_HTTP_Server) processes in various states.

**Problems:**
- Each Apache process consumes [memory](https://en.wikipedia.org/wiki/Random-access_memory)
- Too many parallel processes exacerbate RAM shortage
- Some processes are in waiting state

**Possible causes:**
- Non-optimal Apache configuration ([MaxClients](https://httpd.apache.org/docs/2.4/mod/mpm_common.html#maxrequestworkers), [MaxRequestWorkers](https://httpd.apache.org/docs/2.4/mod/mpm_common.html#maxrequestworkers))
- [DDoS attack](https://en.wikipedia.org/wiki/Denial-of-service_attack) or traffic spike
- Slow [PHP](https://en.wikipedia.org/wiki/PHP) scripts holding processes

#### 4. Increased disk activity

**Observation:** The output shows high disk operation activity (processes in I/O state).

**Indicators:**
- Processes in `dirty` state (waiting for disk write)
- Multiple read/write operations
- Possible high I/O wait values

**Causes:**
- Swap usage increases disk activity
- [File system fragmentation](https://en.wikipedia.org/wiki/Fragmentation_(computing))
- Slow disks ([HDD](https://en.wikipedia.org/wiki/Hard_disk_drive) instead of [SSD](https://en.wikipedia.org/wiki/Solid-state_drive))
- High volume of logging

#### 5. Cron processes

**Observation:** Multiple `cron003` and similar processes visible in `idle` or `apache` state.

**Analysis:**
- Multiple [cron jobs](https://en.wikipedia.org/wiki/Cron) can exacerbate load
- Some tasks may execute simultaneously
- Need to check execution schedule

---

## Response to the client

### Dear Client,

Based on analysis of your server monitoring, the following issues have been identified:

#### Current situation

1. **Critical RAM shortage**
   - The server is actively using swap memory (7.4 GB), which slows down all applications by 100-1000x
   - Less than 700 MB of free RAM remains

2. **System overload**
   - Load Average is 33.00, indicating the server cannot handle current load
   - Large number of processes in execution queue

3. **Excessive web server processes**
   - Apache has spawned too many worker processes, intensifying memory shortage
   - Each process holds memory resources

4. **Increased disk subsystem load**
   - Swap usage has increased disk activity
   - This creates additional delays in request processing

### Optimization recommendations

#### Urgent measures (apply immediately)

**1. Increase RAM**
- **Recommendation:** Add minimum 8-16 GB RAM
- **Justification:** This will eliminate swap usage and significantly improve performance
- **Priority:** CRITICAL

**2. Optimize Apache configuration**

Limit the number of concurrent Apache processes. In the configuration file ([httpd.conf](https://httpd.apache.org/docs/2.4/configuring.html) or [apache2.conf](https://httpd.apache.org/docs/2.4/configuring.html)):

```apache
# For MPM Prefork
<IfModule mpm_prefork_module>
    StartServers          5
    MinSpareServers       5
    MaxSpareServers      10
    MaxRequestWorkers    50  # Reduce from current value
    MaxConnectionsPerChild 3000
</IfModule>

# For MPM Worker/Event (more efficient)
<IfModule mpm_event_module>
    StartServers          2
    MinSpareThreads      25
    MaxSpareThreads      75
    ThreadsPerChild      25
    MaxRequestWorkers    50  # Calculate: (RAM * 0.8) / avg_process_size
    MaxConnectionsPerChild 3000
</IfModule>
```

**MaxRequestWorkers calculation:**
```
MaxRequestWorkers = (Available RAM in MB * 0.8) / Average Apache process size
```

For example, with 4 GB RAM and average process size of 50 MB:
```
MaxRequestWorkers = (4096 * 0.8) / 50 ≈ 65
```

**3. Disable or reduce swap priority**

```bash
# Temporarily reduce swap priority
sudo sysctl vm.swappiness=10

# Make change permanent
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
```

**Explanation:** [Swappiness](https://en.wikipedia.org/wiki/Memory_paging) controls how aggressively the system uses swap. Value of 10 minimizes swap, keeping it only for emergencies.

**4. Restart Apache to free memory**

```bash
# Graceful restart to apply new configuration
sudo systemctl reload apache2
# or
sudo apachectl graceful
```

#### Medium-term measures (1-2 weeks)

**5. Switch to more efficient web server**

Consider using [Nginx](https://en.wikipedia.org/wiki/Nginx) as a [reverse proxy](https://en.wikipedia.org/wiki/Reverse_proxy) in front of Apache or complete migration to Nginx + [PHP-FPM](https://www.php.net/manual/en/install.fpm.php):

**Benefits:**
- Nginx consumes 5-10x less memory
- Better handles static content
- More efficient with large number of connections

**Architecture:**
```
Client → Nginx (static + proxy) → PHP-FPM (dynamic content)
```

**6. Optimize PHP applications**

```bash
# Enable OPcache for PHP
# In php.ini:
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
```

**7. Implement caching**

- **[Redis](https://en.wikipedia.org/wiki/Redis)** or **[Memcached](https://en.wikipedia.org/wiki/Memcached)** for application data caching
- **[Varnish](https://en.wikipedia.org/wiki/Varnish_(software))** for HTTP caching
- Application-level caching (pages, database queries)

**8. Analyze and optimize cron jobs**

```bash
# Check all cron jobs
sudo crontab -l
ls -la /etc/cron.*

# Distribute tasks over time, avoiding simultaneous execution
# Add logging to analyze execution time
```

**9. Optimize disk subsystem**

- **Migrate to SSD:** If using HDD, migration to SSD will provide 10-100x improvement
- **File system tuning:** Use [ext4](https://en.wikipedia.org/wiki/Ext4) with `noatime` option
- **Separate logs:** Move logs to separate disk or limit their size

```bash
# In /etc/fstab add noatime to reduce write operations
/dev/sda1  /  ext4  defaults,noatime  0  1
```

#### Long-term measures (planning)

**10. Infrastructure scaling**

**Vertical scaling:**
- Increase RAM to 16-32 GB
- Add CPU cores
- Use SSD NVMe

**Horizontal scaling:**
- [Load balancer](https://en.wikipedia.org/wiki/Load_balancing_(computing)) + multiple web servers
- Separate [database](https://en.wikipedia.org/wiki/Database) server
- [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) for static content

**11. Monitoring and alerting**

Implement monitoring system to prevent similar situations:

- **[Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [Grafana](https://en.wikipedia.org/wiki/Grafana)**: metrics visualization
- **[Zabbix](https://en.wikipedia.org/wiki/Zabbix)** or **[Nagios](https://en.wikipedia.org/wiki/Nagios)**: comprehensive monitoring
- Configure alerts for critical metrics:
  - Load Average > 10
  - Swap usage > 1 GB
  - Free RAM < 500 MB
  - Disk I/O wait > 30%

**12. Regular performance audits**

```bash
# Weekly analysis
- Check Apache logs for slow requests
- Analyze resource usage by time of day
- Identify heavy processes
- Check software updates
```

---

## Action prioritization

### Immediately (today)
1. ✓ Optimize Apache configuration (MaxRequestWorkers)
2. ✓ Reduce swappiness
3. ✓ Graceful restart Apache

### Within a week
4. ✓ Increase server RAM (minimum +8 GB)
5. ✓ Enable PHP OPcache
6. ✓ Analyze and optimize cron jobs

### Within a month
7. ✓ Implement caching (Redis/Memcached)
8. ✓ Migrate to Nginx + PHP-FPM or Nginx as reverse proxy
9. ✓ Migrate to SSD (if using HDD)
10. ✓ Implement monitoring system

---

## Useful diagnostic commands

### Memory usage check

```bash
# General memory information
free -h

# Processes using most memory
ps aux --sort=-%mem | head -10

# Detailed memory information
cat /proc/meminfo

# Check swap
swapon -s
```

### Apache analysis

```bash
# Number of Apache processes
ps aux | grep apache2 | wc -l

# Average Apache process size
ps aux | grep apache2 | awk '{sum+=$6} END {print sum/NR/1024 " MB"}'

# Current MPM configuration
apachectl -V | grep -i mpm

# Apache status
apachectl status
```

### Real-time monitoring

```bash
# Interactive process monitoring
htop

# Disk activity monitoring
iostat -x 2

# Swap usage monitoring
vmstat 2

# I/O analysis by process (requires root)
sudo iotop
```

### System load check

```bash
# Load average and uptime
uptime

# Detailed CPU information
mpstat 1 5

# Check most loaded processes
top -b -n 1 | head -20
```

---

## Expected results after optimization

After applying recommended measures, you will notice:

1. **Significant website speedup** - 5-10x faster after adding RAM and disabling swap
2. **Stability** - Load Average will decrease to acceptable values (< 5)
3. **Fast response** - reduced server response time
4. **Scalability** - ability to handle more concurrent visitors
5. **Predictability** - with monitoring system, you'll know about problems in advance

---

## Additional information

### Useful tools

- **[htop](https://htop.dev/)**: interactive process monitor
- **[iotop](http://guichaz.free.fr/iotop/)**: disk activity monitoring
- **[netdata](https://www.netdata.cloud/)**: real-time monitoring with web interface
- **[apache2buddy](https://github.com/richardforth/apache2buddy)**: script for automatic Apache optimization
- **[MySQLTuner](https://github.com/major/MySQLTuner-perl)**: MySQL optimization

### Reference materials

- [Apache Performance Tuning](https://httpd.apache.org/docs/2.4/misc/perf-tuning.html)
- [Linux Performance](http://www.brendangregg.com/linuxperf.html)
- [PHP Performance Tips](https://www.php.net/manual/en/features.performance.php)

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
