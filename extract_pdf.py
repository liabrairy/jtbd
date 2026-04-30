import pdfplumber

output_file = "extracted_text.txt"

with pdfplumber.open("WCAKC.pdf") as pdf:
    with open(output_file, "w", encoding="utf-8") as f:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text:
                f.write(f"\n\n--- PAGE {i} ---\n\n")
                f.write(text)

print(f"Done! Total pages: {len(pdf.pages)}")
print(f"Text saved to {output_file}")
