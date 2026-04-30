import sys
import traceback
import os

log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_log.txt")

with open(log_path, "w", encoding="utf-8") as log:
    try:
        log.write("Starting...\n")
        log.flush()
        
        import pdfplumber
        log.write("pdfplumber imported OK\n")
        log.flush()
        
        pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "WCAKC.pdf")
        log.write(f"Opening: {pdf_path}\n")
        log.flush()
        
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            log.write(f"PDF opened OK, pages: {num_pages}\n")
            log.flush()
            
            all_text = []
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if text:
                    all_text.append(f"\n\n--- PAGE {i} ---\n\n{text}")
                log.write(f"Page {i}/{num_pages} done\n")
                log.flush()
            
            full_text = "\n".join(all_text)
            
            out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extracted_text.txt")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(full_text)
            
            log.write(f"Done! Extracted {len(full_text)} characters\n")
            log.write(f"Saved to: {out_path}\n")
    
    except Exception as e:
        log.write(f"ERROR: {e}\n")
        log.write(traceback.format_exc())
