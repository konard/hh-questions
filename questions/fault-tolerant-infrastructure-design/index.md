# Question

A client requests a fault-tolerant solution with 99.9% SLA for 7 websites (Nginx, PHP, MySQL, Redis, Memcached), static content occupies 10TB and will grow to 50TB during the year, each database occupies 50GB. Propose a solution and describe the technical implementation for the client.

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

To achieve 99.9% SLA, redundant infrastructure with [load balancing](https://en.wikipedia.org/wiki/Load_balancing_(computing)), [database replication](https://en.wikipedia.org/wiki/Replication_(computing)), [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) for static content, and [monitoring](https://en.wikipedia.org/wiki/System_monitoring) is required. Recommended: cloud platform with [auto-scaling](https://en.wikipedia.org/wiki/Autoscaling), object storage for static content, MySQL master-slave replication with automatic failover, and Redis/Memcached clustering.

---

## Detailed explanation

Designing a [fault-tolerant](https://en.wikipedia.org/wiki/Fault_tolerance) infrastructure with [SLA](https://en.wikipedia.org/wiki/Service-level_agreement) 99.9% requires a comprehensive approach to ensuring high availability at all levels.

### Requirements analysis

**Current parameters:**
- 7 websites ([Nginx](https://en.wikipedia.org/wiki/Nginx), [PHP](https://en.wikipedia.org/wiki/PHP), [MySQL](https://en.wikipedia.org/wiki/MySQL), [Redis](https://en.wikipedia.org/wiki/Redis), [Memcached](https://en.wikipedia.org/wiki/Memcached))
- 10 TB static content (growing to 50 TB in one year)
- 7 databases of 50 GB each (350 GB total)
- SLA 99.9% = maximum 8.76 hours downtime per year (or ~43 minutes per month)

**Key challenges:**
- Scaling static content (5x growth in one year)
- Ensuring high availability of all components
- Eliminating single points of failure ([SPOF](https://en.wikipedia.org/wiki/Single_point_of_failure))

### Solution architecture

#### 1. Web servers and application layer

**Components:**
- [Load Balancer](https://en.wikipedia.org/wiki/Load_balancing_(computing)) (fault-tolerant pair)
- Minimum 2-3 web servers per site (Nginx + PHP-FPM)
- [Auto-scaling](https://en.wikipedia.org/wiki/Autoscaling) groups for handling peak loads

**Technical details:**

```nginx
# Upstream configuration for fault tolerance
upstream backend {
    least_conn;
    server web1.example.com:80 max_fails=3 fail_timeout=30s;
    server web2.example.com:80 max_fails=3 fail_timeout=30s;
    server web3.example.com:80 max_fails=3 fail_timeout=30s backup;
}

# Health checks
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

**Load balancer solutions:**
- [HAProxy](https://en.wikipedia.org/wiki/HAProxy) or [Nginx](https://en.wikipedia.org/wiki/Nginx) in load balancing mode
- [Keepalived](https://www.keepalived.org/) for [VRRP](https://en.wikipedia.org/wiki/Virtual_Router_Redundancy_Protocol) (virtual IP)
- [Health checks](https://en.wikipedia.org/wiki/Health_check) for automatic exclusion of failed servers
- Cloud alternatives: [AWS ALB/NLB](https://aws.amazon.com/elasticloadbalancing/), [Azure Load Balancer](https://azure.microsoft.com/services/load-balancer/), [Google Cloud Load Balancing](https://cloud.google.com/load-balancing)

**PHP-FPM optimization:**
```ini
; /etc/php-fpm.d/www.conf
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

#### 2. MySQL database

**Architecture:**
- [Master-Slave replication](https://en.wikipedia.org/wiki/Replication_(computing)) (1 master + minimum 2 slaves per DB)
- [Multi-master replication](https://en.wikipedia.org/wiki/Multi-master_replication) for critical data (optional)
- Automatic [failover](https://en.wikipedia.org/wiki/Failover) on master failure

**Replication management solutions:**

**[MySQL Group Replication](https://dev.mysql.com/doc/refman/8.0/en/group-replication.html):**
```sql
-- Group Replication setup
SET SQL_LOG_BIN=0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'password' REQUIRE SSL;
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN=1;

-- my.cnf configuration
[mysqld]
server_id=1
gtid_mode=ON
enforce_gtid_consistency=ON
binlog_checksum=NONE
log_bin=binlog
log_slave_updates=ON
binlog_format=ROW
```

**Alternative solutions:**
- [Percona XtraDB Cluster](https://www.percona.com/software/mysql-database/percona-xtradb-cluster) - synchronous multi-master replication
- [MariaDB Galera Cluster](https://mariadb.com/kb/en/what-is-mariadb-galera-cluster/) - cluster with synchronous replication
- [MySQL InnoDB Cluster](https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html) - built-in solution from Oracle
- Managed cloud solutions:
  - [AWS RDS Multi-AZ](https://aws.amazon.com/rds/features/multi-az/) with automatic failover
  - [Azure Database for MySQL](https://azure.microsoft.com/services/mysql/) with zone-redundant HA
  - [Google Cloud SQL](https://cloud.google.com/sql) with regional HA

**Automatic failover with ProxySQL:**
```sql
-- ProxySQL configuration for automatic failover
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES
(10, 'mysql-master', 3306),
(20, 'mysql-slave1', 3306),
(20, 'mysql-slave2', 3306);

INSERT INTO mysql_replication_hostgroups VALUES (10,20,'read_only','Group Replication');
```

**Backups:**
- Daily [full backups](https://en.wikipedia.org/wiki/Backup) ([mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html) or [Percona XtraBackup](https://www.percona.com/software/mysql-database/percona-xtrabackup))
- Incremental backups every 6 hours
- [Point-in-time recovery](https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery.html) via binary logs
- Backup storage in different geographic zones
- Regular restore testing

```bash
# Example automated backup with Percona XtraBackup
#!/bin/bash
BACKUP_DIR="/backup/mysql/$(date +%Y%m%d)"
xtrabackup --backup --target-dir=$BACKUP_DIR --user=backup --password=xxx
xtrabackup --prepare --target-dir=$BACKUP_DIR
# Upload to object storage
aws s3 sync $BACKUP_DIR s3://backups/mysql/$(date +%Y%m%d)/
```

#### 3. Caching (Redis and Memcached)

**Redis architecture:**
- [Redis Sentinel](https://redis.io/topics/sentinel) for automatic failover
- [Redis Cluster](https://redis.io/topics/cluster-tutorial) for horizontal scaling
- Minimum 3 nodes for quorum

**Redis Sentinel configuration:**
```conf
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
```

**Redis master configuration:**
```conf
# redis.conf
bind 0.0.0.0
port 6379
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

**Memcached architecture:**
- Multiple nodes with [consistent hashing](https://en.wikipedia.org/wiki/Consistent_hashing)
- Client-side scaling (libmemcached with consistent hashing)

```php
// PHP client with consistent hashing
$memcached = new Memcached('persistent_pool');
$memcached->setOption(Memcached::OPT_DISTRIBUTION, Memcached::DISTRIBUTION_CONSISTENT);
$memcached->setOption(Memcached::OPT_LIBKETAMA_COMPATIBLE, true);
$memcached->addServers([
    ['memcached1', 11211, 33],
    ['memcached2', 11211, 33],
    ['memcached3', 11211, 34],
]);
```

**Cloud alternatives:**
- [AWS ElastiCache](https://aws.amazon.com/elasticache/) (Redis/Memcached)
- [Azure Cache for Redis](https://azure.microsoft.com/services/cache/)
- [Google Cloud Memorystore](https://cloud.google.com/memorystore)

#### 4. Static content (10TB → 50TB)

**Recommended solution:**
- [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) ([CloudFlare](https://en.wikipedia.org/wiki/Cloudflare), [AWS CloudFront](https://aws.amazon.com/cloudfront/), [Akamai](https://en.wikipedia.org/wiki/Akamai_Technologies))
- [Object storage](https://en.wikipedia.org/wiki/Object_storage) ([AWS S3](https://aws.amazon.com/s3/), [Azure Blob Storage](https://azure.microsoft.com/services/storage/blobs/), [Google Cloud Storage](https://cloud.google.com/storage))
- Cache invalidation via API

**AWS S3 + CloudFront example:**
```bash
# Create S3 bucket with versioning
aws s3api create-bucket --bucket static-content-prod --region us-east-1
aws s3api put-bucket-versioning --bucket static-content-prod \
    --versioning-configuration Status=Enabled

# Configure lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration --bucket static-content-prod \
    --lifecycle-configuration file://lifecycle.json

# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cf-config.json
```

**Lifecycle policy for optimization (lifecycle.json):**
```json
{
  "Rules": [
    {
      "Id": "Move old versions to Glacier",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Alternatives:**
- Self-hosted solution: [GlusterFS](https://en.wikipedia.org/wiki/GlusterFS) or [Ceph](https://en.wikipedia.org/wiki/Ceph_(software)) + Nginx caching
- [MinIO](https://min.io/) - S3-compatible object storage (self-hosted)

**Nginx caching for CDN-like behavior:**
```nginx
proxy_cache_path /data/nginx/cache levels=1:2 keys_zone=static_cache:100m
                 max_size=10g inactive=60d use_temp_path=off;

server {
    location /static/ {
        proxy_cache static_cache;
        proxy_cache_valid 200 60d;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_pass http://s3_backend;
    }
}
```

#### 5. Network architecture and security

**Components:**
- [Multi-AZ deployment](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html) (multiple availability zones)
- [Private/Public subnet](https://en.wikipedia.org/wiki/Subnetwork) separation
- [Firewall](https://en.wikipedia.org/wiki/Firewall_(computing)) and [Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [DDoS protection](https://en.wikipedia.org/wiki/DDoS_mitigation) ([AWS Shield](https://aws.amazon.com/shield/), [CloudFlare](https://www.cloudflare.com/ddos/))
- [WAF](https://en.wikipedia.org/wiki/Web_application_firewall) (Web Application Firewall)

**Network topology:**
```
Internet
    ↓
[CloudFlare/WAF]
    ↓
[Load Balancers] (Public Subnet)
    ↓
[Web Servers] (Private Subnet)
    ↓
[Cache Layer - Redis/Memcached] (Private Subnet)
    ↓
[Database Layer - MySQL] (Private Subnet)
```

**Security Groups example (AWS):**
```bash
# Web servers - accept traffic only from Load Balancer
aws ec2 authorize-security-group-ingress --group-id sg-web \
    --protocol tcp --port 80 --source-group sg-lb

# Database - accept traffic only from Web servers
aws ec2 authorize-security-group-ingress --group-id sg-db \
    --protocol tcp --port 3306 --source-group sg-web
```

#### 6. Monitoring and alerting

**Required metrics:**
- Uptime of all services
- Latency (response time)
- Error rate
- Saturation (resource usage: CPU, RAM, Disk I/O)
- Traffic (network traffic)

**Monitoring tools:**
- [Prometheus](https://en.wikipedia.org/wiki/Prometheus_(software)) + [Grafana](https://en.wikipedia.org/wiki/Grafana) for metrics
- [ELK Stack](https://www.elastic.co/elastic-stack) ([Elasticsearch](https://en.wikipedia.org/wiki/Elasticsearch), [Logstash](https://www.elastic.co/logstash), [Kibana](https://www.elastic.co/kibana)) for logs
- [Zabbix](https://en.wikipedia.org/wiki/Zabbix) or [Nagios](https://en.wikipedia.org/wiki/Nagios) for system monitoring
- Cloud: [AWS CloudWatch](https://aws.amazon.com/cloudwatch/), [Azure Monitor](https://azure.microsoft.com/services/monitor/), [Google Cloud Monitoring](https://cloud.google.com/monitoring)

**Prometheus exporters:**
```yaml
# docker-compose.yml for monitoring stack
version: '3'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"

  node-exporter:
    image: prom/node-exporter

  mysqld-exporter:
    image: prom/mysqld-exporter
    environment:
      - DATA_SOURCE_NAME=exporter:password@(mysql:3306)/
```

**Alerts (Prometheus alerting rules):**
```yaml
groups:
- name: sla_alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 5m
    annotations:
      summary: "High error rate detected"

  - alert: DatabaseDown
    expr: mysql_up == 0
    for: 1m
    annotations:
      summary: "MySQL is down"

  - alert: HighLatency
    expr: http_request_duration_seconds{quantile="0.99"} > 1
    for: 5m
    annotations:
      summary: "99th percentile latency > 1s"
```

#### 7. Disaster recovery and backups

**Backup strategy:**
- **3-2-1 rule**: 3 copies, 2 different media, 1 offsite
- [Snapshot](https://en.wikipedia.org/wiki/Snapshot_(computer_storage)) of entire infrastructure (daily)
- Database backups (full daily + incremental every 6h)
- Static content replication to another region
- Configuration management ([Ansible](https://en.wikipedia.org/wiki/Ansible_(software)), [Terraform](https://en.wikipedia.org/wiki/Terraform_(software))) for rapid restoration

**RPO and RTO:**
- [RPO](https://en.wikipedia.org/wiki/Disaster_recovery#Recovery_Point_Objective) (Recovery Point Objective): maximum 6 hours data loss
- [RTO](https://en.wikipedia.org/wiki/Disaster_recovery#Recovery_Time_Objective) (Recovery Time Objective): recovery within 1 hour

**Terraform example for infrastructure as code:**
```hcl
# main.tf
resource "aws_db_instance" "mysql" {
  identifier           = "mysql-${var.site_name}"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  multi_az             = true  # Automatic failover
  backup_retention_period = 7
  backup_window        = "03:00-04:00"
  maintenance_window   = "mon:04:00-mon:05:00"

  # Create read replicas
  replicate_source_db  = var.master_db_id
}
```

### Infrastructure estimation

#### Web servers (for 7 websites)

**Recommendation:** 3 servers per site = 21 servers (can start with 14 and add auto-scaling)

**Server specification:**
- 4 vCPU
- 8 GB RAM
- 100 GB SSD
- Type: AWS t3.large, Azure Standard_D4s_v3, GCP n1-standard-4

#### MySQL database (7 DBs of 50GB each)

**Master servers:** 7 servers
- 8 vCPU
- 32 GB RAM
- 200 GB SSD (50GB data + growth + temp files)
- Type: AWS db.r5.xlarge, Azure Standard_E8s_v3

**Slave servers:** 14 servers (2 slaves per DB)
- Same specifications as master

#### Redis/Memcached

**Redis cluster:** 3 nodes minimum
- 4 vCPU
- 16 GB RAM
- 50 GB SSD
- Type: AWS cache.r5.large

**Memcached:** 3 nodes
- 2 vCPU
- 8 GB RAM
- Type: AWS cache.t3.medium

#### Static content

**Storage:**
- S3/Blob Storage: 50 TB allocated (with room for growth)
- CDN: CloudFlare/CloudFront unlimited

**Traffic estimate:**
- Assume 10TB/month outgoing CDN traffic

#### Load Balancers

- 2 HAProxy nodes or cloud load balancers (AWS ALB)
- 2 vCPU, 4 GB RAM each

### Total cost (approximate, AWS)

| Component | Quantity | Price/month (USD) |
|-----------|----------|-------------------|
| Web servers (t3.large) | 21 | ~$1,500 |
| MySQL Master (db.r5.xlarge) | 7 | ~$2,100 |
| MySQL Slaves (db.r5.xlarge) | 14 | ~$4,200 |
| Redis (cache.r5.large) | 3 | ~$450 |
| Memcached (cache.t3.medium) | 3 | ~$150 |
| Load Balancers (ALB) | 2 | ~$40 |
| S3 Storage (50TB) | - | ~$1,150 |
| CloudFront (10TB/month) | - | ~$850 |
| Backups (S3) | - | ~$200 |
| **TOTAL** | | **~$10,640/month** |

*Note: Prices are approximate and depend on region, committed use discounts, and exact usage pattern.*

### Cost optimization

1. **Reserved Instances** for permanent servers (30-50% savings)
2. **Spot Instances** for non-critical tasks
3. **Auto-scaling** for web servers (pay only for what's used)
4. **S3 Intelligent Tiering** for old content
5. **CDN optimization** - configure proper TTL

### Phased implementation (Migration plan)

#### Phase 1: Preparation (2 weeks)
- Current infrastructure audit
- Cloud provider selection
- Architecture design
- VPC, networks, security groups setup

#### Phase 2: Database (2 weeks)
- MySQL replication setup
- Data migration (with minimal downtime)
- Backup configuration
- Failover testing

#### Phase 3: Application Layer (2 weeks)
- Web server deployment
- Load balancer configuration
- Application migration
- Testing

#### Phase 4: Caching and static content (1 week)
- Redis/Memcached cluster setup
- Static content migration to S3
- CDN configuration
- Caching testing

#### Phase 5: Monitoring and testing (1 week)
- Prometheus/Grafana setup
- Alert configuration
- Load testing
- Failure scenario testing

#### Phase 6: Go-Live (1 day)
- Final DNS migration
- 24/7 monitoring for first week
- Gradual traffic switching (canary deployment)

### SLA calculation and guarantees

**SLA 99.9% means:**
- Maximum allowable downtime: 43.2 minutes per month
- 8.76 hours per year
- 1.44 minutes per day

**How it's achieved:**
- Elimination of single points of failure (SPOF)
- Automatic failover (switching time < 5 minutes)
- [Health checks](https://en.wikipedia.org/wiki/Health_check) and automatic exclusion of failed nodes
- Geographic distribution (multi-AZ/multi-region for critical components)
- Regular disaster recovery procedure testing

**Composite SLA calculation:**

For sequential components: SLA_total = SLA_1 × SLA_2 × SLA_3...

```
Load Balancer (99.99%) × Web (99.95%) × Cache (99.9%) × DB (99.95%)
= 0.9999 × 0.9995 × 0.999 × 0.9995
= 0.9979 ≈ 99.79%
```

For parallel components: SLA_total = 1 - (1 - SLA_1) × (1 - SLA_2)

```
DB Master+Slave: 1 - (1 - 0.9995) × (1 - 0.9995) = 0.99999975 ≈ 99.9999%
```

**Safety buffer inclusion:** Design for 99.95% to guarantee 99.9%

### Client checklist

- ✓ **High Availability:** No single points of failure, all components duplicated
- ✓ **Scalability:** Auto-scaling for peak load handling
- ✓ **Performance:** CDN for static content, Redis/Memcached caching, optimized DB queries
- ✓ **Data Protection:** Regular backups, replication to another region, encryption
- ✓ **Monitoring:** 24/7 monitoring, alerts, dashboards
- ✓ **Security:** WAF, DDoS protection, security groups, encryption
- ✓ **Cost Optimization:** Reserved instances, auto-scaling, S3 lifecycle policies
- ✓ **Documentation:** Runbooks for common operations and disaster recovery

### Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DB master failure | Medium | High | Automatic failover to slave in < 5 min |
| CDN traffic overage | Medium | Medium | Unlimited CDN plans, anomaly alerts |
| DDoS attack | High | High | CloudFlare/AWS Shield, WAF rules |
| Rapid data growth | High | Medium | Growth monitoring, auto-scaling storage |
| Human error | Medium | High | Infrastructure as Code, change management process |

### Alternative approaches

**Kubernetes-based solution:**
- More complex to setup
- Better for microservices
- Excellent horizontal scalability
- Requires specialized knowledge

```yaml
# Kubernetes Deployment example for web server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-php
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
```

**Serverless approach (partial):**
- AWS Lambda for API endpoints
- S3 + CloudFront for static content
- Aurora Serverless for database
- Pay only for usage
- Automatic scaling
- Limitations on execution time and cold starts

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
