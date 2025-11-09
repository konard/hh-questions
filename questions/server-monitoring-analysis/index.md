# Question

What is happening on the server based on the screenshot below? Describe in a client-facing response format, and if you have optimization suggestions, please include them.

![Server Monitoring Screenshot](https://drive.google.com/file/d/1fgJaftjv53xCN7vgiJOaQlbfWkUqPgyd/view?usp=share_link)

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The server shows high CPU load (up to 76% on some cores), intensive network activity with multiple curl processes, and normal disk utilization. Optimization needed: streamline parallel HTTP requests, investigate the purpose of these processes, and consider asynchronous processing.

---

## Detailed explanation

Based on the provided [server monitoring](https://en.wikipedia.org/wiki/System_monitor) [screenshot](https://en.wikipedia.org/wiki/Screenshot), we can conduct a detailed analysis of the current system state.

### Current State Analysis

#### 1. CPU Load (top)

**Observed metrics:**

The top section shows output from the [`top`](https://en.wikipedia.org/wiki/Top_(software)) command, displaying [CPU](https://en.wikipedia.org/wiki/Central_processing_unit) load per [core](https://en.wikipedia.org/wiki/Multi-core_processor):

- **CPU 0**: 39% sys, 24% user (total load ~63%)
- **CPU 1**: 76% sys, 24% user (total load ~100%, nearly maxed out)
- **CPU 2**: 7% sys, 2% user (low load)
- **CPU 3-5**: Fluctuating between 1% and 13%

**What this means:**
- Uneven [load distribution](https://en.wikipedia.org/wiki/Load_balancing_(computing)) across cores
- High **sys** (system) time indicates intensive [system calls](https://en.wikipedia.org/wiki/System_call), likely related to [network I/O](https://en.wikipedia.org/wiki/Network_socket) or [filesystem](https://en.wikipedia.org/wiki/File_system) operations
- [Processes](https://en.wikipedia.org/wiki/Process_(computing)) may not be optimized to utilize all available cores

#### 2. Active Processes

**Key observation:**

Multiple [`curl`](https://en.wikipedia.org/wiki/CURL) processes (or similar ones named `curseal`, `curl1`, `curl2`, `curl3`) running simultaneously:

```
user  curl 2.49GHz  curseal  7%
user  curl 2.49GHz  curseal  7%
user  curl 2.49GHz  curseal  7%
user  curl 2.49GHz  curseal  7%
user  curl 2.49GHz  curseal  7%
(and several more similar processes)
```

**Interpretation:**
- The server is executing multiple [HTTP requests](https://en.wikipedia.org/wiki/HTTP) concurrently
- This could be a [data scraper](https://en.wikipedia.org/wiki/Web_scraping), [web crawler](https://en.wikipedia.org/wiki/Web_crawler), external [API](https://en.wikipedia.org/wiki/API) integration system, or [availability monitoring](https://en.wikipedia.org/wiki/Website_monitoring) for external services
- Each process consumes approximately 7% CPU, creating substantial load when running multiple instances

#### 3. Memory and Swap

**Observed metrics:**

```
Mem: tot 19.5G  free 9.5G
swap tot 0  used 0
```

**Interpretation:**
- [RAM](https://en.wikipedia.org/wiki/Random-access_memory): 19.5 GB total, 9.5 GB free (~50% utilized)
- [Swap](https://en.wikipedia.org/wiki/Memory_paging) is disabled or not configured (0)
- Memory usage is normal, no RAM shortage issues
- Lack of swap could be risky during sudden memory spikes

#### 4. Network Activity

**Observed metrics from [`iostat`](https://en.wikipedia.org/wiki/Iostat) or similar output:**

```
NET transport  tcpi  620  tcpo  260  udpi  0  udpo  0
NET transport  pcki  404  pcko  360  erri  0  erro  0
```

**Interpretation:**
- Active [TCP traffic](https://en.wikipedia.org/wiki/Transmission_Control_Protocol): 620 packets incoming, 260 outgoing
- No [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol) traffic
- No transmission errors (erri/erro = 0)
- Confirms active [HTTP/HTTPS](https://en.wikipedia.org/wiki/HTTPS) request activity

**Bandwidth:**

```
Kib/s  28   MiB/s  2.90   MiB/s  0.83
Kib/s   0     2      2      7
```

- Incoming traffic: ~2.90 MB/s
- Outgoing traffic: ~0.83 MB/s
- Moderate but steady traffic

#### 5. Disk Subsystem

**Observed metrics from [`df`](https://en.wikipedia.org/wiki/Df_(Unix)):**

Several mounted [filesystems](https://en.wikipedia.org/wiki/File_system) visible:

- `/dev/sda1`: 652K used, sufficient free space
- Various [tmpfs](https://en.wikipedia.org/wiki/Tmpfs) and virtual filesystems
- [Docker](https://en.wikipedia.org/wiki/Docker_(software)) overlay filesystems (redis-server, http, postgresql, eventsio)

**Interpretation:**
- Server uses [containerization](https://en.wikipedia.org/wiki/OS-level_virtualization) (Docker)
- Running services: [Redis](https://en.wikipedia.org/wiki/Redis), [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL), HTTP server
- Disk usage is normal, no [disk space](https://en.wikipedia.org/wiki/Disk_storage) issues

### Client-Facing Response Format

---

**Subject: Server Performance Analysis**

Dear Client,

We have analyzed the current state of your server based on the provided monitoring data. Here are the main findings:

**Current System State:**

1. **CPU Load**: Uneven CPU core utilization is observed, with maximum load reaching 100% on the second core. The primary load is related to system calls (up to 76% system time), which is typical for intensive I/O operations.

2. **Active Processes**: Multiple concurrent curl/curseal processes have been detected, each executing HTTP requests to external resources. This is the primary source of current server load.

3. **Memory Resources**: RAM utilization is within normal range (approximately 50% of 19.5 GB). No critical memory issues detected.

4. **Network Activity**: Stable HTTP/HTTPS traffic at approximately 2.90 MB/s incoming and 0.83 MB/s outgoing. No data transmission errors detected.

5. **Disk Subsystem**: Disk usage is normal. The server uses Docker containers for service isolation (Redis, PostgreSQL, HTTP).

**Overall Assessment**: The server is operating stably, but there are opportunities to optimize the handling of multiple HTTP requests.

---

### Optimization Recommendations

#### 1. Optimize Parallel HTTP Requests

**Issue**: Multiple concurrent curl processes create excessive CPU load.

**Solutions:**

- **Batch Processing**: Combine multiple requests into one or use [HTTP/2 multiplexing](https://en.wikipedia.org/wiki/HTTP/2) to send multiple requests through a single connection

- **Asynchronous Requests**: Instead of launching separate curl processes, use asynchronous HTTP clients:
  - [Python aiohttp](https://docs.aiohttp.org/)
  - [Node.js with async/await](https://nodejs.org/)
  - [Go goroutines](https://go.dev/)

- **Limit Parallelism**: Set a maximum number of concurrent requests (e.g., 5-10 instead of current ~15-20):
  ```bash
  # Example with GNU parallel
  cat urls.txt | parallel -j 10 curl {}
  ```

- **Use Connection Pooling**: Reuse [TCP connections](https://en.wikipedia.org/wiki/Transmission_Control_Protocol) to reduce overhead of establishing new connections

#### 2. CPU Load Balancing

**Issue**: Uneven load distribution across cores.

**Solutions:**

- Check [CPU affinity](https://en.wikipedia.org/wiki/Processor_affinity) settings for processes
- Use [worker pool pattern](https://en.wikipedia.org/wiki/Thread_pool) with number of workers equal to CPU cores
- Configure [NUMA](https://en.wikipedia.org/wiki/Non-uniform_memory_access) balancing if server has multi-processor architecture

#### 3. Data Caching

**If HTTP requests fetch data that changes infrequently:**

- Implement application-level [caching](https://en.wikipedia.org/wiki/Cache_(computing)) using the already installed Redis:
  ```python
  # Pseudo-code example
  if data := redis.get(cache_key):
      return data
  else:
      data = fetch_from_api()
      redis.setex(cache_key, ttl=3600, value=data)
      return data
  ```

- Use [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) with ETag/If-Modified-Since headers to reduce transferred data volume

#### 4. Monitoring and Alerting

**Recommendations:**

- Set up continuous monitoring of key metrics:
  - CPU usage per core
  - Number of active curl processes
  - Network throughput
  - HTTP request latencies

- Monitoring tools:
  - [Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [Grafana](https://en.wikipedia.org/wiki/Grafana)
  - [Netdata](https://www.netdata.cloud/)
  - [Zabbix](https://en.wikipedia.org/wiki/Zabbix)

- Configure alerts for:
  - CPU usage > 80% for more than 5 minutes
  - Number of curl processes > threshold value
  - Network errors > 0

#### 5. Configure Swap

**Issue**: Lack of swap could lead to problems during memory usage spikes.

**Solution:**

- Create a 2-4 GB swap file as a safety buffer:
  ```bash
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

- Set [swappiness](https://en.wikipedia.org/wiki/Memory_paging#Swappiness) to a low value (10-20) to minimize usage:
  ```bash
  sudo sysctl vm.swappiness=10
  ```

#### 6. Network Settings Optimization

**For high network activity:**

- Increase network buffer limits in [`sysctl`](https://en.wikipedia.org/wiki/Sysctl):
  ```bash
  net.core.rmem_max = 134217728
  net.core.wmem_max = 134217728
  net.ipv4.tcp_rmem = 4096 87380 67108864
  net.ipv4.tcp_wmem = 4096 65536 67108864
  ```

- Optimize [TCP parameters](https://en.wikipedia.org/wiki/Transmission_Control_Protocol) to reduce latency:
  ```bash
  net.ipv4.tcp_fin_timeout = 15
  net.ipv4.tcp_tw_reuse = 1
  net.core.netdev_max_backlog = 5000
  ```

#### 7. Logging and Debugging

**To understand the nature of curl processes:**

- Add detailed logging for all HTTP requests with metrics:
  - Request URL
  - Execution time
  - Response code
  - Data size

- Use [distributed tracing](https://en.wikipedia.org/wiki/Tracing_(software)) ([OpenTelemetry](https://opentelemetry.io/), [Jaeger](https://www.jaegertracing.io/)) to visualize request chains

### Optimization Checklist

- ✓ Identify the purpose of curl processes and verify necessity of all requests
- ✓ Implement HTTP request parallelism limit (up to 10 concurrent)
- ✓ Implement caching of frequently requested data in Redis
- ✓ Migrate to asynchronous request processing instead of separate processes
- ✓ Set up monitoring of key metrics with alerts
- ✓ Create swap file as safety net
- ✓ Optimize kernel network parameters
- ✓ Implement detailed performance logging

### Action Prioritization

**Immediate (within a day):**
1. Limit number of concurrent curl processes
2. Add logging to understand usage patterns
3. Set up basic CPU and process monitoring

**Short-term (within a week):**
1. Implement Redis caching
2. Configure swap
3. Create monitoring dashboard in Grafana

**Medium-term (within a month):**
1. Rewrite request system to asynchronous architecture
2. Optimize network parameters
3. Implement distributed tracing

### Expected Optimization Results

After implementing the proposed measures, expect:

- 40-60% reduction in CPU load
- Improved evenness of load distribution across cores
- 2-3x reduction in concurrent processes
- 20-40% reduction in network traffic through caching
- Increased system resilience

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
