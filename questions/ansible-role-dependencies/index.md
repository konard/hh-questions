# Question

Which dependencies (explicit and implicit) are used in this role: https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/rhel_python_sub

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The role has one explicit dependency (`southbridge.aux.repo_southbridge`) and several implicit dependencies including Python packages, SCL repository (for EL7 with latest Python), OS-specific packages (`python3` on EL7, `python36` on EL6), and Ansible modules (find, package, include_vars, include_role, set_fact).

---

## Detailed explanation

The [rhel_python_sub](https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/rhel_python_sub) [Ansible role](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html) manages Python interpreter installations on [RHEL](https://en.wikipedia.org/wiki/Red_Hat_Enterprise_Linux) 6 and 7 systems. Understanding its dependencies is important for successful deployment.

### 1. Explicit dependencies

**Definition:** Explicit dependencies are those formally declared in the [role's metadata](https://docs.ansible.com/ansible/latest/reference_appendices/galaxy.html#dependencies).

**Declared in `meta/main.yml`:**

```yaml
dependencies:
  - southbridge.aux.repo_southbridge
```

**Purpose:** The [southbridge.aux.repo_southbridge](https://galaxy.southbridge.io/collections/aux) role configures Southbridge package repositories, providing access to additional packages and Software Collections that may not be available in standard RHEL repositories.

**Why it's needed:**
- Ensures proper repository configuration before installing Python packages
- Required for accessing SCL repositories on EL7 when `rhel_python_sub_latest: true`
- Provides consistent package sources across deployments

### 2. Implicit role dependencies

**Definition:** Implicit dependencies are roles or resources used conditionally or referenced within tasks but not formally declared in metadata.

#### 2.1 Conditional role inclusion

**Referenced in `tasks/main.yml`:**

```yaml
- include_role:
    name: repo_scl
  when:
    - ansible_distribution_major_version == '7'
    - rhel_python_sub_latest | bool
```

**Dependency:** [repo_scl](https://galaxy.southbridge.io/collections/aux/-/tree/master/roles/repo_scl) role

**Trigger conditions:**
- Running on RHEL 7 (`ansible_distribution_major_version == '7'`)
- Latest Python requested (`rhel_python_sub_latest: true`)

**Purpose:** Configures [Software Collections (SCL)](https://www.softwarecollections.org/) repositories to install newer Python versions (3.8) not available in standard RHEL 7 repositories.

**Why it's conditional:** RHEL 6 and standard RHEL 7 installations use different Python sources, so SCL is only needed for latest Python on EL7.

### 3. Package dependencies

**Definition:** Operating system packages installed by the role through the [package module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html).

#### 3.1 RHEL 7 packages

**Standard installation** (when `rhel_python_sub_latest: false`):

```yaml
- package:
    name: python3
    state: present
```

**Package:** `python3`

**Provides:** [Python 3.6](https://www.python.org/downloads/release/python-360/) on RHEL 7 from standard repositories

**Binary location:** `/usr/bin/python3.6`

**SCL installation** (when `rhel_python_sub_latest: true`):

```yaml
- package:
    name: rh-python38
    state: present
```

**Package:** [rh-python38](https://access.redhat.com/documentation/en-us/red_hat_software_collections/3/html/3.8_release_notes/chap-rhscl#sect-RHSCL-Changes-Python)

**Provides:** [Python 3.8](https://www.python.org/downloads/release/python-380/) from Red Hat Software Collections

**Binary location:** `/opt/rh/rh-python38/root/bin/python3.8`

**Requires:** SCL repositories configured via `repo_scl` role

#### 3.2 RHEL 6 packages

**Standard installation:**

```yaml
- package:
    name: python36
    state: present
```

**Package:** `python36` or `rh-python36`

**Provides:** [Python 3.6](https://www.python.org/downloads/release/python-360/) on RHEL 6

**Possible binary locations:**
- `/opt/rh/rh-python36/root/usr/bin/python3.6` (SCL)
- `/usr/bin/python3.6` (standard repo)

**Version search order** (from `vars/el6.yml`):
```yaml
rhel_python_sub__set:
  - python3.6
  - python3.5
  - python2.7
```

### 4. Ansible module dependencies

**Definition:** Built-in and community Ansible modules used in tasks.

#### 4.1 Core modules used

| Module | Purpose | Documentation |
|--------|---------|--------------|
| [include_vars](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_vars_module.html) | Load OS-specific variables from `vars/el6.yml` or `vars/el7.yml` | Loads Python search paths and version preferences |
| [find](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html) | Search for Python binaries in specified paths | Discovers existing Python installations |
| [set_fact](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html) | Set `ansible_python_interpreter` fact | Configures which Python interpreter Ansible uses |
| [package](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html) | Install Python packages | Installs python3, python36, or rh-python38 |
| [include_role](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html) | Include repo_scl role | Conditionally includes SCL repository configuration |

**Requirements:**
- Ansible 2.11+ (specified in `meta/main.yml`)
- Standard Ansible core modules (included in base installation)

### 5. System-level dependencies

#### 5.1 Operating system requirements

**Supported platforms** (from `meta/main.yml`):

```yaml
platforms:
  - name: EL
    versions:
      - 6
      - 7
```

**Compatible distributions:**
- [Red Hat Enterprise Linux (RHEL)](https://en.wikipedia.org/wiki/Red_Hat_Enterprise_Linux) 6, 7
- [CentOS](https://en.wikipedia.org/wiki/CentOS) 6, 7
- [Oracle Linux](https://en.wikipedia.org/wiki/Oracle_Linux) 6, 7
- [Scientific Linux](https://en.wikipedia.org/wiki/Scientific_Linux) 6, 7

**Not compatible with:**
- RHEL 8+ (different Python packaging approach)
- Debian-based distributions
- SUSE-based distributions

#### 5.2 Ansible facts required

The role relies on [Ansible facts](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_vars_facts.html) gathered automatically:

| Fact | Purpose | Example Value |
|------|---------|---------------|
| `ansible_distribution_major_version` | Determine EL version | `"6"` or `"7"` |
| `ansible_python_interpreter` | Store discovered Python path | `/usr/bin/python3.6` |

**Requirement:** [fact gathering](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html) must be enabled (default behavior).

### 6. Repository dependencies

#### 6.1 Standard RHEL repositories

**Required repositories:**

For **RHEL 7**:
- `rhel-7-server-rpms` (base packages)
- `rhel-7-server-optional-rpms` (python3 package)

For **RHEL 6**:
- `rhel-6-server-rpms` (base packages)
- `rhel-6-server-optional-rpms` (python36 or rh-python36)

**Configuration:** Managed by subscription-manager or repository files in `/etc/yum.repos.d/`

#### 6.2 Software Collections (SCL) repositories

**When required:** RHEL 7 with `rhel_python_sub_latest: true`

**Repository:** `rhel-server-rhscl-7-rpms`

**Provides:** rh-python38 package

**Configured by:** `repo_scl` role (implicit dependency)

**Activation command:**
```bash
subscription-manager repos --enable rhel-server-rhscl-7-rpms
```

#### 6.3 Southbridge repositories

**Configured by:** `southbridge.aux.repo_southbridge` (explicit dependency)

**Purpose:** May provide additional Python packages or dependencies not in standard repos

**Management:** Through role's repository configuration files

### 7. Variable dependencies

#### 7.1 Required variables

The role defines these in `defaults/main.yml` and `vars/`:

```yaml
# defaults/main.yml
rhel_python_sub_latest: false
```

**Purpose:** Controls whether to install latest Python (3.8 on EL7) or standard version

**Type:** Boolean

**Default:** `false` (use standard repo versions)

#### 7.2 Internal variables (OS-specific)

**For EL7** (`vars/el7.yml`):
```yaml
rhel_python_sub__paths:
  - /usr/bin

rhel_python_sub__set:
  - python3.8
  - python3.7
  - python3.6
```

**For EL6** (`vars/el6.yml`):
```yaml
rhel_python_sub__paths:
  - /opt/rh/rh-python36/root/usr/bin
  - /usr/bin

rhel_python_sub__set:
  - python3.6
  - python3.5
  - python2.7
```

**Purpose:**
- `rhel_python_sub__paths`: Directories to search for Python binaries
- `rhel_python_sub__set`: Python versions to look for, in priority order

### 8. Dependency tree visualization

```
rhel_python_sub
├── Explicit Dependencies
│   └── southbridge.aux.repo_southbridge [always]
│       └── Configures Southbridge repositories
│
├── Implicit Role Dependencies
│   └── repo_scl [conditional: EL7 + latest]
│       └── Configures Software Collections repos
│
├── Package Dependencies
│   ├── RHEL 7 Standard: python3 → /usr/bin/python3.6
│   ├── RHEL 7 Latest: rh-python38 → /opt/rh/rh-python38/root/bin/python3.8
│   └── RHEL 6 Standard: python36 → /usr/bin/python3.6 or /opt/rh/rh-python36/root/usr/bin/python3.6
│
├── Repository Dependencies
│   ├── RHEL base repositories [always]
│   ├── RHEL optional repositories [always]
│   ├── SCL repositories [conditional: EL7 + latest]
│   └── Southbridge repositories [via repo_southbridge]
│
├── Ansible Module Dependencies
│   ├── include_vars (load OS-specific variables)
│   ├── find (search for Python binaries)
│   ├── set_fact (set ansible_python_interpreter)
│   ├── package (install Python packages)
│   └── include_role (include repo_scl conditionally)
│
└── System Dependencies
    ├── RHEL/CentOS 6 or 7
    ├── Ansible 2.11+
    └── Fact gathering enabled
```

### 9. Dependency analysis by scenario

#### Scenario 1: RHEL 7, standard Python

```yaml
rhel_python_sub_latest: false  # or omitted (default)
```

**Dependencies activated:**
1. ✓ `southbridge.aux.repo_southbridge` (explicit)
2. ✓ RHEL base and optional repositories
3. ✓ `python3` package installation
4. ✓ Ansible modules: include_vars, find, set_fact, package
5. ✗ `repo_scl` (not needed)
6. ✗ SCL repositories (not needed)

**Result:** Python 3.6 installed at `/usr/bin/python3.6`

#### Scenario 2: RHEL 7, latest Python

```yaml
rhel_python_sub_latest: true
```

**Dependencies activated:**
1. ✓ `southbridge.aux.repo_southbridge` (explicit)
2. ✓ `repo_scl` (implicit, conditional)
3. ✓ RHEL base, optional, and SCL repositories
4. ✓ `rh-python38` package installation
5. ✓ Ansible modules: include_vars, find, set_fact, package, include_role

**Result:** Python 3.8 installed at `/opt/rh/rh-python38/root/bin/python3.8`

#### Scenario 3: RHEL 6, any configuration

```yaml
# rhel_python_sub_latest has no effect on EL6
```

**Dependencies activated:**
1. ✓ `southbridge.aux.repo_southbridge` (explicit)
2. ✓ RHEL base and optional repositories (or SCL if available)
3. ✓ `python36` or `rh-python36` package installation
4. ✓ Ansible modules: include_vars, find, set_fact, package
5. ✗ `repo_scl` (not used on EL6)

**Result:** Python 3.6 installed (path varies by package source)

### 10. Potential hidden dependencies

#### 10.1 Network dependencies

- **Internet/Repository access:** Required to download packages from RHEL, SCL, or Southbridge repos
- **Proxy configuration:** May be required if accessing repos through corporate proxy
- **DNS resolution:** Needed to resolve repository URLs

#### 10.2 Subscription dependencies

For RHEL systems (not CentOS):
- **Active Red Hat subscription:** Required for accessing official repositories
- **Enabled repositories:** Must manually enable optional and SCL repos via subscription-manager
- **Entitlements:** SCL may require specific entitlements

#### 10.3 Permission dependencies

- **Root/sudo access:** Package installation requires elevated privileges
- **SELinux context:** May affect file access in `/opt/rh/` directories
- **Filesystem permissions:** Write access to `/usr/bin` or `/opt/rh/`

### Summary table

| Dependency Type | Name | Condition | Purpose |
|----------------|------|-----------|---------|
| **Explicit Role** | southbridge.aux.repo_southbridge | Always | Configure Southbridge repos |
| **Implicit Role** | repo_scl | EL7 + latest | Configure SCL repos |
| **Package** | python3 | EL7 standard | Python 3.6 from base repos |
| **Package** | rh-python38 | EL7 latest | Python 3.8 from SCL |
| **Package** | python36 | EL6 | Python 3.6 for RHEL 6 |
| **Module** | include_vars | Always | Load OS-specific variables |
| **Module** | find | Always | Search for Python binaries |
| **Module** | set_fact | Always | Set Python interpreter fact |
| **Module** | package | Conditional | Install Python packages |
| **Module** | include_role | EL7 + latest | Include repo_scl |
| **Repository** | RHEL base/optional | Always | Standard packages |
| **Repository** | SCL repos | EL7 + latest | Software Collections |
| **System** | RHEL/CentOS 6/7 | Always | Operating system |
| **System** | Ansible 2.11+ | Always | Automation platform |
| **System** | Fact gathering | Always | System information |

### Best practices for managing these dependencies

1. **Verify repository access** before running the role:
   ```bash
   yum repolist  # Check enabled repositories
   ```

2. **Enable required repositories** on RHEL:
   ```bash
   subscription-manager repos --enable rhel-7-server-optional-rpms
   subscription-manager repos --enable rhel-server-rhscl-7-rpms  # For latest
   ```

3. **Install dependent roles** from Ansible Galaxy:
   ```bash
   ansible-galaxy collection install southbridge.aux
   ```

4. **Test in isolated environment** first to identify missing dependencies

5. **Document custom variables** in your playbook:
   ```yaml
   - hosts: servers
     roles:
       - role: southbridge.aux.rhel_python_sub
         vars:
           rhel_python_sub_latest: true  # Explicit configuration
   ```

6. **Check installed Python** after role execution:
   ```bash
   ansible servers -m setup -a 'filter=ansible_python_interpreter'
   ```

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
