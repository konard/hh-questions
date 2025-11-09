#!/usr/bin/env python3
"""
Script to verify that questions in README files are sorted alphabetically by directory name.

This script checks that question links in README.md and README.ru.md are sorted
in alphabetical order by their directory names, as specified in CONTRIBUTING.md.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def extract_question_links(readme_content: str) -> List[Tuple[str, str]]:
    """
    Extract question links from README content.

    Returns a list of tuples: (directory_name, full_line)
    """
    questions = []
    # Pattern to match markdown links to questions
    # Matches: - [Question text](./questions/directory-name/index.md)
    pattern = r'^-\s+\[.+?\]\(\./questions/([^/]+)/index(?:\.ru)?\.md\)\s*$'

    for line in readme_content.split('\n'):
        match = re.match(pattern, line.strip())
        if match:
            directory_name = match.group(1)
            questions.append((directory_name, line))

    return questions


def check_alphabetical_order(questions: List[Tuple[str, str]], filename: str) -> bool:
    """
    Check if questions are in alphabetical order by directory name.

    Returns True if sorted correctly, False otherwise.
    """
    if not questions:
        print(f"Warning: No questions found in {filename}")
        return True

    directory_names = [q[0] for q in questions]
    sorted_names = sorted(directory_names)

    if directory_names == sorted_names:
        print(f"✓ {filename}: Questions are sorted alphabetically ({len(questions)} questions)")
        return True
    else:
        print(f"✗ {filename}: Questions are NOT sorted alphabetically")
        print("\nExpected order:")
        for name in sorted_names:
            print(f"  - {name}")
        print("\nActual order:")
        for name in directory_names:
            print(f"  - {name}")

        # Find the first mismatch
        for i, (actual, expected) in enumerate(zip(directory_names, sorted_names)):
            if actual != expected:
                print(f"\nFirst mismatch at position {i + 1}:")
                print(f"  Expected: {expected}")
                print(f"  Found: {actual}")
                break

        return False


def main():
    """Main function to check both README files."""
    script_dir = Path(__file__).parent.parent.parent
    readme_files = ['README.md', 'README.ru.md']

    all_sorted = True

    for readme_file in readme_files:
        readme_path = script_dir / readme_file

        if not readme_path.exists():
            print(f"Error: {readme_file} not found at {readme_path}")
            all_sorted = False
            continue

        content = readme_path.read_text(encoding='utf-8')
        questions = extract_question_links(content)

        is_sorted = check_alphabetical_order(questions, readme_file)
        all_sorted = all_sorted and is_sorted

    if all_sorted:
        print("\n✓ All README files have questions sorted alphabetically")
        sys.exit(0)
    else:
        print("\n✗ Some README files have unsorted questions")
        print("\nPlease sort the questions alphabetically by directory name.")
        print("See CONTRIBUTING.md for details.")
        sys.exit(1)


if __name__ == '__main__':
    main()
