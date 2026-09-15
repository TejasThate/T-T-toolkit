import pdfplumber
import logging
import io

logger = logging.getLogger(__name__)

def parse_cdsl_cas(pdf_bytes: bytes, password: str) -> list[dict]:
    """
    Parses a CDSL/NSDL Consolidated Account Statement (CAS) PDF.
    Expects the PDF bytes and the uppercase PAN as the password.
    Returns a list of holdings: [{"symbol": str, "quantity": float, "avg_price": float}]
    """
    holdings = []
    
    try:
        # Open PDF with password
        with pdfplumber.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                        
                    # Basic heuristic: we look for tables that have "ISIN" or "Security" in the header
                    headers = [str(c).lower().strip() for c in table[0] if c]
                    header_str = " ".join(headers)
                    
                    # CDSL/NSDL CAS tables usually have "isin", "security", "balance", "price", "value"
                    if "isin" in header_str or "security" in header_str or "company" in header_str:
                        # Find column indices
                        name_idx = -1
                        balance_idx = -1
                        price_idx = -1
                        
                        for i, h in enumerate(headers):
                            if "security" in h or "company" in h or "name" in h:
                                name_idx = i
                            elif "balance" in h or "qty" in h or "quantity" in h:
                                balance_idx = i
                            elif "price" in h or "rate" in h:
                                price_idx = i
                                
                        if name_idx == -1 or balance_idx == -1:
                            continue # Not a valid holdings table
                            
                        # Parse rows
                        for row in table[1:]:
                            if not row or len(row) <= max(name_idx, balance_idx):
                                continue
                                
                            name_val = str(row[name_idx]).strip() if row[name_idx] else ""
                            balance_val = str(row[balance_idx]).replace(',', '').strip() if row[balance_idx] else "0"
                            price_val = str(row[price_idx]).replace(',', '').strip() if price_idx != -1 and row[price_idx] else "0"
                            
                            # Skip headers or empty rows
                            if not name_val or name_val.lower() == "total" or "security" in name_val.lower():
                                continue
                                
                            try:
                                qty = float(balance_val)
                                if qty <= 0:
                                    continue
                                    
                                avg_price = float(price_val) if price_val else 0.0
                                
                                # Basic symbol extraction (just take the first word or two of the company name for now)
                                # In a production app, we'd map ISIN to Yahoo Finance symbols.
                                symbol_guess = name_val.split()[0].upper()
                                # Clean up non-alpha
                                symbol_guess = ''.join(e for e in symbol_guess if e.isalnum())
                                
                                holdings.append({
                                    "symbol": symbol_guess,
                                    "quantity": qty,
                                    "avg_price": avg_price
                                })
                            except ValueError:
                                # Not a number, skip this row
                                continue
                                
    except Exception as e:
        logger.error(f"Error parsing CAS PDF: {e}")
        raise ValueError(f"Failed to parse PDF. Incorrect password or invalid format. Details: {e}")
        
    return holdings
