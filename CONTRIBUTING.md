# Contributing Guidelines

[Русская версия](CONTRIBUTING.ru.md)

Thank you for your interest in contributing to this project! This repository contains questions and answers from hh.ru (HeadHunter), a Russian job search platform.

## How to Contribute

### Adding a New Question

1. **Create a new directory** under `questions/` with a descriptive name in English using kebab-case (e.g., `mysql-performance-troubleshooting`)

2. **Create two files** in the directory:
   - `index.md` - English version
   - `index.ru.md` - Russian version

3. **Follow the established structure**:
   - Add navigation links at the top (link to the other language version and back to README)
   - Include a clear question statement
   - Provide a short answer (concise technical response)
   - Add a detailed explanation with:
     - Wikipedia or official documentation links for technical terms
     - Code examples and practical commands
     - Comparison tables and checklists where applicable
     - Real-world scenarios and troubleshooting steps
   - Include monitoring and alerting recommendations where relevant

4. **Update both README files**:
   - Add the new question to `README.md` (English)
   - Add the new question to `README.ru.md` (Russian)
   - **IMPORTANT**: Keep questions sorted in **alphabetical order by directory name** to reduce merge conflicts

5. **Ensure content equivalence**: Both language versions should contain equivalent comprehensive content

### Question List Sorting

**Questions in README files must be sorted alphabetically by their directory names.** This is critical to minimize merge conflicts when multiple contributors add new questions simultaneously.

**Important: Use bullet points (`-`), not numbered lists (`1.`, `2.`, etc.) in README files.** Numbered lists always cause merge conflicts when multiple contributors add questions at different positions. Bullet points avoid this problem.

Example of correct alphabetical order with bullet points:
```
- bash-script-review
- disk-space-inodes-issue
- iostat-disk-load-assessment
- mysql-performance-troubleshooting
- shell-script-execution-commands
```

When adding a new question, insert it in the correct alphabetical position rather than appending to the end of the list.

### Style Guidelines

- Use clear, professional language
- Provide practical examples with actual commands
- Include references to authoritative sources (Wikipedia, official documentation)
- Keep formatting consistent with existing questions
- Use proper markdown syntax
- Add both Russian and English versions

### Pull Request Process

1. Fork the repository
2. Create a feature branch for your question
3. Make your changes following the guidelines above
4. Ensure both language versions are complete and equivalent
5. Verify that questions are sorted alphabetically in README files
6. Create a pull request with a clear description of what you're adding
7. Reference the related issue (if applicable) using "Fixes #issue-number"

### Commit Messages

- Write clear, descriptive commit messages
- Use the imperative mood ("Add question about..." not "Added question about...")
- Keep commits focused on a single logical change

## Questions or Issues?

If you have questions about contributing or notice any issues, please open an issue on GitHub.

---

🤖 This contributing guide follows best practices for collaborative documentation projects.
