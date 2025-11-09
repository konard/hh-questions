# Question

The server has run out of free space, new files cannot be created, but `df -h` shows that free space is available. Describe the reasons why this could happen.

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The most common cause is [inode](https://en.wikipedia.org/wiki/Inode) exhaustion - when the filesystem runs out of inodes (file metadata structures) even though disk space is available. Other possible causes include: reserved space for root user, filesystem quota limits, read-only filesystem mount, or issues with specific directory limits.

---

## Detailed explanation

When `df -h` shows available disk space but file creation fails, this paradoxical situation typically indicates issues beyond simple disk space shortage.

### 1. Inode exhaustion (most common cause)

**What are inodes?**

[Inodes](https://en.wikipedia.org/wiki/Inode) are data structures in [Unix-like filesystems](https://en.wikipedia.org/wiki/Unix_filesystem) that store metadata about files (permissions, ownership, timestamps, pointers to data blocks). Each file or directory requires exactly one inode, regardless of its size.

**Problem:** The filesystem has a fixed number of inodes allocated during creation. When all inodes are used, no new files can be created even if disk space remains.

**Diagnosis:**

```bash
# Check inode usage
df -i

# Expected output showing inode exhaustion:
# Filesystem      Inodes  IUsed   IFree IUse% Mounted on
# /dev/sda1      6553600 6553600     0  100% /
```

**Finding the culprit:**

```bash
# Find directories with most files (potential inode consumers)
for dir in /*; do
    echo -n "$dir: "
    find "$dir" -type f 2>/dev/null | wc -l
done

# More detailed search in specific directory
find /var -type d -exec sh -c 'echo "$(find "{}" -maxdepth 1 | wc -l) {}"' \; 2>/dev/null | sort -rn | head -20

# Find directories with huge number of small files
du -h --max-depth=2 / 2>/dev/null | grep -E '^[0-9]+K'
```

**Common culprits:**

- Log files in `/var/log` (especially if logrotate misconfigured)
- [Temporary files](https://en.wikipedia.org/wiki/Temporary_file) in `/tmp` or `/var/tmp`
- [Cache files](https://en.wikipedia.org/wiki/Cache_(computing)) (browser caches, application caches)
- Email queues in `/var/spool/mail`
- Session files in `/var/lib/php/sessions` or similar
- [Git](https://en.wikipedia.org/wiki/Git) repositories with many small objects
- [Node.js](https://en.wikipedia.org/wiki/Node.js) `node_modules` directories

**Solution:**

```bash
# Remove unnecessary files
rm -rf /var/log/old-logs/*
rm -rf /tmp/*
rm -rf /var/tmp/*

# Clean package manager caches
apt-get clean  # Debian/Ubuntu
yum clean all  # RedHat/CentOS

# Find and remove empty files
find /var -type f -empty -delete

# Verify inode recovery
df -i
```

**Prevention:**

```bash
# Create filesystem with more inodes
mkfs.ext4 -N 20000000 /dev/sdb1  # Specify inode count

# Or increase bytes-per-inode ratio (more inodes)
mkfs.ext4 -i 4096 /dev/sdb1  # One inode per 4KB (default is often 16KB)
```

### 2. Reserved blocks for root user

**Problem:** [Ext filesystems](https://en.wikipedia.org/wiki/Extended_file_system) reserve 5% of space by default for the [root user](https://en.wikipedia.org/wiki/Superuser) to prevent system failure when disk fills. Regular users cannot use this reserved space.

**Diagnosis:**

```bash
# Check reserved blocks
df -h    # Shows available space for regular users
df -lh   # Shows total space
tune2fs -l /dev/sda1 | grep -i reserved

# Expected output:
# Reserved block count:     327680
# Reserved blocks uid:      0 (user root)
# Reserved blocks gid:      0 (group root)
```

**Verification:**

```bash
# Regular user sees "no space"
touch /testfile
# Error: No space left on device

# Root can still create files
sudo touch /testfile
# Success
```

**Solution:**

```bash
# Reduce reserved space (use cautiously!)
# Reduce from 5% to 2% on non-system partitions
sudo tune2fs -m 2 /dev/sda1

# For data-only partitions (not /, /var, /usr), can reduce to 0%
sudo tune2fs -m 0 /dev/sdb1

# Verify change
sudo tune2fs -l /dev/sda1 | grep -i "reserved"
```

### 3. Disk quotas

**Problem:** [Disk quotas](https://en.wikipedia.org/wiki/Disk_quota) may limit specific users or groups even when system-wide space is available.

**Diagnosis:**

```bash
# Check if quotas are enabled
mount | grep quota
cat /etc/fstab | grep quota

# Check user quota
quota -v
repquota -a

# Check quota details
quota -u username
```

**Solution:**

```bash
# Increase user quota (requires root)
edquota -u username

# Or temporarily disable quotas
quotaoff -a

# Re-enable quotas
quotaon -a
```

### 4. Read-only filesystem

**Problem:** Filesystem mounted as [read-only](https://en.wikipedia.org/wiki/Write_protection) due to errors or deliberate configuration.

**Diagnosis:**

```bash
# Check mount options
mount | grep "ro,"
cat /proc/mounts | grep "ro,"

# Check for filesystem errors in logs
dmesg | grep -i "read-only"
journalctl -xe | grep -i "read-only"
```

**Solution:**

```bash
# Remount as read-write
mount -o remount,rw /

# If filesystem has errors, check and repair
umount /dev/sda1
fsck -y /dev/sda1
mount /dev/sda1
```

### 5. File descriptor limits

**Problem:** System or process [file descriptor](https://en.wikipedia.org/wiki/File_descriptor) limits reached.

**Diagnosis:**

```bash
# Check current limits
ulimit -n   # Current shell
cat /proc/sys/fs/file-max   # System-wide max
cat /proc/sys/fs/file-nr    # Currently open files

# Check per-process limits
lsof | wc -l
lsof -u username | wc -l
```

**Solution:**

```bash
# Increase limits temporarily
ulimit -n 65536

# Permanent change in /etc/security/limits.conf
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# System-wide limit
echo "fs.file-max = 2097152" >> /etc/sysctl.conf
sysctl -p
```

### 6. Bad blocks or filesystem corruption

**Problem:** [Filesystem corruption](https://en.wikipedia.org/wiki/File_system_fragmentation) or [bad blocks](https://en.wikipedia.org/wiki/Bad_sector) preventing writes.

**Diagnosis:**

```bash
# Check filesystem errors
dmesg | grep -i error
journalctl -xe | grep -i "I/O error"

# Check bad blocks
badblocks -v /dev/sda1

# Filesystem check
umount /dev/sda1
fsck -n /dev/sda1  # Non-destructive check
```

**Solution:**

```bash
# Repair filesystem
umount /dev/sda1
fsck -y /dev/sda1

# For serious corruption, backup and recreate
```

### 7. SELinux or AppArmor restrictions

**Problem:** [Security policies](https://en.wikipedia.org/wiki/Security-Enhanced_Linux) preventing file creation.

**Diagnosis:**

```bash
# Check SELinux status
getenforce
sestatus

# Check denials
ausearch -m avc -ts recent
grep "denied" /var/log/audit/audit.log

# AppArmor
aa-status
dmesg | grep -i apparmor
```

**Solution:**

```bash
# Temporarily disable (for testing only!)
setenforce 0  # SELinux
systemctl stop apparmor  # AppArmor

# Better: fix policy or context
chcon -R -t proper_type /path
restorecon -R /path
```

### 8. Directory entry limits

**Problem:** Some filesystems have limits on directory entries (though rare in modern systems).

**Diagnosis:**

```bash
# Check files in directory
ls -la | wc -l

# For ext3/ext4, check dir_index feature
tune2fs -l /dev/sda1 | grep dir_index
```

**Solution:**

```bash
# Enable dir_index for better large directory handling
tune2fs -O dir_index /dev/sda1
e2fsck -D /dev/sda1  # Optimize directories
```

### 9. Specific partition or mount point full

**Problem:** Writing to wrong partition that is actually full.

**Diagnosis:**

```bash
# Check all mounted filesystems
df -h
df -h /path/to/target/directory

# Find which filesystem a path belongs to
df -h $(dirname /path/to/file)

# Check mount points
mount | column -t
lsblk
```

### Diagnostic workflow

**Step 1: Check basic disk usage**
```bash
df -h     # Space usage
df -i     # Inode usage
```

**Step 2: Check mount status**
```bash
mount | grep $(df /path | tail -1 | awk '{print $1}')
```

**Step 3: Check permissions and quotas**
```bash
quota -v
sudo touch /testfile  # Test as root
```

**Step 4: Check system logs**
```bash
dmesg | tail -50
journalctl -xe
grep -i "error\|fail" /var/log/syslog
```

**Step 5: Test file creation with verbose error**
```bash
strace touch /testfile 2>&1 | grep -i "error\|fail"
```

### Complete troubleshooting checklist

1. ✓ Check inode usage: `df -i`
2. ✓ Verify reserved blocks: `tune2fs -l /dev/sda1`
3. ✓ Check disk quotas: `quota -v`
4. ✓ Verify filesystem is writable: `mount | grep ro`
5. ✓ Check file descriptor limits: `ulimit -a`
6. ✓ Review system logs: `dmesg` and `journalctl`
7. ✓ Test with root privileges: `sudo touch /testfile`
8. ✓ Check SELinux/AppArmor: `getenforce`, `aa-status`
9. ✓ Verify correct partition: `df -h /path`
10. ✓ Check filesystem integrity: `fsck -n /dev/sda1`

### Prevention and monitoring

**Set up monitoring:**

```bash
# Nagios/Icinga check
check_disk -w 20% -c 10% -W 20% -K 10%  # Warn on space AND inode usage

# Prometheus node_exporter provides metrics:
# - node_filesystem_avail_bytes
# - node_filesystem_files (total inodes)
# - node_filesystem_files_free

# Simple monitoring script
cat > /usr/local/bin/check_inodes.sh << 'EOF'
#!/bin/bash
THRESHOLD=90
df -i | awk 'NR>1 {gsub("%","",$5); if($5>threshold) print $1" inode usage: "$5"%"}' threshold=$THRESHOLD
EOF
chmod +x /usr/local/bin/check_inodes.sh

# Add to crontab
echo "0 * * * * /usr/local/bin/check_inodes.sh" | crontab -
```

**Best practices:**

- Monitor both disk space AND inode usage
- Set up alerts at 80% and 90% thresholds
- Implement log rotation ([logrotate](https://linux.die.net/man/8/logrotate))
- Regularly clean temporary files
- Archive old logs instead of deleting
- Use separate partitions for `/var`, `/tmp`, `/home`
- When creating filesystems, estimate file count and adjust inode ratio

### Useful commands summary

```bash
# Diagnosis
df -h                           # Disk space
df -i                           # Inode usage
df -Th                          # Include filesystem type
mount | grep ro                 # Read-only mounts
tune2fs -l /dev/sda1            # Filesystem parameters
quota -v                        # User quotas
lsof | wc -l                    # Open file count
dmesg | tail                    # System messages

# Finding large consumers
du -sh /*                       # Top-level directory sizes
find / -type f -size +100M      # Large files
find / -type f | wc -l          # Total file count
find / -xdev -type f | cut -d "/" -f 2 | sort | uniq -c | sort -rn  # Files per top directory

# Cleanup
apt-get autoclean               # Clean package cache
journalctl --vacuum-time=7d     # Clean old journal logs
find /tmp -type f -atime +7 -delete  # Old temp files
find /var/log -name "*.gz" -delete   # Compressed old logs
```

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
