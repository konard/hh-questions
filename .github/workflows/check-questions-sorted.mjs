#!/usr/bin/env node
/**
 * Script to verify that questions in README files are sorted alphabetically by question text.
 *
 * This script checks that question links in README.md and README.ru.md are sorted
 * in alphabetical order by their question text in the respective language, as specified in CONTRIBUTING.md.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract question links from README content.
 *
 * @param {string} readmeContent - The content of the README file
 * @returns {Array<{questionText: string, directoryName: string, fullLine: string}>} Array of question objects
 */
function extractQuestionLinks(readmeContent) {
  const questions = [];
  // Pattern to match markdown links to questions
  // Matches: - [Question text](./questions/directory-name/index.md)
  const pattern = /^-\s+\[(.+?)\]\(\.\/questions\/([^/]+)\/index(?:\.ru)?\.md\)\s*$/;

  for (const line of readmeContent.split('\n')) {
    const match = line.trim().match(pattern);
    if (match) {
      questions.push({
        questionText: match[1],
        directoryName: match[2],
        fullLine: line
      });
    }
  }

  return questions;
}

/**
 * Check if questions are in alphabetical order by question text.
 *
 * @param {Array<{questionText: string, directoryName: string, fullLine: string}>} questions - Array of question objects
 * @param {string} filename - Name of the README file being checked
 * @returns {boolean} True if sorted correctly, false otherwise
 */
function checkAlphabeticalOrder(questions, filename) {
  if (questions.length === 0) {
    console.log(`Warning: No questions found in ${filename}`);
    return true;
  }

  const questionTexts = questions.map(q => q.questionText);
  const sortedTexts = [...questionTexts].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  if (JSON.stringify(questionTexts) === JSON.stringify(sortedTexts)) {
    console.log(`✓ ${filename}: Questions are sorted alphabetically (${questions.length} questions)`);
    return true;
  } else {
    console.log(`✗ ${filename}: Questions are NOT sorted alphabetically by question text`);
    console.log("\nExpected order:");
    for (const text of sortedTexts) {
      const truncated = text.length > 80 ? text.substring(0, 80) + '...' : text;
      console.log(`  - ${truncated}`);
    }
    console.log("\nActual order:");
    for (const text of questionTexts) {
      const truncated = text.length > 80 ? text.substring(0, 80) + '...' : text;
      console.log(`  - ${truncated}`);
    }

    // Find the first mismatch
    for (let i = 0; i < Math.min(questionTexts.length, sortedTexts.length); i++) {
      if (questionTexts[i] !== sortedTexts[i]) {
        console.log(`\nFirst mismatch at position ${i + 1}:`);
        const expectedTrunc = sortedTexts[i].length > 80 ? sortedTexts[i].substring(0, 80) + '...' : sortedTexts[i];
        const actualTrunc = questionTexts[i].length > 80 ? questionTexts[i].substring(0, 80) + '...' : questionTexts[i];
        console.log(`  Expected: ${expectedTrunc}`);
        console.log(`  Found: ${actualTrunc}`);
        break;
      }
    }

    return false;
  }
}

/**
 * Main function to check both README files.
 */
function main() {
  const scriptDir = join(__dirname, '..', '..');
  const readmeFiles = ['README.md', 'README.ru.md'];

  let allSorted = true;

  for (const readmeFile of readmeFiles) {
    const readmePath = join(scriptDir, readmeFile);

    let content;
    try {
      content = readFileSync(readmePath, 'utf-8');
    } catch (error) {
      console.log(`Error: ${readmeFile} not found at ${readmePath}`);
      allSorted = false;
      continue;
    }

    const questions = extractQuestionLinks(content);
    const isSorted = checkAlphabeticalOrder(questions, readmeFile);
    allSorted = allSorted && isSorted;
  }

  if (allSorted) {
    console.log("\n✓ All README files have questions sorted alphabetically by question text");
    process.exit(0);
  } else {
    console.log("\n✗ Some README files have unsorted questions");
    console.log("\nPlease sort the questions alphabetically by question text in the respective language.");
    console.log("See CONTRIBUTING.md for details.");
    process.exit(1);
  }
}

main();
