import re
import os

# Read the full extracted text
with open("extracted_text.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"Total lines: {total_lines}")

# Chapter boundaries based on grep results (line numbers are 1-based)
# Format: (start_line_1based, filename, title)
chapters = [
    (232,  "00_foreword.md",        "Foreword"),
    (408,  "00_acknowledgments.md", "Acknowledgments"),
    (443,  "01_chapter.md",         "Chapter 1: Challenges, Hope, and Progress"),
    (909,  "02_chapter.md",         "Chapter 2: What is a Job to be Done (JTBD)?"),
    (1319, "03_chapter.md",         "Chapter 3: What Are the Principles of Customer Jobs?"),
    (1533, "04_chapter.md",         "Chapter 4: Case Study — Dan and Clarity"),
    (1979, "05_chapter.md",         "Chapter 5: Case Study — Anthony and Form Theatricals"),
    (2808, "06_chapter.md",         "Chapter 6: The Forces of Progress"),
    (3215, "07_chapter.md",         "Chapter 7: When You Define Competition Wrong"),
    (3949, "08_chapter.md",         "Chapter 8: Case Study — Omer and Transcendent Endeavors"),
    (4281, "09_chapter.md",         "Chapter 9: Case Study — Justin and Product People Club"),
    (4703, "10_chapter.md",         "Chapter 10: Case Study — Ash and Lean Stack"),
    (5029, "11_chapter.md",         "Chapter 11: The System of Progress"),
    (5507, "12_chapter.md",         "Chapter 12: Innovation and the System of Progress"),
    (6040, "13_chapter.md",         "Chapter 13: How Might We Describe a Job to be Done?"),
    (6226, "14_chapter.md",         "Chapter 14: Get Started Today"),
    (6452, "15_appendix.md",        "Appendix 15: Know the Two Different Interpretations of Jobs to be Done"),
    (7044, "16_appendix.md",        "Appendix 16: A Summary of Customer Jobs"),
    (7097, "17_appendix.md",        "Appendix 17: Summary of Putting Customer Jobs to Work"),
    (7208, "18_notes.md",           "Notes"),
]

# Create output directory
os.makedirs("chapters", exist_ok=True)

for i, (start_line, filename, title) in enumerate(chapters):
    # End line is start of next chapter (or end of file)
    end_line = chapters[i + 1][0] - 1 if i + 1 < len(chapters) else total_lines

    # Extract lines (convert 1-based to 0-based index)
    chapter_lines = lines[start_line - 1 : end_line]
    chapter_text = "".join(chapter_lines).strip()

    # Clean up excessive blank lines (more than 2 consecutive)
    chapter_text = re.sub(r'\n{4,}', '\n\n\n', chapter_text)

    out_path = os.path.join("chapters", filename)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n")
        f.write(chapter_text)

    print(f"Saved: {filename} ({len(chapter_text):,} chars, lines {start_line}-{end_line})")

print("\nDone! All chapters saved to ./chapters/")
