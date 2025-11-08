# Question

Is the `iostat -x` command sufficient to assess the real disk load?

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The `iostat -x` command provides important disk subsystem metrics, but is insufficient for comprehensive real disk load assessment. Additional tools are needed: `iotop` for process analysis, `blktrace` for detailed I/O tracing, application-level monitoring, and storage configuration verification.

---

## Detailed explanation

The [`iostat -x`](https://linux.die.net/man/1/iostat) command is an essential tool for monitoring [disk subsystem](https://en.wikipedia.org/wiki/Hard_disk_drive) performance, but has limitations when assessing real [disk](https://en.wikipedia.org/wiki/Computer_data_storage) load.

### 1. What iostat -x shows

The `iostat -x` command provides extended [statistics](https://en.wikipedia.org/wiki/Statistics) for [I/O device](https://en.wikipedia.org/wiki/Input/output) performance.

**Basic metrics:**

```bash
iostat -x 1 5  # Update every second, 5 iterations
```

**Key indicators:**

- **`%util`**: Percentage of time the device was busy processing requests (utilization)
- **`await`**: Average wait time for [I/O operations](https://en.wikipedia.org/wiki/Input/output) (in milliseconds)
- **`r_await` / `w_await`**: Average wait time for read/write operations separately
- **`avgqu-sz`**: Average [queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)) size of requests to the device
- **`avgrq-sz`**: Average request size in [sectors](https://en.wikipedia.org/wiki/Disk_sector)
- **`r/s` and `w/s`**: Number of read and write operations per second
- **`rkB/s` and `wkB/s`**: Read and write speed in kilobytes per second

### 2. Advantages of iostat -x

**Quick diagnostics:**
- Shows disk utilization in real-time
- Identifies bottlenecks in the disk subsystem
- Simple to use and interpret basic metrics
- Built into most [Linux](https://en.wikipedia.org/wiki/Linux) distributions (`sysstat` package)

**Example analysis:**

```bash
Device  r/s    w/s    rkB/s    wkB/s  await  %util
sda     120.0  45.0   4800.0   1800.0  12.5   95.2
```

In this example:
- High utilization (95.2%) indicates intensive load
- Wait time of 12.5 ms may indicate performance issues
- Read operations dominate writes (120 vs 45 ops/sec)

### 3. Limitations of iostat -x

**Lack of process-level details:**
- `iostat` shows aggregated statistics per device
- Doesn't show which [processes](https://en.wikipedia.org/wiki/Process_(computing)) generate the load
- Cannot identify specific [applications](https://en.wikipedia.org/wiki/Application_software) causing issues

**Limited %util accuracy on modern disks:**
- For [SSDs](https://en.wikipedia.org/wiki/Solid-state_drive) and [NVMe](https://en.wikipedia.org/wiki/NVM_Express) devices, %util is less informative
- Modern disks support [parallel operations](https://en.wikipedia.org/wiki/Parallel_computing), %util may show 100% while capacity remains
- For [RAID](https://en.wikipedia.org/wiki/RAID) arrays, the metric may be inaccurate

**Missing I/O type information:**
- Doesn't distinguish [sequential](https://en.wikipedia.org/wiki/Sequential_access) from [random access](https://en.wikipedia.org/wiki/Random_access)
- Doesn't show detailed I/O block sizes
- No information about [synchronous](https://en.wikipedia.org/wiki/Synchronization_(computer_science)) vs [asynchronous](https://en.wikipedia.org/wiki/Asynchrony_(computer_programming)) operations

**Block device level statistics:**
- Doesn't account for [file system](https://en.wikipedia.org/wiki/File_system) level caching
- Doesn't show kernel [page cache](https://en.wikipedia.org/wiki/Page_cache) metrics
- Missing information about [disk quotas](https://en.wikipedia.org/wiki/Disk_quota)

### 4. Additional tools for complete assessment

For comprehensive disk load assessment, additional tools are necessary.

#### 4.1. iotop - Process I/O monitoring

[`iotop`](https://linux.die.net/man/1/iotop) shows which processes perform I/O operations.

```bash
# Installation
sudo apt-get install iotop  # Debian/Ubuntu
sudo yum install iotop      # RHEL/CentOS

# Usage
sudo iotop -o  # Shows only processes with I/O activity
sudo iotop -P  # Shows processes instead of threads
```

**What it shows:**
- Read/write speed for each process
- Percentage of time in [swap](https://en.wikipedia.org/wiki/Memory_paging) operations
- I/O priority ([ionice](https://linux.die.net/man/1/ionice))
- [PID](https://en.wikipedia.org/wiki/Process_identifier), user, command

#### 4.2. blktrace - Detailed I/O tracing

[`blktrace`](https://linux.die.net/man/8/blktrace) provides detailed information about I/O operations at the [block layer](https://en.wikipedia.org/wiki/Device_file#Block_devices) level.

```bash
# Installation
sudo apt-get install blktrace

# Data collection
sudo blktrace -d /dev/sda -o trace

# Analysis with blkparse
blkparse -i trace

# Or use btrace for real-time output
sudo btrace /dev/sda
```

**Capabilities:**
- Tracking each individual I/O operation
- Analyzing delays at different request processing stages
- Understanding access patterns (sequential vs random)
- Identifying [I/O scheduler](https://en.wikipedia.org/wiki/I/O_scheduling) issues

#### 4.3. sar - Historical data

The [`sar`](https://linux.die.net/man/1/sar) command from the `sysstat` package collects historical system performance data.

```bash
# Disk statistics for today
sar -d

# Statistics from specific time
sar -d -f /var/log/sa/sa15  # Data for the 15th

# I/O and transfer rate statistics
sar -b 1 10  # Every second, 10 times
```

**Advantages:**
- Analyzing historical trends
- Correlating with other system metrics
- Identifying load patterns over time

#### 4.4. pidstat - Process statistics

[`pidstat`](https://linux.die.net/man/1/pidstat) from the `sysstat` package shows resource usage statistics by processes.

```bash
# I/O statistics for all processes
pidstat -d 1

# For specific process
pidstat -d -p <PID> 1
```

#### 4.5. File system level checks

**[Inode](https://en.wikipedia.org/wiki/Inode) usage:**
```bash
df -i  # Check inode usage
```

**Open files check:**
```bash
lsof | wc -l              # Total open files count
lsof /path/to/mount       # Files on specific filesystem
cat /proc/sys/fs/file-nr  # System open file descriptors
```

#### 4.6. Storage-specific tools

**For [LVM](https://en.wikipedia.org/wiki/Logical_Volume_Manager_(Linux)):**
```bash
lvs -o +lv_read_ahead,lv_kernel_read_ahead
dmsetup status
```

**For RAID:**
```bash
cat /proc/mdstat           # Software RAID
megacli -LDInfo -Lall -aALL  # For hardware RAID (LSI/Avago adapters)
```

**For [NFS](https://en.wikipedia.org/wiki/Network_File_System):**
```bash
nfsiostat                  # I/O statistics for NFS
nfsstat -c                 # NFS client statistics
```

### 5. Comprehensive approach to load assessment

For a complete picture, multi-level analysis is needed:

**Level 1 - Quick diagnostics:**
```bash
# Current disk state
iostat -x 1 5

# Current I/O processes
sudo iotop -o

# Check free space
df -h
```

**Level 2 - Detailed analysis:**
```bash
# Historical data
sar -d

# Processes with details
pidstat -d 1

# Check queues and scheduler
cat /sys/block/sda/queue/scheduler
cat /sys/block/sda/queue/nr_requests
```

**Level 3 - In-depth diagnostics:**
```bash
# I/O operation tracing
sudo blktrace -d /dev/sda -o trace &
sleep 60
killall blktrace
blkparse -i trace > trace.txt

# System call analysis for specific process
sudo strace -e trace=read,write,open,close -p <PID>

# Profiling with perf
sudo perf record -e block:* -a sleep 30
sudo perf report
```

### 6. Result interpretation

**Signs of disk performance problems:**

| Metric | Normal | Problem | Possible cause |
|--------|--------|---------|----------------|
| `%util` | < 70% | > 90% | Disk overloaded |
| `await` | < 10 ms (SSD) <br> < 20 ms (HDD) | > 50 ms | High I/O latency |
| `avgqu-sz` | < 4 | > 10 | Large request queue |
| `r_await` vs `w_await` | Comparable | Strong imbalance | Unbalanced load |

**Important nuances:**

1. **SSD vs HDD**: For [SSDs](https://en.wikipedia.org/wiki/Solid-state_drive), normal `await` values should be < 10 ms, for [HDDs](https://en.wikipedia.org/wiki/Hard_disk_drive) values up to 20-30 ms are acceptable
2. **Random vs sequential access**: [HDDs](https://en.wikipedia.org/wiki/Hard_disk_drive) are extremely sensitive to random access
3. **RAID configuration**: [RAID 5/6](https://en.wikipedia.org/wiki/RAID) has poor write performance due to [parity](https://en.wikipedia.org/wiki/Parity_bit) calculations
4. **Virtualization**: In [virtual machines](https://en.wikipedia.org/wiki/Virtual_machine), metrics may be distorted due to the [hypervisor](https://en.wikipedia.org/wiki/Hypervisor)

### 7. Practical diagnostic example

**Scenario**: Complaints about slow [database](https://en.wikipedia.org/wiki/Database) performance.

**Step 1 - Check overall load:**
```bash
iostat -x 1 5
```
Result: `%util` for `/dev/sda` - 98%, `await` - 85 ms

**Step 2 - Identify processes:**
```bash
sudo iotop -o
```
Result: `mysqld` process generates 90% of disk load

**Step 3 - Analyze operation types:**
```bash
pidstat -d -p $(pgrep mysqld) 1
```
Result: Write operations dominate (60% write, 40% read)

**Step 4 - Check disk configuration:**
```bash
cat /sys/block/sda/queue/scheduler
cat /sys/block/sda/queue/rotational
```
Result: Using `cfq` scheduler, disk is [HDD](https://en.wikipedia.org/wiki/Hard_disk_drive) (rotational=1)

**Conclusions:**
- Database creates high write load
- [HDD](https://en.wikipedia.org/wiki/Hard_disk_drive) cannot handle the load
- Recommendations: migrate to [SSD](https://en.wikipedia.org/wiki/Solid-state_drive), optimize database queries, configure caching

### 8. Monitoring and alerting

For proactive performance management, continuous monitoring is necessary:

**Monitoring systems:**
- [Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [node_exporter](https://github.com/prometheus/node_exporter) for metrics collection
- [Grafana](https://en.wikipedia.org/wiki/Grafana) for visualization
- [Zabbix](https://en.wikipedia.org/wiki/Zabbix) for comprehensive monitoring
- [Netdata](https://www.netdata.cloud/) for real-time monitoring

**Key metrics for alerts:**
- `%util > 80%` for 5 minutes
- `await > 50 ms` for SSD or `> 100 ms` for HDD
- `avgqu-sz > 8` consistently
- Rapid growth in I/O operation count

### Conclusion

The `iostat -x` command is a **basic but insufficient** tool for complete disk load assessment. For comprehensive analysis, you need to:

1. ✓ Use `iostat -x` for initial diagnostics
2. ✓ Apply `iotop` to identify load-generating processes
3. ✓ Use `blktrace` for detailed I/O pattern analysis
4. ✓ Analyze historical data with `sar`
5. ✓ Check storage system configuration (RAID, LVM, schedulers)
6. ✓ Consider disk type (SSD vs HDD) when interpreting results
7. ✓ Implement continuous monitoring system for proactive management

Only a comprehensive approach using multiple tools provides a true understanding of disk subsystem load and identifies performance bottlenecks.

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
