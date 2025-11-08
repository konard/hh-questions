# Question

Review the following bash script:

```bash
#!/bin/bash

file=$1

if [ -f $file ]
then
echo "File exists"
else
echo "File does not exist"
fi
```

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

The script has several critical issues: missing quotes around `$file` variable (breaks with spaces/special characters), inconsistent indentation, potential security vulnerabilities with file path handling, and lack of input validation.

---

## Detailed explanation

This [bash script](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) attempts to check if a [file](https://en.wikipedia.org/wiki/Computer_file) exists, but contains several issues that should be addressed in a [code review](https://en.wikipedia.org/wiki/Code_review).

### 1. Missing quotes around variable expansion

**Issue:** The variable `$file` is used without [quotes](https://www.gnu.org/software/bash/manual/html_node/Quoting.html) in the test condition.

```bash
if [ -f $file ]  # Incorrect
```

**Problem:** If the [filename](https://en.wikipedia.org/wiki/Filename) contains [spaces](https://en.wikipedia.org/wiki/Space_(punctuation)) or [special characters](https://en.wikipedia.org/wiki/Special_character), the script will fail or behave unexpectedly due to [word splitting](https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html).

**Example:**
```bash
# If file="my document.txt", the test becomes:
[ -f my document.txt ]  # Interpreted as multiple arguments
```

**Fix:**
```bash
if [ -f "$file" ]  # Correct - preserves spaces and special characters
```

### 2. No input validation

**Issue:** The script doesn't check if an [argument](https://en.wikipedia.org/wiki/Command-line_interface#Arguments) was provided.

**Problem:** If run without arguments, `$file` will be empty, and the test will check for an empty [string](https://en.wikipedia.org/wiki/String_(computer_science)), which may produce confusing results.

**Fix:**
```bash
if [ -z "$1" ]; then
    echo "Usage: $0 <filename>" >&2
    exit 1
fi
```

### 3. Inconsistent indentation

**Issue:** The `echo` statements inside the [if-else](https://en.wikipedia.org/wiki/Conditional_(computer_programming)) block are not indented.

**Impact:** While functionally correct, poor [code formatting](https://en.wikipedia.org/wiki/Programming_style) reduces [readability](https://en.wikipedia.org/wiki/Computer_programming#Readability_of_source_code) and maintainability.

**Fix:**
```bash
if [ -f "$file" ]; then
    echo "File exists"
else
    echo "File does not exist"
fi
```

### 4. Modern syntax recommendations

**Current:** Uses the older `[ ]` test syntax and multi-line `if-then` format.

**Better alternatives:**

Using `[[ ]]` (more robust):
```bash
if [[ -f "$file" ]]; then
    echo "File exists"
else
    echo "File does not exist"
fi
```

**Benefits of `[[ ]]`:**
- No [word splitting](https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html) or [glob expansion](https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html)
- Supports additional operators (`&&`, `||`, `=~`)
- More readable and consistent

### 5. Security considerations

**Issue:** No validation that `$file` is a safe [path](https://en.wikipedia.org/wiki/Path_(computing)).

**Potential risks:**
- [Path traversal](https://en.wikipedia.org/wiki/Directory_traversal_attack) attacks (e.g., `../../etc/passwd`)
- Accessing files outside intended directory
- [Symbolic link](https://en.wikipedia.org/wiki/Symbolic_link) following to sensitive locations

**Additional checks to consider:**
```bash
# Resolve to absolute path and validate
file=$(realpath -s "$1" 2>/dev/null) || {
    echo "Invalid file path" >&2
    exit 1
}
```

### 6. Error message destination

**Issue:** Error messages go to [standard output](https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)) instead of [standard error](https://en.wikipedia.org/wiki/Standard_streams#Standard_error_(stderr)).

**Fix:**
```bash
echo "File does not exist" >&2
```

### Improved version

Here's a corrected version addressing all the issues:

```bash
#!/bin/bash

# Validate input
if [ -z "$1" ]; then
    echo "Usage: $0 <filename>" >&2
    exit 1
fi

file="$1"

# Check if file exists
if [[ -f "$file" ]]; then
    echo "File exists"
else
    echo "File does not exist" >&2
    exit 1
fi
```

### Summary of issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing quotes around `$file` | High | Script breaks with spaces/special chars |
| No input validation | Medium | Confusing behavior without arguments |
| Inconsistent indentation | Low | Reduced readability |
| Old test syntax | Low | Less robust than modern alternatives |
| Security concerns | Medium | Potential unauthorized file access |
| Error output destination | Low | Improper error handling |

### Best practices for bash scripts

1. **Always quote variables** unless you specifically need word splitting
2. **Validate all inputs** before using them
3. **Use consistent indentation** (typically 2 or 4 spaces)
4. **Prefer `[[ ]]` over `[ ]`** in bash scripts
5. **Send errors to stderr** using `>&2`
6. **Use `set -euo pipefail`** for better error handling
7. **Add meaningful [exit codes](https://en.wikipedia.org/wiki/Exit_status)**

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
