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
   - **IMPORTANT**: Keep questions sorted in **alphabetical order by the question text in that language** to reduce merge conflicts and make it easier for readers to find questions

5. **Ensure content equivalence**: Both language versions should contain equivalent comprehensive content

### Question List Sorting

**Questions in README files must be sorted alphabetically by their question text in the respective language.** This is critical to:
- Minimize merge conflicts when multiple contributors add new questions simultaneously
- Make it easier for readers to search and find questions in their native language

**Important: Use bullet points (`-`), not numbered lists (`1.`, `2.`, etc.) in README files.** Numbered lists always cause merge conflicts when multiple contributors add questions at different positions. Bullet points avoid this problem.

**Sorting rules:**
- `README.md` (English): Sort questions alphabetically by their English question text
- `README.ru.md` (Russian): Sort questions alphabetically by their Russian question text
- The same question may appear in different positions in English and Russian READMEs due to translation

Example of correct alphabetical order with bullet points (English):
```
- [A client complains about MySQL database performance issues...](...)
- [How would you block requests like "GET /?[a-z]{16} HTTP/1.1" in Nginx?](...)
- [Is the `iostat -x` command sufficient to assess the real disk load?](...)
- [Review the bash script](...)
- [What is the difference between the commands: "t.sh" ". t.sh" "/t.sh" "./t.sh"?](...)
```

When adding a new question, insert it in the correct alphabetical position based on the question text rather than appending to the end of the list.

### Working with Images

**Use a global images index** to allow reusing images across different questions and creating variations of questions that differ only by image number.

**Image organization:**
1. **Store all images** in the global `/images/` directory at the repository root
2. **Name images** using sequential numbers: `image-1.png`, `image-2.png`, `image-3.png`, etc.
3. **Reference images** from questions using relative paths: `../../images/image-N.png`

**Question naming with images:**
- When a question uses an image, append the image number to the directory name: `server-monitoring-analysis-1`, `server-monitoring-analysis-2`, etc.
- This allows creating multiple similar questions that differ only by the image/screenshot used
- Update the question text in README files to indicate which image is referenced: "...based on the screenshot (image-1)..."

**Example structure:**
```
/images/
  image-1.png
  image-2.png
/questions/
  server-monitoring-analysis-1/
    index.md          (references ../../images/image-1.png)
    index.ru.md       (references ../../images/image-1.png)
  server-monitoring-analysis-2/
    index.md          (references ../../images/image-2.png)
    index.ru.md       (references ../../images/image-2.png)
```

**Benefits of global images index:**
- Unique numbering across all images in the repository
- Easy to reference the same image from multiple questions if needed
- Clear versioning when creating question variations with different screenshots
- Organized central location for all visual assets

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
