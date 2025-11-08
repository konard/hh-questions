# Вопрос

Какие зависимости (явные и неявные) используются в этой роли: https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/rhel_python_sub

[English version](index.md) | [Все вопросы](../../README.ru.md)

---

## Краткий ответ

Роль имеет одну явную зависимость (`southbridge.aux.repo_southbridge`) и несколько неявных зависимостей, включая Python-пакеты, SCL-репозиторий (для EL7 с последней версией Python), OS-специфичные пакеты (`python3` на EL7, `python36` на EL6) и Ansible-модули (find, package, include_vars, include_role, set_fact).

---

## Подробное объяснение

[Ansible роль](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html) [rhel_python_sub](https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/rhel_python_sub) управляет установкой интерпретаторов Python на системах [RHEL](https://ru.wikipedia.org/wiki/Red_Hat_Enterprise_Linux) 6 и 7. Понимание её зависимостей важно для успешного развёртывания.

### 1. Явные зависимости

**Определение:** Явные зависимости — это те, что формально объявлены в [метаданных роли](https://docs.ansible.com/ansible/latest/reference_appendices/galaxy.html#dependencies).

**Объявлено в `meta/main.yml`:**

```yaml
dependencies:
  - southbridge.aux.repo_southbridge
```

**Назначение:** Роль [southbridge.aux.repo_southbridge](https://galaxy.southbridge.io/collections/aux) настраивает репозитории пакетов Southbridge, предоставляя доступ к дополнительным пакетам и Software Collections, которые могут отсутствовать в стандартных репозиториях RHEL.

**Почему это необходимо:**
- Обеспечивает правильную настройку репозиториев перед установкой Python-пакетов
- Требуется для доступа к SCL-репозиториям на EL7 при `rhel_python_sub_latest: true`
- Обеспечивает согласованные источники пакетов при развёртывании

### 2. Неявные зависимости от ролей

**Определение:** Неявные зависимости — это роли или ресурсы, используемые условно или ссылающиеся в задачах, но не объявленные формально в метаданных.

#### 2.1 Условное подключение роли

**Упоминается в `tasks/main.yml`:**

```yaml
- include_role:
    name: repo_scl
  when:
    - ansible_distribution_major_version == '7'
    - rhel_python_sub_latest | bool
```

**Зависимость:** Роль [repo_scl](https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/repo_scl)

**Условия срабатывания:**
- Запуск на RHEL 7 (`ansible_distribution_major_version == '7'`)
- Запрошена последняя версия Python (`rhel_python_sub_latest: true`)

**Назначение:** Настраивает репозитории [Software Collections (SCL)](https://www.softwarecollections.org/) для установки более новых версий Python (3.8), недоступных в стандартных репозиториях RHEL 7.

**Почему это условно:** RHEL 6 и стандартные установки RHEL 7 используют другие источники Python, поэтому SCL нужен только для последней версии Python на EL7.

### 3. Зависимости от пакетов

**Определение:** Пакеты операционной системы, устанавливаемые ролью через [модуль package](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html).

#### 3.1 Пакеты для RHEL 7

**Стандартная установка** (при `rhel_python_sub_latest: false`):

```yaml
- package:
    name: python3
    state: present
```

**Пакет:** `python3`

**Предоставляет:** [Python 3.6](https://www.python.org/downloads/release/python-360/) на RHEL 7 из стандартных репозиториев

**Расположение бинарного файла:** `/usr/bin/python3.6`

**Установка через SCL** (при `rhel_python_sub_latest: true`):

```yaml
- package:
    name: rh-python38
    state: present
```

**Пакет:** [rh-python38](https://access.redhat.com/documentation/en-us/red_hat_software_collections/3/html/3.8_release_notes/chap-rhscl#sect-RHSCL-Changes-Python)

**Предоставляет:** [Python 3.8](https://www.python.org/downloads/release/python-380/) из Red Hat Software Collections

**Расположение бинарного файла:** `/opt/rh/rh-python38/root/bin/python3.8`

**Требует:** Настроенных SCL-репозиториев через роль `repo_scl`

#### 3.2 Пакеты для RHEL 6

**Стандартная установка:**

```yaml
- package:
    name: python36
    state: present
```

**Пакет:** `python36` или `rh-python36`

**Предоставляет:** [Python 3.6](https://www.python.org/downloads/release/python-360/) на RHEL 6

**Возможные расположения бинарного файла:**
- `/opt/rh/rh-python36/root/usr/bin/python3.6` (SCL)
- `/usr/bin/python3.6` (стандартный репозиторий)

**Порядок поиска версий** (из `vars/el6.yml`):
```yaml
rhel_python_sub__set:
  - python3.6
  - python3.5
  - python2.7
```

### 4. Зависимости от Ansible-модулей

**Определение:** Встроенные и community Ansible-модули, используемые в задачах.

#### 4.1 Используемые основные модули

| Модуль | Назначение | Документация |
|--------|-----------|--------------|
| [include_vars](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_vars_module.html) | Загрузка OS-специфичных переменных из `vars/el6.yml` или `vars/el7.yml` | Загружает пути поиска Python и настройки версий |
| [find](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html) | Поиск бинарных файлов Python в указанных путях | Обнаруживает существующие установки Python |
| [set_fact](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html) | Установка факта `ansible_python_interpreter` | Настраивает какой интерпретатор Python использует Ansible |
| [package](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html) | Установка Python-пакетов | Устанавливает python3, python36 или rh-python38 |
| [include_role](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html) | Подключение роли repo_scl | Условно подключает настройку SCL-репозитория |

**Требования:**
- Ansible 2.11+ (указано в `meta/main.yml`)
- Стандартные модули ядра Ansible (включены в базовую установку)

### 5. Системные зависимости

#### 5.1 Требования к операционной системе

**Поддерживаемые платформы** (из `meta/main.yml`):

```yaml
platforms:
  - name: EL
    versions:
      - 6
      - 7
```

**Совместимые дистрибутивы:**
- [Red Hat Enterprise Linux (RHEL)](https://ru.wikipedia.org/wiki/Red_Hat_Enterprise_Linux) 6, 7
- [CentOS](https://ru.wikipedia.org/wiki/CentOS) 6, 7
- [Oracle Linux](https://ru.wikipedia.org/wiki/Oracle_Linux) 6, 7
- [Scientific Linux](https://ru.wikipedia.org/wiki/Scientific_Linux) 6, 7

**Несовместимо с:**
- RHEL 8+ (другой подход к пакетированию Python)
- Дистрибутивы на базе Debian
- Дистрибутивы на базе SUSE

#### 5.2 Требуемые Ansible facts

Роль полагается на [Ansible facts](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_vars_facts.html), собираемые автоматически:

| Fact | Назначение | Пример значения |
|------|-----------|-----------------|
| `ansible_distribution_major_version` | Определение версии EL | `"6"` или `"7"` |
| `ansible_python_interpreter` | Хранение обнаруженного пути к Python | `/usr/bin/python3.6` |

**Требование:** [Сбор фактов](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html) должен быть включён (поведение по умолчанию).

### 6. Зависимости от репозиториев

#### 6.1 Стандартные RHEL-репозитории

**Требуемые репозитории:**

Для **RHEL 7**:
- `rhel-7-server-rpms` (базовые пакеты)
- `rhel-7-server-optional-rpms` (пакет python3)

Для **RHEL 6**:
- `rhel-6-server-rpms` (базовые пакеты)
- `rhel-6-server-optional-rpms` (python36 или rh-python36)

**Конфигурация:** Управляется через subscription-manager или файлы репозиториев в `/etc/yum.repos.d/`

#### 6.2 Репозитории Software Collections (SCL)

**Когда требуется:** RHEL 7 с `rhel_python_sub_latest: true`

**Репозиторий:** `rhel-server-rhscl-7-rpms`

**Предоставляет:** Пакет rh-python38

**Настраивается через:** Роль `repo_scl` (неявная зависимость)

**Команда активации:**
```bash
subscription-manager repos --enable rhel-server-rhscl-7-rpms
```

#### 6.3 Репозитории Southbridge

**Настраивается через:** `southbridge.aux.repo_southbridge` (явная зависимость)

**Назначение:** Может предоставлять дополнительные Python-пакеты или зависимости, отсутствующие в стандартных репозиториях

**Управление:** Через конфигурационные файлы репозиториев роли

### 7. Зависимости от переменных

#### 7.1 Требуемые переменные

Роль определяет их в `defaults/main.yml` и `vars/`:

```yaml
# defaults/main.yml
rhel_python_sub_latest: false
```

**Назначение:** Управляет установкой последней версии Python (3.8 на EL7) или стандартной версии

**Тип:** Boolean

**По умолчанию:** `false` (использовать версии из стандартных репозиториев)

#### 7.2 Внутренние переменные (OS-специфичные)

**Для EL7** (`vars/el7.yml`):
```yaml
rhel_python_sub__paths:
  - /usr/bin

rhel_python_sub__set:
  - python3.8
  - python3.7
  - python3.6
```

**Для EL6** (`vars/el6.yml`):
```yaml
rhel_python_sub__paths:
  - /opt/rh/rh-python36/root/usr/bin
  - /usr/bin

rhel_python_sub__set:
  - python3.6
  - python3.5
  - python2.7
```

**Назначение:**
- `rhel_python_sub__paths`: Директории для поиска бинарных файлов Python
- `rhel_python_sub__set`: Версии Python для поиска в порядке приоритета

### 8. Визуализация дерева зависимостей

```
rhel_python_sub
├── Явные зависимости
│   └── southbridge.aux.repo_southbridge [всегда]
│       └── Настраивает репозитории Southbridge
│
├── Неявные зависимости от ролей
│   └── repo_scl [условно: EL7 + latest]
│       └── Настраивает репозитории Software Collections
│
├── Зависимости от пакетов
│   ├── RHEL 7 Стандартный: python3 → /usr/bin/python3.6
│   ├── RHEL 7 Последний: rh-python38 → /opt/rh/rh-python38/root/bin/python3.8
│   └── RHEL 6 Стандартный: python36 → /usr/bin/python3.6 или /opt/rh/rh-python36/root/usr/bin/python3.6
│
├── Зависимости от репозиториев
│   ├── Базовые RHEL-репозитории [всегда]
│   ├── Optional RHEL-репозитории [всегда]
│   ├── SCL-репозитории [условно: EL7 + latest]
│   └── Southbridge-репозитории [через repo_southbridge]
│
├── Зависимости от Ansible-модулей
│   ├── include_vars (загрузка OS-специфичных переменных)
│   ├── find (поиск бинарных файлов Python)
│   ├── set_fact (установка ansible_python_interpreter)
│   ├── package (установка Python-пакетов)
│   └── include_role (условное подключение repo_scl)
│
└── Системные зависимости
    ├── RHEL/CentOS 6 или 7
    ├── Ansible 2.11+
    └── Сбор фактов включён
```

### 9. Анализ зависимостей по сценариям

#### Сценарий 1: RHEL 7, стандартный Python

```yaml
rhel_python_sub_latest: false  # или опущено (по умолчанию)
```

**Активированные зависимости:**
1. ✓ `southbridge.aux.repo_southbridge` (явная)
2. ✓ Базовые и optional RHEL-репозитории
3. ✓ Установка пакета `python3`
4. ✓ Ansible-модули: include_vars, find, set_fact, package
5. ✗ `repo_scl` (не нужна)
6. ✗ SCL-репозитории (не нужны)

**Результат:** Python 3.6 установлен в `/usr/bin/python3.6`

#### Сценарий 2: RHEL 7, последний Python

```yaml
rhel_python_sub_latest: true
```

**Активированные зависимости:**
1. ✓ `southbridge.aux.repo_southbridge` (явная)
2. ✓ `repo_scl` (неявная, условная)
3. ✓ Базовые, optional и SCL RHEL-репозитории
4. ✓ Установка пакета `rh-python38`
5. ✓ Ansible-модули: include_vars, find, set_fact, package, include_role

**Результат:** Python 3.8 установлен в `/opt/rh/rh-python38/root/bin/python3.8`

#### Сценарий 3: RHEL 6, любая конфигурация

```yaml
# rhel_python_sub_latest не влияет на EL6
```

**Активированные зависимости:**
1. ✓ `southbridge.aux.repo_southbridge` (явная)
2. ✓ Базовые и optional RHEL-репозитории (или SCL при наличии)
3. ✓ Установка пакета `python36` или `rh-python36`
4. ✓ Ansible-модули: include_vars, find, set_fact, package
5. ✗ `repo_scl` (не используется на EL6)

**Результат:** Python 3.6 установлен (путь зависит от источника пакета)

### 10. Потенциальные скрытые зависимости

#### 10.1 Сетевые зависимости

- **Доступ к Интернету/репозиториям:** Требуется для загрузки пакетов из RHEL, SCL или Southbridge репозиториев
- **Конфигурация прокси:** Может потребоваться при доступе к репозиториям через корпоративный прокси
- **DNS-разрешение:** Необходимо для разрешения URL репозиториев

#### 10.2 Зависимости от подписки

Для систем RHEL (не CentOS):
- **Активная подписка Red Hat:** Требуется для доступа к официальным репозиториям
- **Включённые репозитории:** Необходимо вручную включить optional и SCL репозитории через subscription-manager
- **Entitlements:** SCL может требовать специальных прав

#### 10.3 Зависимости от прав доступа

- **Root/sudo доступ:** Установка пакетов требует повышенных привилегий
- **SELinux-контекст:** Может влиять на доступ к файлам в директориях `/opt/rh/`
- **Права на файловую систему:** Доступ на запись в `/usr/bin` или `/opt/rh/`

### Сводная таблица

| Тип зависимости | Название | Условие | Назначение |
|----------------|----------|---------|-----------|
| **Явная роль** | southbridge.aux.repo_southbridge | Всегда | Настроить Southbridge репозитории |
| **Неявная роль** | repo_scl | EL7 + latest | Настроить SCL репозитории |
| **Пакет** | python3 | EL7 стандартный | Python 3.6 из базовых репозиториев |
| **Пакет** | rh-python38 | EL7 последний | Python 3.8 из SCL |
| **Пакет** | python36 | EL6 | Python 3.6 для RHEL 6 |
| **Модуль** | include_vars | Всегда | Загрузить OS-специфичные переменные |
| **Модуль** | find | Всегда | Поиск бинарных файлов Python |
| **Модуль** | set_fact | Всегда | Установить факт интерпретатора Python |
| **Модуль** | package | Условно | Установить Python-пакеты |
| **Модуль** | include_role | EL7 + latest | Подключить repo_scl |
| **Репозиторий** | RHEL base/optional | Всегда | Стандартные пакеты |
| **Репозиторий** | SCL репозитории | EL7 + latest | Software Collections |
| **Система** | RHEL/CentOS 6/7 | Всегда | Операционная система |
| **Система** | Ansible 2.11+ | Всегда | Платформа автоматизации |
| **Система** | Сбор фактов | Всегда | Информация о системе |

### Лучшие практики управления этими зависимостями

1. **Проверяйте доступ к репозиториям** перед запуском роли:
   ```bash
   yum repolist  # Проверка включённых репозиториев
   ```

2. **Включайте необходимые репозитории** на RHEL:
   ```bash
   subscription-manager repos --enable rhel-7-server-optional-rpms
   subscription-manager repos --enable rhel-server-rhscl-7-rpms  # Для latest
   ```

3. **Устанавливайте зависимые роли** из Ansible Galaxy:
   ```bash
   ansible-galaxy collection install southbridge.aux
   ```

4. **Тестируйте в изолированной среде** сначала для выявления отсутствующих зависимостей

5. **Документируйте пользовательские переменные** в вашем playbook:
   ```yaml
   - hosts: servers
     roles:
       - role: southbridge.aux.rhel_python_sub
         vars:
           rhel_python_sub_latest: true  # Явная конфигурация
   ```

6. **Проверяйте установленный Python** после выполнения роли:
   ```bash
   ansible servers -m setup -a 'filter=ansible_python_interpreter'
   ```

---

[English version](index.md) | [Все вопросы](../../README.ru.md)
