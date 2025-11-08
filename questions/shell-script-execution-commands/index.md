# Question

What is the difference between the commands: `t.sh`, `. t.sh`, `/t.sh`, `./t.sh`?

[Русская версия](index.ru.md) | [All Questions](../../README.md)

---

## Short answer

`t.sh` searches PATH directories; `. t.sh` sources the script in the current shell; `/t.sh` executes from filesystem root; `./t.sh` executes from the current directory.

---

## Detailed explanation

These four [commands](https://en.wikipedia.org/wiki/Command_(computing)) represent different ways to [execute](https://en.wikipedia.org/wiki/Execution_(computing)) a [shell script](https://en.wikipedia.org/wiki/Shell_script) in [Unix-like](https://en.wikipedia.org/wiki/Unix-like) [operating systems](https://en.wikipedia.org/wiki/Operating_system).

### 1. `t.sh` - PATH search execution

When you type `t.sh` without any [path](https://en.wikipedia.org/wiki/Path_(computing)) prefix, the [shell](https://en.wikipedia.org/wiki/Unix_shell) searches for this [file](https://en.wikipedia.org/wiki/Computer_file) in all [directories](https://en.wikipedia.org/wiki/Directory_(computing)) listed in the [PATH environment variable](https://en.wikipedia.org/wiki/PATH_(variable)). The script is executed in a new [child process](https://en.wikipedia.org/wiki/Child_process) (a [subshell](https://en.wiktionary.org/wiki/subshell)).

**Key characteristics:**
- Searches directories in [PATH](https://en.wikipedia.org/wiki/PATH_(variable))
- Creates a new [process](https://en.wikipedia.org/wiki/Process_(computing))
- [Variables](https://en.wikipedia.org/wiki/Variable_(computer_science)) and [environment](https://en.wikipedia.org/wiki/Environment_variable) changes don't affect the parent shell
- Requires the script to be in a PATH directory

### 2. `. t.sh` - Source command (dot command)

The [dot command](https://en.wikipedia.org/wiki/Dot_(command)) (`.`) is also known as the [`source` command](https://en.wiktionary.org/wiki/source#Verb) in [Bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)). It [executes](https://en.wikipedia.org/wiki/Execution_(computing)) the script in the **current shell context** rather than in a subshell.

**Key characteristics:**
- Runs in the current [shell session](https://en.wiktionary.org/wiki/shell#Noun)
- No new process is created
- Variables, [functions](https://en.wikipedia.org/wiki/Subroutine), and directory changes persist after execution
- Commonly used for [configuration files](https://en.wikipedia.org/wiki/Configuration_file) and environment setup
- The script doesn't need [execute permission](https://en.wikipedia.org/wiki/File-system_permissions)

### 3. `/t.sh` - Absolute path from root

This uses an [absolute path](https://en.wikipedia.org/wiki/Path_(computing)#Absolute_and_relative_paths) starting from the [root directory](https://en.wikipedia.org/wiki/Root_directory) (`/`) of the [filesystem](https://en.wikipedia.org/wiki/File_system).

**Key characteristics:**
- Executes the file located at `/t.sh` (in the root directory)
- Creates a new process (subshell)
- Requires the script to have [executable permissions](https://en.wikipedia.org/wiki/File-system_permissions) (e.g., set with [`chmod +x`](https://en.wikipedia.org/wiki/Chmod))
- Path is independent of current [working directory](https://en.wikipedia.org/wiki/Working_directory)
- Rarely used in practice, as scripts are typically not stored in the root directory

### 4. `./t.sh` - Relative path from current directory

This uses a [relative path](https://en.wikipedia.org/wiki/Path_(computing)#Absolute_and_relative_paths) where `.` represents the [current directory](https://en.wikipedia.org/wiki/Working_directory).

**Key characteristics:**
- Executes the script in the current working directory
- Creates a new process (subshell)
- Requires executable permissions
- Most common method for running scripts not in PATH
- The `./` prefix explicitly tells the shell to look in the current directory

### Summary comparison table

| Command | Path type | New process | Needs exec permission | Changes persist | Common use |
|---------|-----------|-------------|----------------------|-----------------|------------|
| `t.sh` | PATH search | Yes | Yes | No | System commands |
| `. t.sh` | Current/PATH | No | No | Yes | Config files |
| `/t.sh` | Absolute | Yes | Yes | No | Root directory |
| `./t.sh` | Relative | Yes | Yes | No | Local scripts |

### Security note

For [security](https://en.wikipedia.org/wiki/Computer_security) reasons, the current directory (`.`) is typically **not** included in the PATH variable on Unix-like systems. This prevents accidental execution of [malicious scripts](https://en.wikipedia.org/wiki/Malware) placed in the current directory with names matching common commands.

---

[Русская версия](index.ru.md) | [All Questions](../../README.md)
