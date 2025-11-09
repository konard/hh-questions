# Вопрос

Клиент просит подобрать отказоустойчивое решение с SLA 99.9% для 7 сайтов (Nginx, PHP, MySQL, Redis, Memcached), статика занимает 10ТБ и будет расти до 50ТБ в течении года, каждая БД занимает 50ГБ. Предложите решение, опишите для клиента техническую реализацию.

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Для достижения SLA 99.9% необходима избыточная инфраструктура с [load balancing](https://ru.wikipedia.org/wiki/Балансировка_нагрузки), [репликацией баз данных](https://ru.wikipedia.org/wiki/Репликация_(вычислительная_техника)), [CDN](https://ru.wikipedia.org/wiki/Content_Delivery_Network) для статики и [мониторингом](https://ru.wikipedia.org/wiki/Мониторинг_(информационные_технологии)). Рекомендуется использовать облачную платформу с [auto-scaling](https://ru.wikipedia.org/wiki/Автоматическое_масштабирование), объектное хранилище для статического контента, master-slave репликацию MySQL с автоматическим failover и кластеризацию Redis/Memcached.

---

## Подробное объяснение

Проектирование [отказоустойчивой](https://ru.wikipedia.org/wiki/Отказоустойчивость) инфраструктуры с [SLA](https://ru.wikipedia.org/wiki/Соглашение_об_уровне_обслуживания) 99.9% требует комплексного подхода к обеспечению высокой доступности на всех уровнях.

### Анализ требований

**Текущие параметры:**
- 7 сайтов ([Nginx](https://ru.wikipedia.org/wiki/Nginx), [PHP](https://ru.wikipedia.org/wiki/PHP), [MySQL](https://ru.wikipedia.org/wiki/MySQL), [Redis](https://ru.wikipedia.org/wiki/Redis), [Memcached](https://ru.wikipedia.org/wiki/Memcached))
- 10 ТБ статического контента (рост до 50 ТБ за год)
- 7 баз данных по 50 ГБ каждая (350 ГБ всего)
- SLA 99.9% = максимум 8.76 часов простоя в год (или ~43 минуты в месяц)

**Ключевые вызовы:**
- Масштабирование статического контента (5x рост за год)
- Обеспечение высокой доступности всех компонентов
- Минимизация единых точек отказа ([SPOF](https://ru.wikipedia.org/wiki/Единая_точка_отказа))

### Архитектура решения

#### 1. Веб-серверы и Application Layer

**Компоненты:**
- [Load Balancer](https://ru.wikipedia.org/wiki/Балансировка_нагрузки) (отказоустойчивая пара)
- Минимум 2-3 веб-сервера на сайт (Nginx + PHP-FPM)
- [Auto-scaling](https://ru.wikipedia.org/wiki/Автоматическое_масштабирование) группы для обработки пиковых нагрузок

**Технические детали:**

```nginx
# Конфигурация upstream для отказоустойчивости
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

**Load Balancer решения:**
- [HAProxy](https://ru.wikipedia.org/wiki/HAProxy) или [Nginx](https://ru.wikipedia.org/wiki/Nginx) в режиме балансировщика
- [Keepalived](https://www.keepalived.org/) для [VRRP](https://ru.wikipedia.org/wiki/VRRP) (виртуальный IP)
- [Health checks](https://en.wikipedia.org/wiki/Health_check) для автоматического исключения неработающих серверов
- Облачные альтернативы: [AWS ALB/NLB](https://aws.amazon.com/elasticloadbalancing/), [Azure Load Balancer](https://azure.microsoft.com/en-us/services/load-balancer/), [Google Cloud Load Balancing](https://cloud.google.com/load-balancing)

**PHP-FPM оптимизация:**
```ini
; /etc/php-fpm.d/www.conf
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

#### 2. База данных MySQL

**Архитектура:**
- [Master-Slave репликация](https://ru.wikipedia.org/wiki/Репликация_(вычислительная_техника)) (1 master + минимум 2 slave на БД)
- [Multi-master репликация](https://en.wikipedia.org/wiki/Multi-master_replication) для критичных данных (опционально)
- Автоматический [failover](https://ru.wikipedia.org/wiki/Отказоустойчивость) при отказе master

**Решения для управления репликацией:**

**[MySQL Group Replication](https://dev.mysql.com/doc/refman/8.0/en/group-replication.html):**
```sql
-- Настройка Group Replication
SET SQL_LOG_BIN=0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'password' REQUIRE SSL;
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN=1;

-- Конфигурация my.cnf
[mysqld]
server_id=1
gtid_mode=ON
enforce_gtid_consistency=ON
binlog_checksum=NONE
log_bin=binlog
log_slave_updates=ON
binlog_format=ROW
```

**Альтернативные решения:**
- [Percona XtraDB Cluster](https://www.percona.com/software/mysql-database/percona-xtradb-cluster) - синхронная multi-master репликация
- [MariaDB Galera Cluster](https://mariadb.com/kb/en/what-is-mariadb-galera-cluster/) - кластер с синхронной репликацией
- [MySQL InnoDB Cluster](https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html) - встроенное решение от Oracle
- Управляемые облачные решения:
  - [AWS RDS Multi-AZ](https://aws.amazon.com/rds/features/multi-az/) с автоматическим failover
  - [Azure Database for MySQL](https://azure.microsoft.com/en-us/services/mysql/) с zone-redundant HA
  - [Google Cloud SQL](https://cloud.google.com/sql) с regional HA

**Автоматический failover с ProxySQL:**
```sql
-- ProxySQL конфигурация для автоматического переключения
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES
(10, 'mysql-master', 3306),
(20, 'mysql-slave1', 3306),
(20, 'mysql-slave2', 3306);

INSERT INTO mysql_replication_hostgroups VALUES (10,20,'read_only','Group Replication');
```

**Бэкапы:**
- Ежедневные [полные бэкапы](https://ru.wikipedia.org/wiki/Резервное_копирование) ([mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html) или [Percona XtraBackup](https://www.percona.com/software/mysql-database/percona-xtrabackup))
- Инкрементальные бэкапы каждые 6 часов
- [Point-in-time recovery](https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery.html) через binary logs
- Хранение бэкапов в разных географических зонах
- Регулярное тестирование восстановления

```bash
# Пример автоматизированного бэкапа с Percona XtraBackup
#!/bin/bash
BACKUP_DIR="/backup/mysql/$(date +%Y%m%d)"
xtrabackup --backup --target-dir=$BACKUP_DIR --user=backup --password=xxx
xtrabackup --prepare --target-dir=$BACKUP_DIR
# Загрузка в объектное хранилище
aws s3 sync $BACKUP_DIR s3://backups/mysql/$(date +%Y%m%d)/
```

#### 3. Кэширование (Redis и Memcached)

**Redis архитектура:**
- [Redis Sentinel](https://redis.io/topics/sentinel) для автоматического failover
- [Redis Cluster](https://redis.io/topics/cluster-tutorial) для горизонтального масштабирования
- Минимум 3 узла для кворума

**Redis Sentinel конфигурация:**
```conf
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
```

**Redis master конфигурация:**
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

**Memcached архитектура:**
- Множественные узлы с [consistent hashing](https://ru.wikipedia.org/wiki/Консистентное_хеширование)
- Клиентское масштабирование (libmemcached с consistent hashing)

```php
// PHP клиент с consistent hashing
$memcached = new Memcached('persistent_pool');
$memcached->setOption(Memcached::OPT_DISTRIBUTION, Memcached::DISTRIBUTION_CONSISTENT);
$memcached->setOption(Memcached::OPT_LIBKETAMA_COMPATIBLE, true);
$memcached->addServers([
    ['memcached1', 11211, 33],
    ['memcached2', 11211, 33],
    ['memcached3', 11211, 34],
]);
```

**Облачные альтернативы:**
- [AWS ElastiCache](https://aws.amazon.com/elasticache/) (Redis/Memcached)
- [Azure Cache for Redis](https://azure.microsoft.com/en-us/services/cache/)
- [Google Cloud Memorystore](https://cloud.google.com/memorystore)

#### 4. Статический контент (10TB → 50TB)

**Рекомендуемое решение:**
- [CDN](https://ru.wikipedia.org/wiki/Content_Delivery_Network) ([CloudFlare](https://ru.wikipedia.org/wiki/Cloudflare), [AWS CloudFront](https://aws.amazon.com/cloudfront/), [Akamai](https://ru.wikipedia.org/wiki/Akamai_Technologies))
- [Объектное хранилище](https://ru.wikipedia.org/wiki/Объектное_хранилище) ([AWS S3](https://aws.amazon.com/s3/), [Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/), [Google Cloud Storage](https://cloud.google.com/storage))
- Инвалидация кэша через API

**AWS S3 + CloudFront пример:**
```bash
# Создание S3 bucket с версионированием
aws s3api create-bucket --bucket static-content-prod --region us-east-1
aws s3api put-bucket-versioning --bucket static-content-prod \
    --versioning-configuration Status=Enabled

# Настройка lifecycle policy для оптимизации затрат
aws s3api put-bucket-lifecycle-configuration --bucket static-content-prod \
    --lifecycle-configuration file://lifecycle.json

# CloudFront distribution создание
aws cloudfront create-distribution --distribution-config file://cf-config.json
```

**Lifecycle policy для оптимизации (lifecycle.json):**
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

**Альтернативы:**
- Собственное решение: [GlusterFS](https://ru.wikipedia.org/wiki/GlusterFS) или [Ceph](https://ru.wikipedia.org/wiki/Ceph) + Nginx кэширование
- [MinIO](https://min.io/) - S3-совместимое объектное хранилище (self-hosted)

**Nginx кэширование для CDN-подобного поведения:**
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

#### 5. Сетевая архитектура и безопасность

**Компоненты:**
- [Multi-AZ deployment](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html) (несколько зон доступности)
- [Private/Public subnets](https://ru.wikipedia.org/wiki/Подсеть) разделение
- [Firewall](https://ru.wikipedia.org/wiki/Межсетевой_экран) и [Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [DDoS protection](https://ru.wikipedia.org/wiki/DDoS-атака) ([AWS Shield](https://aws.amazon.com/shield/), [CloudFlare](https://www.cloudflare.com/ddos/))
- [WAF](https://ru.wikipedia.org/wiki/Файрвол_веб-приложений) (Web Application Firewall)

**Сетевая топология:**
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

**Security Groups пример (AWS):**
```bash
# Web servers - принимают трафик только от Load Balancer
aws ec2 authorize-security-group-ingress --group-id sg-web \
    --protocol tcp --port 80 --source-group sg-lb

# Database - принимает трафик только от Web servers
aws ec2 authorize-security-group-ingress --group-id sg-db \
    --protocol tcp --port 3306 --source-group sg-web
```

#### 6. Мониторинг и оповещения

**Необходимые метрики:**
- Uptime всех сервисов
- Latency (время ответа)
- Error rate (частота ошибок)
- Saturation (загрузка ресурсов: CPU, RAM, Disk I/O)
- Traffic (трафик сети)

**Инструменты мониторинга:**
- [Prometheus](https://ru.wikipedia.org/wiki/Prometheus_(программное_обеспечение)) + [Grafana](https://ru.wikipedia.org/wiki/Grafana) для метрик
- [ELK Stack](https://www.elastic.co/elastic-stack) ([Elasticsearch](https://ru.wikipedia.org/wiki/Elasticsearch), [Logstash](https://www.elastic.co/logstash), [Kibana](https://www.elastic.co/kibana)) для логов
- [Zabbix](https://ru.wikipedia.org/wiki/Zabbix) или [Nagios](https://ru.wikipedia.org/wiki/Nagios) для системного мониторинга
- Облачные: [AWS CloudWatch](https://aws.amazon.com/cloudwatch/), [Azure Monitor](https://azure.microsoft.com/en-us/services/monitor/), [Google Cloud Monitoring](https://cloud.google.com/monitoring)

**Prometheus exporters:**
```yaml
# docker-compose.yml для мониторинга стека
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

**Алерты (Prometheus alerting rules):**
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

#### 7. Disaster Recovery и бэкапы

**Стратегия бэкапирования:**
- **3-2-1 правило**: 3 копии, 2 разных носителя, 1 offsite
- [Snapshot](https://ru.wikipedia.org/wiki/Снимок_(компьютер)) всей инфраструктуры (ежедневно)
- Database бэкапы (полные ежедневно + инкрементальные каждые 6ч)
- Статический контент репликация в другой регион
- Configuration management ([Ansible](https://ru.wikipedia.org/wiki/Ansible), [Terraform](https://ru.wikipedia.org/wiki/Terraform_(программное_обеспечение))) для быстрого восстановления

**RPO и RTO:**
- [RPO](https://ru.wikipedia.org/wiki/Recovery_Point_Objective) (Recovery Point Objective): максимум 6 часов потери данных
- [RTO](https://ru.wikipedia.org/wiki/Recovery_Time_Objective) (Recovery Time Objective): восстановление за 1 час

**Terraform пример для infrastructure as code:**
```hcl
# main.tf
resource "aws_db_instance" "mysql" {
  identifier           = "mysql-${var.site_name}"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  multi_az             = true  # Автоматический failover
  backup_retention_period = 7
  backup_window        = "03:00-04:00"
  maintenance_window   = "mon:04:00-mon:05:00"

  # Создание read replicas
  replicate_source_db  = var.master_db_id
}
```

### Примерный расчет инфраструктуры

#### Веб-серверы (для 7 сайтов)

**Рекомендация:** 3 сервера на сайт = 21 сервер (можно начать с 14 и добавить auto-scaling)

**Спецификация сервера:**
- 4 vCPU
- 8 GB RAM
- 100 GB SSD
- Тип: AWS t3.large, Azure Standard_D4s_v3, GCP n1-standard-4

#### База данных MySQL (7 БД по 50GB)

**Master сервера:** 7 серверов
- 8 vCPU
- 32 GB RAM
- 200 GB SSD (50GB данные + рост + временные файлы)
- Тип: AWS db.r5.xlarge, Azure Standard_E8s_v3

**Slave сервера:** 14 серверов (2 slave на БД)
- Те же спецификации что и master

#### Redis/Memcached

**Redis кластер:** 3 узла минимум
- 4 vCPU
- 16 GB RAM
- 50 GB SSD
- Тип: AWS cache.r5.large

**Memcached:** 3 узла
- 2 vCPU
- 8 GB RAM
- Тип: AWS cache.t3.medium

#### Статический контент

**Хранилище:**
- S3/Blob Storage: 50 TB выделено (с запасом на рост)
- CDN: CloudFlare/CloudFront без ограничений

**Оценка трафика:**
- Предположим 10TB/месяц исходящего трафика CDN

#### Load Balancers

- 2 узла HAProxy или облачные балансировщики (AWS ALB)
- 2 vCPU, 4 GB RAM каждый

### Общая стоимость (приблизительная, AWS)

| Компонент | Количество | Цена/месяц (USD) |
|-----------|-----------|------------------|
| Web servers (t3.large) | 21 | ~$1,500 |
| MySQL Master (db.r5.xlarge) | 7 | ~$2,100 |
| MySQL Slaves (db.r5.xlarge) | 14 | ~$4,200 |
| Redis (cache.r5.large) | 3 | ~$450 |
| Memcached (cache.t3.medium) | 3 | ~$150 |
| Load Balancers (ALB) | 2 | ~$40 |
| S3 Storage (50TB) | - | ~$1,150 |
| CloudFront (10TB/месяц) | - | ~$850 |
| Бэкапы (S3) | - | ~$200 |
| **ИТОГО** | | **~$10,640/месяц** |

*Примечание: Цены приблизительные и зависят от региона, committed use discounts, и точного usage pattern.*

### Оптимизация затрат

1. **Reserved Instances** для постоянных серверов (экономия 30-50%)
2. **Spot Instances** для некритичных задач
3. **Auto-scaling** для веб-серверов (платить только за использованное)
4. **S3 Intelligent Tiering** для старого контента
5. **CDN optimization** - настройка правильных TTL

### Поэтапное внедрение (Migration план)

#### Фаза 1: Подготовка (2 недели)
- Аудит текущей инфраструктуры
- Выбор облачного провайдера
- Проектирование архитектуры
- Настройка VPC, сетей, security groups

#### Фаза 2: База данных (2 недели)
- Настройка MySQL репликации
- Миграция данных (с минимальным downtime)
- Настройка бэкапов
- Тестирование failover

#### Фаза 3: Application Layer (2 недели)
- Развертывание веб-серверов
- Настройка load balancers
- Миграция приложений
- Тестирование

#### Фаза 4: Кэширование и статика (1 неделя)
- Настройка Redis/Memcached кластеров
- Миграция статического контента в S3
- Настройка CDN
- Тестирование кэширования

#### Фаза 5: Мониторинг и тестирование (1 неделя)
- Настройка Prometheus/Grafana
- Настройка алертов
- Нагрузочное тестирование
- Тестирование сценариев отказа

#### Фаза 6: Go-Live (1 день)
- Финальная миграция DNS
- 24/7 мониторинг первую неделю
- Постепенное переключение трафика (canary deployment)

### SLA калькуляция и гарантии

**SLA 99.9% означает:**
- Максимально допустимое время простоя: 43.2 минуты в месяц
- 8.76 часов в год
- 1.44 минуты в день

**Как достигается:**
- Устранение единых точек отказа (SPOF)
- Автоматический failover (время переключения < 5 минут)
- [Health checks](https://en.wikipedia.org/wiki/Health_check) и автоматическое исключение неработающих узлов
- Географическое распределение (multi-AZ/multi-region для критичных компонентов)
- Регулярное тестирование disaster recovery процедур

**Расчет composite SLA:**

Для последовательных компонентов: SLA_total = SLA_1 × SLA_2 × SLA_3...

```
Load Balancer (99.99%) × Web (99.95%) × Cache (99.9%) × DB (99.95%)
= 0.9999 × 0.9995 × 0.999 × 0.9995
= 0.9979 ≈ 99.79%
```

Для параллельных компонентов: SLA_total = 1 - (1 - SLA_1) × (1 - SLA_2)

```
DB Master+Slave: 1 - (1 - 0.9995) × (1 - 0.9995) = 0.99999975 ≈ 99.9999%
```

**Включение буфера безопасности:** Проектировать на 99.95% для гарантии 99.9%

### Чек-лист для клиента

- ✓ **High Availability:** Нет единых точек отказа, все компоненты продублированы
- ✓ **Scalability:** Auto-scaling для обработки пиковых нагрузок
- ✓ **Performance:** CDN для статики, кэширование Redis/Memcached, оптимизированные запросы к БД
- ✓ **Data Protection:** Регулярные бэкапы, репликация в другой регион, шифрование
- ✓ **Monitoring:** 24/7 мониторинг, алерты, dashboards
- ✓ **Security:** WAF, DDoS protection, security groups, шифрование
- ✓ **Cost Optimization:** Reserved instances, auto-scaling, S3 lifecycle policies
- ✓ **Documentation:** Runbooks для обычных операций и disaster recovery

### Риски и митигации

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Отказ БД master | Средняя | Высокое | Автоматический failover на slave за < 5 мин |
| Превышение трафика CDN | Средняя | Среднее | Безлимитные CDN планы, алерты на аномалии |
| DDoS атака | Высокая | Высокое | CloudFlare/AWS Shield, WAF правила |
| Быстрый рост данных | Высокая | Среднее | Мониторинг роста, auto-scaling storage |
| Human error | Средняя | Высокое | Infrastructure as Code, change management процесс |

### Альтернативные подходы

**Kubernetes-based решение:**
- Более сложное в настройке
- Лучше для микросервисов
- Отличная горизонтальная масштабируемость
- Требует специализированных знаний

```yaml
# Kubernetes Deployment пример для веб-сервера
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

**Serverless подход (частично):**
- AWS Lambda для API endpoints
- S3 + CloudFront для статики
- Aurora Serverless для БД
- Платите только за использование
- Автоматическое масштабирование
- Ограничения на execution time и cold starts

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
