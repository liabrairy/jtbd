import fitz  # pymupdf
import os
import traceback

log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_log.txt")
pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "WCAKC.pdf")
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extracted_text.txt")

with open(log_path, "w", encoding="utf-8") as log:
    try:
        log.write("Starting with pymupdf...\n"); log.flush()
        
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        log.write(f"PDF opened OK, pages: {num_pages}\n"); log.flush()
        
        all_text = []
        for i in range(num_pages):
            page = doc[i]
            text = page.get_text()
            if text.strip():
                all_text.append(f"\n\n--- PAGE {i+1} ---\n\n{text}")
            log.write(f"Page {i+1}/{num_pages} done\n"); log.flush()
        
        doc.close()
        
        full_text = "\n".join(all_text)
        
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(full_text)
        
        log.write(f"Done! Extracted {len(full_text)} characters\n")
        log.write(f"Saved to: {out_path}\n")
    
    except Exception as e:
        log.write(f"ERROR: {e}\n")
        log.write(traceback.format_exc())
