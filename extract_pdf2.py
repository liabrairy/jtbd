import sys
import traceback

try:
    import pdfplumber
    print("pdfplumber imported OK")
    
    with pdfplumber.open("WCAKC.pdf") as pdf:
        print(f"PDF opened OK, pages: {len(pdf.pages)}")
        all_text = []
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text:
                all_text.append(f"\n\n--- PAGE {i} ---\n\n{text}")
        
        full_text = "\n".join(all_text)
        
        with open("extracted_text.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
        
        print(f"Done! Extracted {len(full_text)} characters")
        print("File saved: extracted_text.txt")

except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)
